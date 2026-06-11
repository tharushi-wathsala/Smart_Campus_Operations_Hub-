/**
 * Contribution of Member 4: Real-time Security & WebSocket Authorization.
 * Usage: This interceptor secures the WebSocket handshake. It validates the 
 * JWT during the initial CONNECT frame, ensuring that only authenticated users 
 * can establish a persistent real-time connection.
 */
package lk.sliit.it3030.smartcampus.config;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;
import java.security.Principal;

/**
 * Interceptor for WebSocket (STOMP) messages.
 * This class intercepts the CONNECT frame of a STOMP connection to validate the user's
 * Firebase ID token before allowing the connection to be established.
 */
@Component
public class JwtChannelInterceptor implements ChannelInterceptor {

    /**
     * Intercepts messages before they are sent to the channel.
     * Specifically handles the CONNECT command to perform authentication.
     */
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class); // Get the STOMP header accessor

        // Check if the command is a CONNECT request
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = accessor.getFirstNativeHeader("Authorization"); // Attempt to get the Authorization header
            if (token == null) {
                token = accessor.getFirstNativeHeader("authorization"); // Fallback for case-insensitive header
            }
            
            // Validate the presence and format of the Bearer token
            if (token != null && token.startsWith("Bearer ")) {
                token = token.substring(7); // Remove the "Bearer " prefix
                try {
                    // Verify the Firebase ID token using the Admin SDK
                    FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(token);
                    String userId = decodedToken.getUid(); // Extract the unique Firebase user ID
                    
                    // Create an authentication object for the user
                    UsernamePasswordAuthenticationToken auth = 
                        new UsernamePasswordAuthenticationToken(userId, null, null);
                    
                    accessor.setUser(auth); // Set the user principal in the STOMP header accessor
                    
                    // Store the principle in the session attributes for persistence across frames
                    if (accessor.getSessionAttributes() != null) {
                        accessor.getSessionAttributes().put("USER_PRINCIPAL", auth);
                    }
                    
                } catch (Exception e) {
                    // Log authentication failures and reject the connection
                    if (e.getMessage().contains("expired")) {
                        System.err.println("[WebSocket AUTH] Token Expired for connection attempt.");
                    } else {
                        System.err.println("[WebSocket AUTH] FAILED: " + e.getMessage());
                    }
                    throw new IllegalArgumentException("Authentication required for WebSocket connection.");
                }
            } else {
                // Reject connections that lack an Authorization header
                System.err.println("[WebSocket] Connection attempt WITHOUT Authorization header");
                throw new IllegalArgumentException("No Authorization header found for WebSocket");
            }
        } else if (accessor != null && accessor.getUser() == null) {
            // Restore the user principal from session attributes for non-CONNECT frames if it's missing
            if (accessor.getSessionAttributes() != null && accessor.getSessionAttributes().containsKey("USER_PRINCIPAL")) {
                Principal auth = (Principal) accessor.getSessionAttributes().get("USER_PRINCIPAL");
                accessor.setUser(auth);
            }
        }

        return message; // Return the message (potentially with updated user metadata)
    }
}



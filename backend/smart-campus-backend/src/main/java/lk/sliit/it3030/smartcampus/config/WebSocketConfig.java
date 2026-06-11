/**
 * Contribution of Member 4: Real-time Messaging Infrastructure.
 * Usage: This configuration enables the STOMP message broker. It defines the 
 * "/ws" connection endpoint and establishes the topic-based routing prefixes 
 * for targeted and broadcast notifications.
 */
package lk.sliit.it3030.smartcampus.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configuration class for WebSocket messaging.
 * This class enables STOMP messaging, configures the message broker for internal routing,
 * and sets up security interceptors for WebSocket connections.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtChannelInterceptor jwtChannelInterceptor; // Custom interceptor for JWT validation on WebSocket connections

    /**
     * Constructor injection for the JWT channel interceptor.
     */
    public WebSocketConfig(JwtChannelInterceptor jwtChannelInterceptor) {
        this.jwtChannelInterceptor = jwtChannelInterceptor;
    }

    /**
     * Configures the message broker to route messages between clients and the server.
     */
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue"); // Enable a simple broker for broadcasting (/topic) and point-to-point (/queue) messaging
        config.setApplicationDestinationPrefixes("/app"); // Prefix for messages bound for methods annotated with @MessageMapping
        config.setUserDestinationPrefix("/user"); // Prefix for user-specific (private) messaging
    }

    /**
     * Registers the STOMP endpoints that clients will use to connect to the WebSocket server.
     */
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws") // Main WebSocket handshake endpoint
                .setAllowedOriginPatterns("*") // Allow connections from any origin (configured for development)
                .withSockJS(); // Enable SockJS fallback for browsers that don't support WebSockets
                
        // Fallback endpoint without SockJS
        registry.addEndpoint("/ws") // Direct WebSocket endpoint
                .setAllowedOriginPatterns("*"); // Permit cross-origin connections
    }

    /**
     * Configures the inbound channel to intercept messages before they reach the message broker.
     */
    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(jwtChannelInterceptor); // Apply the JWT interceptor to validate tokens during the CONNECT phase
    }
}


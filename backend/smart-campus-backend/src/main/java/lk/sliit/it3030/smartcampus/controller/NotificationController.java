/**
 * Contribution of Member 4: Real-time Notification Gateways.
 * Usage: This controller provides the RESTful interface for the notification system. 
 * It manages individual alert fetching, mark-as-read status toggles, and provides 
 * the administrative "Broadcast" endpoint for system-wide announcements.
 */
package lk.sliit.it3030.smartcampus.controller;

import lk.sliit.it3030.smartcampus.model.Notification;
import lk.sliit.it3030.smartcampus.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.google.firebase.auth.ExportedUserRecord;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.ListUsersPage;
import lk.sliit.it3030.smartcampus.model.AuditLog;
import lk.sliit.it3030.smartcampus.repository.AuditLogRepository;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationService notificationService;
    private final AuditLogRepository auditLogRepository;

    public NotificationController(NotificationService notificationService, AuditLogRepository auditLogRepository) {
        this.notificationService = notificationService;
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getUserNotifications(Authentication authentication) {
        try {
            String userId = authentication.getName();
            List<Notification> notifications = notificationService.getNotificationsForUser(userId);
            return ResponseEntity.ok(notifications);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    private static final java.util.concurrent.ConcurrentHashMap<String, Long> broadcastHistory = new java.util.concurrent.ConcurrentHashMap<>();

    @PostMapping("/broadcast")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> broadcastSystemNotification(@RequestBody Map<String, String> request, Authentication auth) {
        try {
            String message = request.get("message");
            String targetRole = request.getOrDefault("role", "ALL").trim().toUpperCase();
            String adminId = auth.getName();
            
            // 1. Simple Idempotency Guard (5-second window for same message from same admin)
            String broadcastKey = adminId + ":" + targetRole + ":" + message.hashCode();
            long now = System.currentTimeMillis();
            if (broadcastHistory.containsKey(broadcastKey) && (now - broadcastHistory.get(broadcastKey) < 5000)) {
                System.out.println("Ignoring duplicate broadcast request from " + adminId);
                return ResponseEntity.ok("Broadcast already processed.");
            }
            broadcastHistory.put(broadcastKey, now);

            System.out.println("Processing optimized broadcast: target=" + targetRole + ", from=" + adminId);
            
            ListUsersPage page = FirebaseAuth.getInstance().listUsers(null);
            java.util.List<String> matchUids = new java.util.ArrayList<>();
            
            for (ExportedUserRecord user : page.iterateAll()) {
                String userRole = "USER";
                Map<String, Object> claims = user.getCustomClaims();
                if (claims != null && claims.get("role") != null) {
                    userRole = (String) claims.get("role");
                }
                
                if (targetRole.equals("ALL") || targetRole.equals(userRole.toUpperCase())) {
                    matchUids.add(user.getUid());
                }
            }

            String resourceId = request.get("resourceId");
            String type = request.getOrDefault("type", "BROADCAST");

            // 2. Perform Topic-based Broadcast + Background Persistence
            notificationService.broadcastToRole(message, targetRole, matchUids, resourceId, type);

            String performedBy = auth.getName();
            try {
                String email = FirebaseAuth.getInstance().getUser(performedBy).getEmail();
                if (email != null) performedBy = email;
            } catch (Exception ignored) {}
            
            auditLogRepository.save(AuditLog.builder()
                        .action("BROADCAST_SENT")
                        .performedBy(performedBy)
                        .targetUser(targetRole)
                        .details(message)
                        .timestamp(new java.util.Date())
                        .build());
                        
            return ResponseEntity.status(HttpStatus.CREATED).body("Broadcast dispatched to " + matchUids.size() + " users.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("Failed to send broadcast: " + e.getMessage());
        }
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markNotificationRead(@PathVariable String id, Authentication authentication) {
        try {
            String userId = authentication.getName();
            notificationService.markAsRead(id, userId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable String id, Authentication authentication) {
        try {
            String userId = authentication.getName();
            notificationService.deleteNotification(id, userId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllNotificationsRead(Authentication authentication) {
        try {
            String userId = authentication.getName();
            notificationService.markAllAsRead(userId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

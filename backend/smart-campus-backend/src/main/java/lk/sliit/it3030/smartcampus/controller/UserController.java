/**
 * Contribution of Member 4: Identity & RBAC Management.
 * Usage: This controller facilitates administrative user management. It provides 
 * endpoints to list all registered users, toggle account suspension status, 
 * and perform Custom Claim injection for role-based access control assignments.
 */

package lk.sliit.it3030.smartcampus.controller;

import com.google.firebase.auth.ExportedUserRecord;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.ListUsersPage;
import lk.sliit.it3030.smartcampus.dto.UserRoleUpdateRequest;
import lk.sliit.it3030.smartcampus.service.NotificationService;
import lk.sliit.it3030.smartcampus.model.AuditLog;
import lk.sliit.it3030.smartcampus.repository.AuditLogRepository;
import com.google.firebase.auth.UserRecord;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final NotificationService notificationService;
    private final AuditLogRepository auditLogRepository;

    public UserController(NotificationService notificationService, AuditLogRepository auditLogRepository) {
        this.notificationService = notificationService;
        this.auditLogRepository = auditLogRepository;
    }

    /**
     * Retrieves all registered users from Firebase Authentication.
     * This endpoint returns a list of users with their basic profile information 
     * and assigned roles extracted from Custom Claims.
     * 
     * @return A list of map objects containing user details (uid, email, displayName, disabled, role).
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getAllUsers() {
        try {
            ListUsersPage page = FirebaseAuth.getInstance().listUsers(null);
            List<Map<String, Object>> response = new ArrayList<>();

            for (ExportedUserRecord user : page.iterateAll()) {
                Map<String, Object> userData = new HashMap<>();
                userData.put("uid", user.getUid());
                userData.put("email", user.getEmail());
                userData.put("displayName", user.getDisplayName());
                userData.put("disabled", user.isDisabled());

                Map<String, Object> customClaims = user.getCustomClaims();
                String role = "USER";
                if (customClaims != null && customClaims.containsKey("role")) {
                    role = (String) customClaims.get("role");
                }
                userData.put("role", role);

                response.add(userData);
            }

            return ResponseEntity.ok(response);

        } catch (FirebaseAuthException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Updates the role of a specific user.
     * This method injects a Custom Claim into the user's Firebase account, 
     * triggers a real-time notification to the user, and logs the action for auditing.
     * 
     * @param userId  The unique UID of the user to update.
     * @param request The request body containing the new role.
     * @param auth    The authentication object of the administrator performing the action.
     * @return A success message confirming the role update.
     */
    @PutMapping("/{userId}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> updateUserRole(@PathVariable String userId,
            @Valid @RequestBody UserRoleUpdateRequest request, Authentication auth) {
        try {
            Map<String, Object> claims = new HashMap<>();
            String newRole = request.getRole().toUpperCase();
            claims.put("role", newRole);
            FirebaseAuth.getInstance().setCustomUserClaims(userId, claims);

            try {
                String msg = "A system administrator has updated your account role to " + newRole + ". Welcome!";
                notificationService.createNotification(userId, msg, "ROLE_UPDATE", null);

                String performedBy = auth.getName();
                try {
                    String email = FirebaseAuth.getInstance().getUser(performedBy).getEmail();
                    if (email != null)
                        performedBy = email;
                } catch (Exception ignored) {
                }

                auditLogRepository.save(AuditLog.builder()
                        .action("ROLE_CHANGED_TO_" + newRole)
                        .performedBy(performedBy)
                        .targetUser(userId)
                        .timestamp(new java.util.Date())
                        .build());
            } catch (Exception e) {
                System.err.println("Failed to perform secondary tasks: " + e.getMessage());
            }

            Map<String, String> response = new HashMap<>();
            response.put("message", "Successfully updated role for user " + userId + " to " + newRole);
            return ResponseEntity.ok(response);

        } catch (FirebaseAuthException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Toggles the account status (Enabled/Disabled) for a user.
     * Disabling an account prevents the user from logging in via Firebase.
     * The action is logged in the system audit trail.
     * 
     * @param userId  The unique UID of the user to update.
     * @param request The request body containing the 'disabled' boolean status.
     * @param auth    The authentication object of the administrator performing the action.
     * @return A success message confirming the status change.
     */
    @PutMapping("/{userId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> updateUserStatus(@PathVariable String userId,
            @RequestBody Map<String, Boolean> request, Authentication auth) {
        try {
            boolean disabled = request.getOrDefault("disabled", false);
            UserRecord.UpdateRequest updateRequest = new UserRecord.UpdateRequest(userId)
                    .setDisabled(disabled);
            FirebaseAuth.getInstance().updateUser(updateRequest);

            try {
                String performedBy = auth.getName();
                try {
                    String email = FirebaseAuth.getInstance().getUser(performedBy).getEmail();
                    if (email != null)
                        performedBy = email;
                } catch (Exception ignored) {
                }

                auditLogRepository.save(AuditLog.builder()
                        .action(disabled ? "ACCOUNT_SUSPENDED" : "ACCOUNT_ACTIVATED")
                        .performedBy(performedBy)
                        .targetUser(userId)
                        .timestamp(new java.util.Date())
                        .build());
            } catch (Exception e) {
                System.err.println("Failed to save audit log: " + e.getMessage());
            }

            Map<String, String> response = new HashMap<>();
            response.put("message", "Successfully " + (disabled ? "suspended" : "activated") + " user account.");
            return ResponseEntity.ok(response);

        } catch (FirebaseAuthException e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

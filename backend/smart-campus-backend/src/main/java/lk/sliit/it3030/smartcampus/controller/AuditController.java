/**
 * Contribution of Member 4: Administrative Accountability & Auditing.
 * Usage: This controller provides the data source for the system's Audit Logs. 
 * It allows administrators to review critical actions (Role changes, broadcasts, suspensions) 
 * to ensure security compliance and forensic traceability.
 */
package lk.sliit.it3030.smartcampus.controller;

import lk.sliit.it3030.smartcampus.model.AuditLog;
import lk.sliit.it3030.smartcampus.repository.AuditLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/audit-logs")
@CrossOrigin(origins = "*")
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    public AuditController(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<AuditLog>> getAuditLogs() {
        try {
            return ResponseEntity.ok(auditLogRepository.getRecentLogs());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

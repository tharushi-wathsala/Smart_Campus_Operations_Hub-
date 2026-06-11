package lk.sliit.it3030.smartcampus.controller;

import jakarta.validation.Valid;
import lk.sliit.it3030.smartcampus.dto.AssignTechnicianRequest;
import lk.sliit.it3030.smartcampus.dto.CreateMaintenanceTicketRequest;
import lk.sliit.it3030.smartcampus.dto.UpdateTicketStatusRequest;
import lk.sliit.it3030.smartcampus.model.MaintenanceTicket;
import lk.sliit.it3030.smartcampus.service.MaintenanceTicketService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@RestController
@RequestMapping("/api/v1/tickets")
@CrossOrigin(origins = "http://localhost:5173")
public class MaintenanceTicketController {

    private final MaintenanceTicketService maintenanceTicketService;

    public MaintenanceTicketController(MaintenanceTicketService maintenanceTicketService) {
        this.maintenanceTicketService = maintenanceTicketService;
    }

    @PostMapping
    public ResponseEntity<?> createTicket(@Valid @RequestBody CreateMaintenanceTicketRequest request,
                                          Authentication authentication) {
        try {
            String userId = authentication.getName();
            MaintenanceTicket createdTicket = maintenanceTicketService.createTicket(userId, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdTicket);
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> response = new HashMap<>();
            response.put("message", "Failed to create incident report: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/my")
    public ResponseEntity<List<MaintenanceTicket>> getMyTickets(Authentication authentication) {
        try {
            String userId = authentication.getName();
            return ResponseEntity.ok(maintenanceTicketService.getMyTickets(userId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PatchMapping("/my/{ticketId}")
    public ResponseEntity<?> updateMyTicket(@PathVariable String ticketId,
                                            @Valid @RequestBody CreateMaintenanceTicketRequest request,
                                            Authentication authentication) {
        try {
            String userId = authentication.getName();
            MaintenanceTicket updatedTicket = maintenanceTicketService.updateMyTicket(userId, ticketId, request);
            return ResponseEntity.ok(updatedTicket);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, String> response = new HashMap<>();
            response.put("message", "Failed to update incident report: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/my/{ticketId}")
    public ResponseEntity<?> deleteMyTicket(@PathVariable String ticketId,
                                            Authentication authentication) {
        try {
            String userId = authentication.getName();
            maintenanceTicketService.deleteMyTicket(userId, ticketId);
            return ResponseEntity.noContent().build();
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<MaintenanceTicket>> getAllTicketsForAdmin() {
        try {
            return ResponseEntity.ok(maintenanceTicketService.getAllTicketsForAdmin());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PatchMapping("/{ticketId}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> assignTechnician(@PathVariable String ticketId,
                                              @Valid @RequestBody AssignTechnicianRequest request) {
        try {
            MaintenanceTicket updatedTicket = maintenanceTicketService.assignTechnician(
                    ticketId,
                    request.getTechnicianId(),
                    request.getTechnicianEmail()
            );
            return ResponseEntity.ok(updatedTicket);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PatchMapping("/{ticketId}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateTicketStatus(@PathVariable String ticketId,
                                                @Valid @RequestBody UpdateTicketStatusRequest request) {
        try {
            MaintenanceTicket updatedTicket = maintenanceTicketService.updateTicketStatusByAdmin(
                    ticketId,
                    request.getStatus(),
                    request.getReason()
            );
            return ResponseEntity.ok(updatedTicket);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/technician/assigned")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<List<MaintenanceTicket>> getAssignedTicketsForTechnician(Authentication authentication) {
        try {
            String technicianId = authentication.getName();
            return ResponseEntity.ok(maintenanceTicketService.getAssignedTicketsForTechnician(technicianId));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping("/{ticketId}/comments")
    public ResponseEntity<?> addComment(@PathVariable String ticketId,
                                        @Valid @RequestBody lk.sliit.it3030.smartcampus.dto.CommentRequest request,
                                        Authentication authentication) {
        try {
            String userId = authentication.getName();
            String role = authentication.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
            MaintenanceTicket updatedTicket = maintenanceTicketService.addTicketComment(
                    ticketId,
                    userId,
                    role,
                    request
            );
            return ResponseEntity.ok(updatedTicket);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PatchMapping("/{ticketId}/comments/{commentIndex}")
    public ResponseEntity<?> updateComment(@PathVariable String ticketId,
                                           @PathVariable int commentIndex,
                                           @Valid @RequestBody lk.sliit.it3030.smartcampus.dto.CommentRequest request,
                                           Authentication authentication) {
        try {
            String userId = authentication.getName();
            MaintenanceTicket updatedTicket = maintenanceTicketService.updateTicketComment(
                    ticketId,
                    userId,
                    commentIndex,
                    request
            );
            return ResponseEntity.ok(updatedTicket);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @DeleteMapping("/{ticketId}/comments/{commentIndex}")
    public ResponseEntity<?> deleteComment(@PathVariable String ticketId,
                                           @PathVariable int commentIndex,
                                           Authentication authentication) {
        try {
            String userId = authentication.getName();
            String role = authentication.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
            MaintenanceTicket updatedTicket = maintenanceTicketService.deleteTicketComment(
                    ticketId,
                    userId,
                    role,
                    commentIndex
            );
            return ResponseEntity.ok(updatedTicket);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PatchMapping("/{ticketId}/technician-status")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<?> updateTicketStatusByTechnician(@PathVariable String ticketId,
                                                            @Valid @RequestBody UpdateTicketStatusRequest request,
                                                            Authentication authentication) {
        try {
            String technicianId = authentication.getName();
            MaintenanceTicket updatedTicket = maintenanceTicketService.updateTicketStatusByTechnician(
                    ticketId,
                    technicianId,
                    request.getStatus(),
                    request.getResolutionNotes()
            );
            return ResponseEntity.ok(updatedTicket);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (IllegalArgumentException e) {
            Map<String, String> response = new HashMap<>();
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
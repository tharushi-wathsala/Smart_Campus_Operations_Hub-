package lk.sliit.it3030.smartcampus.controller;

import java.util.List;
import java.util.concurrent.ExecutionException;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import lk.sliit.it3030.smartcampus.model.Booking;
import lk.sliit.it3030.smartcampus.model.BookingStatus;
import lk.sliit.it3030.smartcampus.repository.BookingRepository;
import lk.sliit.it3030.smartcampus.service.NotificationService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import java.time.LocalTime;

@RestController
@RequestMapping("/api/v1/booking")
@CrossOrigin(origins="http://localhost:5173")
public class BookingController {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping
    public String createBooking(@RequestBody Booking booking) {
        try {
            String availabilityError = isResourceAvailable(booking);
            if (availabilityError != null) {
                return availabilityError;
            }

            booking.setStatus(BookingStatus.PENDING);
            bookingRepository.save(booking);

            // Notify Admins about the new booking request
            new Thread(() -> {
                try {
                    com.google.firebase.auth.ListUsersPage page = com.google.firebase.auth.FirebaseAuth.getInstance().listUsers(null);
                    java.util.List<String> adminUids = new java.util.ArrayList<>();
                    for (com.google.firebase.auth.ExportedUserRecord user : page.iterateAll()) {
                        java.util.Map<String, Object> claims = user.getCustomClaims();
                        if (claims != null && "ADMIN".equals(claims.get("role"))) {
                            adminUids.add(user.getUid());
                        }
                    }
                    if (!adminUids.isEmpty()) {
                        String msg = String.format("New booking request for %s on %s by %s.", 
                            booking.getBookingResource(), 
                            booking.getDate(), 
                            booking.getUserId());
                        notificationService.broadcastToRole(msg, "ADMIN", adminUids, booking.getId(), "BOOKING_REQUEST");
                    }
                } catch (Exception e) {
                    System.err.println("Failed to notify admins of new booking: " + e.getMessage());
                }
            }).start();

            // Broadcast real-time update signal for Admin Dashboard
            messagingTemplate.convertAndSend("/topic/bookings/admin/updates", "BOOKING_CREATED");

            return "Booking request submitted successfully";
        } catch (Exception e) {
            e.printStackTrace();
            return "Server Error: " + e.getMessage();
        }
    }

    @GetMapping("/test")
    public String test() {
        return "Booking backend working";
    }


    @GetMapping("/{id}")
    public Booking getBookingDetails(@PathVariable String id) {
        try {
            return bookingRepository.findByID(id);
        } catch (ExecutionException | InterruptedException e) {
            e.printStackTrace();
            return null;
        }
    }

    @GetMapping("/all")
    public List<Booking> getAllBookings() {
        try {
            return bookingRepository.findAll();
        } catch (ExecutionException | InterruptedException e) {
            e.printStackTrace();
            return null;
        }
    }

    @GetMapping("/user/{userId}")
    public List<Booking> getUserBookings(@PathVariable String userId) {
        try {
            return bookingRepository.findByUserId(userId);
        } catch (ExecutionException | InterruptedException e) {
            e.printStackTrace();
            return null;
        }
    }

    @PatchMapping("/{id}/status")
    public String updateBookingStatus(@PathVariable String id, @RequestParam BookingStatus status, @RequestParam(required = false) String adminReason) {
        try {
            // 1. Fetch booking to get requester information
            Booking booking = bookingRepository.findByID(id);
            if (booking == null) return "Booking not found";

            // 2. Update status
            bookingRepository.updateStatus(id, status, adminReason);

            // 3. Send Notification
            String message = String.format("Your booking for %s on %s has been %s.", 
                booking.getBookingResource(), 
                booking.getDate(), 
                status.toString().toLowerCase());
            
            if (status == BookingStatus.REJECT && adminReason != null && !adminReason.isEmpty()) {
                message += " Reason: " + adminReason;
            }

            if (booking.getRequesterUid() != null && !booking.getRequesterUid().isEmpty()) {
                notificationService.createNotification(
                    booking.getRequesterUid(), 
                    message, 
                    "BOOKING_UPDATE",
                    booking.getId()
                );
            }

            // Sync Broadcasts
            messagingTemplate.convertAndSend("/topic/bookings/admin/updates", "BOOKING_UPDATED");
            if (booking.getRequesterUid() != null) {
                messagingTemplate.convertAndSend("/topic/bookings/user/updates/" + booking.getRequesterUid(), "STATUS_CHANGE");
            }

            return "Status updated successfully";
        } catch (ExecutionException | InterruptedException e) {
            e.printStackTrace();
            return "Error updating status and sending notification";
        }
    }

    @DeleteMapping("/{id}")
    public String deleteBooking(@PathVariable String id, Authentication authentication) {
        try {
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

            if (isAdmin) {
                bookingRepository.delete(id);
                return "Booking deleted successfully";
            } else {
                // Soft delete for users
                Booking booking = bookingRepository.findByID(id);
                if (booking != null) {
                    // Update status to CANCELLED if it was active
                    if (booking.getStatus() == BookingStatus.APPROVED || booking.getStatus() == BookingStatus.PENDING) {
                        booking.setStatus(BookingStatus.CANCELLED);
                    }
                    booking.setHiddenByUser(true);
                    bookingRepository.update(id, booking);
                    
                    // Notify Admin of cancellation
                    messagingTemplate.convertAndSend("/topic/bookings/admin/updates", "BOOKING_CANCELLED");
                    
                    return "Booking removed successfully";
                }
                return "Booking not found";
            }
        } catch (ExecutionException | InterruptedException e) {
            e.printStackTrace();
            return "Error processing request";
        }
    }

    @PutMapping("/{id}")
    public String updateBooking(@PathVariable String id, @RequestBody Booking booking) {
        try {
            String availabilityError = isResourceAvailable(booking);
            if (availabilityError != null) {
                return availabilityError;
            }
            bookingRepository.update(id, booking);
            return "Booking updated successfully";
        } catch (Exception e) {
            e.printStackTrace();
            return "Server Error: " + e.getMessage();
        }
    }

    private String isResourceAvailable(Booking booking) throws ExecutionException, InterruptedException {
        LocalTime newStart = LocalTime.parse(booking.getStartTime());
        LocalTime newEnd = LocalTime.parse(booking.getEndTime());

        if (newStart.isAfter(newEnd) || newStart.equals(newEnd)) {
            return "End time must be after start time";
        }

        // Optimized query: Only check bookings for the same resource on the same date
        List<Booking> existingBookings = bookingRepository.findByResourceAndDate(booking.getBookingResource(), booking.getDate());

        if (existingBookings != null && !existingBookings.isEmpty()) {
            for (Booking b : existingBookings) {
                // Skip the same booking when checking for updates
                if (booking.getId() != null && booking.getId().equals(b.getId())) {
                    continue;
                }

                LocalTime oldStart = LocalTime.parse(b.getStartTime());
                LocalTime oldEnd = LocalTime.parse(b.getEndTime());

                // Check for overlap: (NewStart < OldEnd) AND (NewEnd > OldStart)
                if (newStart.isBefore(oldEnd) && newEnd.isAfter(oldStart)) {
                    if (b.getStatus() == BookingStatus.APPROVED || b.getStatus() == BookingStatus.PENDING) {
                        return String.format("Collision detected: %s is already reserved for %s between %s and %s. Please select a different time slot.", 
                            b.getBookingResource(), 
                            b.getDate(), 
                            b.getStartTime(), 
                            b.getEndTime());
                    }
                }
            }
        }
        return null;
    }
}
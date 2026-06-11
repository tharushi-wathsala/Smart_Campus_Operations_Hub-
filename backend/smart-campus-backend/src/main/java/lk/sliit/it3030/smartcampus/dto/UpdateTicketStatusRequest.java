package lk.sliit.it3030.smartcampus.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateTicketStatusRequest {
    @NotBlank(message = "Status must not be blank")
    private String status;

    private String reason;
    private String resolutionNotes;
}

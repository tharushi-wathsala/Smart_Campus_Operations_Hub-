package lk.sliit.it3030.smartcampus.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateMaintenanceTicketRequest {

    private String resourceId;

    private String resourceName;

    @NotBlank(message = "Location is required")
    private String location;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Description is required")
    private String description;

    @NotBlank(message = "Priority is required")
    private String priority;

    @NotBlank(message = "Preferred contact details are required")
    private String preferredContactDetails;

    private String preferredContactMethod;

    @Valid
    private List<ImageAttachmentRequest> attachments = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImageAttachmentRequest {
        @NotBlank(message = "Attachment file name is required")
        private String fileName;

        @NotBlank(message = "Attachment content type is required")
        private String contentType;

        @NotBlank(message = "Attachment dataUrl is required")
        private String dataUrl;
    }
}
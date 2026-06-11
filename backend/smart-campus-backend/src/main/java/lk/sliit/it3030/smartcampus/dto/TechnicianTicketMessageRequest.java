package lk.sliit.it3030.smartcampus.dto;

import lombok.Data;

@Data
public class TechnicianTicketMessageRequest {
    private String message;
    private String imageDataUrl;
    private String imageFileName;
    private String imageContentType;
    private String senderEmail;
}

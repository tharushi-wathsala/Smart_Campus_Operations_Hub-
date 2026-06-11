package lk.sliit.it3030.smartcampus.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentRequest {
    private String message;
    private String imageDataUrl;
    private String imageFileName;
    private String imageContentType;
    private String senderEmail;
}

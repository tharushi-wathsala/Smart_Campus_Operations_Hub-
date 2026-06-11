package lk.sliit.it3030.smartcampus.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.google.cloud.firestore.annotation.PropertyName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {
    private String id;
    private String recipientId;
    private String message;
    private String type;
    
    @JsonProperty("isRead")
    @PropertyName("isRead")
    private boolean isRead;
    
    @JsonProperty("isRead")
    @PropertyName("isRead")
    public boolean isRead() {
        return isRead;
    }

    @JsonProperty("isRead")
    @PropertyName("isRead")
    public void setRead(boolean isRead) {
        this.isRead = isRead;
    }

    private Date createdAt;
    
    @JsonProperty("resourceId")
    @PropertyName("resourceId")
    private String resourceId;
}

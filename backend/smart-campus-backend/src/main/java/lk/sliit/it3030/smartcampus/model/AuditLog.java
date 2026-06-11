package lk.sliit.it3030.smartcampus.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {
    private String id;
    private String action;
    private String performedBy;
    private String targetUser;
    private String details;
    private Date timestamp;
}

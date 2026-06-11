package lk.sliit.it3030.smartcampus.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AssignTechnicianRequest {
    @NotBlank(message = "Technician ID must not be blank")
    private String technicianId;

    private String technicianEmail;
}

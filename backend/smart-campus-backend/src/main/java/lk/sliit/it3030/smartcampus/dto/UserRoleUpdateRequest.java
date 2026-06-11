package lk.sliit.it3030.smartcampus.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserRoleUpdateRequest {
    @NotBlank(message = "Role must not be blank")
    private String role;
}

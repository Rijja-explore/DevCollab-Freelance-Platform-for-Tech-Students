package com.devcollab.auth.dto.request;

import com.devcollab.auth.entity.Role;
import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RegisterRequest {
    @Email @NotBlank private String email;
    @NotBlank @Size(min=8) private String password;
    @NotBlank private String firstName;
    @NotBlank private String lastName;
    @NotNull private Role role;
}

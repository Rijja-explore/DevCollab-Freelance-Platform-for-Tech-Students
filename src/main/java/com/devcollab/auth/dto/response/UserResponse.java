package com.devcollab.auth.dto.response;

import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserResponse { private String id; private String email; private String firstName; private String lastName; private String role; }

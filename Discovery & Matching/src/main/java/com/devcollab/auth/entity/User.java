package com.devcollab.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="auth_user") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id private String id;
    @Column(nullable=false, unique=true) private String email;
    @Column(nullable=false) private String password;
    @Column(name="first_name", nullable=false) private String firstName;
    @Column(name="last_name", nullable=false) private String lastName;
    @Enumerated(EnumType.STRING) private Role role;
    @Enumerated(EnumType.STRING) private AccountStatus status;
    private Instant createdAt;
    private Instant updatedAt;
    @PrePersist void prePersist() { if (id==null) id= UUID.randomUUID().toString(); if (createdAt==null) createdAt=Instant.now(); if (updatedAt==null) updatedAt=Instant.now(); if (status==null) status=AccountStatus.ACTIVE; }
    @PreUpdate void preUpdate() { updatedAt = Instant.now(); }
}

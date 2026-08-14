package com.devcollab.auth.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name="refresh_token") @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RefreshToken {
    @Id private String id;
    @Column(name="user_id", nullable=false) private String userId;
    @Column(name="token_hash", nullable=false) private String tokenHash;
    @Column(name="expires_at", nullable=false) private Instant expiresAt;
    private boolean revoked;
    private Instant createdAt;
    private Instant revokedAt;
    @PrePersist void prePersist() { if (id==null) id=UUID.randomUUID().toString(); if (createdAt==null) createdAt=Instant.now(); }
}

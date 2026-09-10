package com.devcollab.discovery.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchRecord {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "project_id", length = 36, nullable = false)
    private String projectId;

    @Column(name = "startup_id", length = 36, nullable = false)
    private String startupId;

    @Column(name = "student_id", length = 36, nullable = false)
    private String studentId;

    @Column(name = "match_score", nullable = false)
    private Double matchScore;

    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private String status = "ACCEPTED";

    @CreationTimestamp
    @Column(name = "matched_at", updatable = false)
    private Instant matchedAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.status == null) {
            this.status = "ACCEPTED";
        }
    }
}

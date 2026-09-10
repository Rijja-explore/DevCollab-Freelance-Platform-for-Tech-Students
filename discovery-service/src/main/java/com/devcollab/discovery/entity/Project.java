package com.devcollab.discovery.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "projects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@com.fasterxml.jackson.annotation.JsonIgnoreProperties(ignoreUnknown = true)
public class Project {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "startup_id", length = 36, nullable = false)
    private String startupId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT", nullable = false)
    private String description;

    @Column(name = "category", length = 100, nullable = false)
    private String category;

    @Column(name = "budget", precision = 15, scale = 2, nullable = false)
    private BigDecimal budget;

    @Column(name = "currency", length = 3, nullable = false)
    @Builder.Default
    private String currency = "USD";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50, nullable = false)
    @Builder.Default
    private ProjectStatus status = ProjectStatus.OPEN;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "project_skills", joinColumns = @JoinColumn(name = "project_id"))
    @Column(name = "skill", length = 100)
    @Builder.Default
    @com.fasterxml.jackson.databind.annotation.JsonDeserialize(as = java.util.HashSet.class)
    private Set<String> requiredSkills = new HashSet<>();

    public Set<String> getRequiredSkills() {
        if (requiredSkills == null) {
            return new HashSet<>();
        }
        return new HashSet<>(requiredSkills);
    }

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        if (this.id == null || this.id.isBlank()) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.currency == null || this.currency.isBlank()) {
            this.currency = "USD";
        }
        if (this.status == null) {
            this.status = ProjectStatus.OPEN;
        }
    }
}

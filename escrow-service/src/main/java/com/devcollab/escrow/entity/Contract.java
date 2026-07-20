package com.devcollab.escrow.entity;

import com.devcollab.escrow.enums.ContractStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "contracts", indexes = {
        @Index(name = "idx_contracts_project_id", columnList = "project_id"),
        @Index(name = "idx_contracts_startup_id", columnList = "startup_id"),
        @Index(name = "idx_contracts_student_id", columnList = "student_id"),
        @Index(name = "idx_contracts_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Contract {

    @Id
    @UuidGenerator
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "CHAR(36)")
    private UUID id;

    @Column(name = "project_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID projectId;

    @Column(name = "startup_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID startupId;

    @Column(name = "student_id", nullable = false, columnDefinition = "CHAR(36)")
    private UUID studentId;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "total_amount", nullable = false)
    private java.math.BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private ContractStatus status = ContractStatus.PENDING;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "INR";

    @Column(name = "terms", columnDefinition = "TEXT")
    private String terms;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @OneToMany(mappedBy = "contract", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<Milestone> milestones = new ArrayList<>();
}

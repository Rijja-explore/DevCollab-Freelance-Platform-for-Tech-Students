package com.devcollab.escrow.dto.response;

import com.devcollab.escrow.enums.MilestoneStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MilestoneResponse {

    private UUID id;
    private UUID contractId;
    private String title;
    private String description;
    private BigDecimal amount;
    private Integer sequenceOrder;
    private MilestoneStatus status;
    private LocalDate dueDate;
    private String approvedBy;
    private Instant approvedAt;
    private Instant releasedAt;
    private String idempotencyKey;
    private UUID transactionId;
    private String providerOrderId;
    private String approveUrl;
    private String deliverableUrl;
    private String submissionNotes;
    private String reviewFeedback;
    private Integer revisionCount;
    private Instant startedAt;
    private Instant submittedAt;
    private String disputeReason;
    private Instant disputedAt;
    private Instant disputeResolvedAt;
    private String disputeResolution;
    private Instant createdAt;
    private Instant updatedAt;
}

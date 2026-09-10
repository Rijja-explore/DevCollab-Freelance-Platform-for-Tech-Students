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
    private UUID approvedBy;
    private Instant approvedAt;
    private Instant releasedAt;
    private String idempotencyKey;
    private Instant createdAt;
    private Instant updatedAt;
}

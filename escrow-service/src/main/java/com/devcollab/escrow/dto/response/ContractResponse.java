package com.devcollab.escrow.dto.response;

import com.devcollab.escrow.enums.ContractStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ContractResponse {

    private UUID id;
    private UUID projectId;
    private UUID startupId;
    private UUID studentId;
    private String title;
    private String description;
    private BigDecimal totalAmount;
    private String currency;
    private ContractStatus status;
    private String terms;
    private Instant createdAt;
    private Instant updatedAt;
    private List<MilestoneResponse> milestones;
}

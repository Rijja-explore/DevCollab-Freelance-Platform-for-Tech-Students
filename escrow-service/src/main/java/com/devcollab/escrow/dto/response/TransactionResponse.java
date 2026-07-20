package com.devcollab.escrow.dto.response;

import com.devcollab.escrow.enums.TransactionStatus;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TransactionResponse {

    private UUID id;
    private UUID milestoneId;
    private String providerTransactionId;
    private String providerOrderId;
    private String providerPaymentId;
    private BigDecimal amount;
    private String currency;
    private TransactionStatus status;
    private String provider;
    private String failureReason;
    private Instant createdAt;
    private Instant completedAt;
}

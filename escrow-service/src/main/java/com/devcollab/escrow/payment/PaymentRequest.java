package com.devcollab.escrow.payment;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Builder
public class PaymentRequest {

    private UUID milestoneId;
    private BigDecimal amount;
    private String currency;
    private String description;
    private String idempotencyKey;
    private String receipt;
}

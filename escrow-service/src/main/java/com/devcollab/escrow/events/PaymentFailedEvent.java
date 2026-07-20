package com.devcollab.escrow.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Published by this service when a payment attempt fails.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PaymentFailedEvent extends BaseEvent {

    private Payload payload;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Payload {

        @JsonProperty("transaction_id")
        private UUID transactionId;

        @JsonProperty("milestone_id")
        private UUID milestoneId;

        @JsonProperty("contract_id")
        private UUID contractId;

        @JsonProperty("amount")
        private BigDecimal amount;

        @JsonProperty("failure_reason")
        private String failureReason;

        @JsonProperty("provider_order_id")
        private String providerOrderId;
    }
}

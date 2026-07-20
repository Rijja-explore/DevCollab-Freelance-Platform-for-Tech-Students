package com.devcollab.escrow.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Published by this service when a payment is successfully released.
 * Consumed by Service A and B for notifications and dashboards.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class PaymentReleasedEvent extends BaseEvent {

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

        @JsonProperty("student_id")
        private UUID studentId;

        @JsonProperty("startup_id")
        private UUID startupId;

        @JsonProperty("amount")
        private BigDecimal amount;

        @JsonProperty("currency")
        private String currency;

        @JsonProperty("provider_payment_id")
        private String providerPaymentId;
    }
}

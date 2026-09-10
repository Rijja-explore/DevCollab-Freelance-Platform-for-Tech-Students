package com.devcollab.escrow.events;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
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
    @Builder
    public static class Payload {

        @JsonProperty("project_id")
        @JsonAlias("projectId")
        private UUID projectId;

        @JsonProperty("transaction_id")
        @JsonAlias("transactionId")
        private UUID transactionId;

        @JsonProperty("milestone_id")
        @JsonAlias("milestoneId")
        private UUID milestoneId;

        @JsonProperty("contract_id")
        @JsonAlias("contractId")
        private UUID contractId;

        @JsonProperty("amount")
        private BigDecimal amount;

        @JsonProperty("reason")
        @JsonAlias({"failureReason", "reason"})
        private String reason;

        @JsonProperty("provider_order_id")
        @JsonAlias("providerOrderId")
        private String providerOrderId;
    }
}
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

        @JsonProperty("student_id")
        @JsonAlias("studentId")
        private UUID studentId;

        @JsonProperty("startup_id")
        @JsonAlias("startupId")
        private UUID startupId;

        @JsonProperty("amount")
        private BigDecimal amount;

        @JsonProperty("currency")
        private String currency;

        @JsonProperty("provider_payment_id")
        @JsonAlias("providerPaymentId")
        private String providerPaymentId;

        @JsonProperty("status")
        @Builder.Default
        private String status = "released";
    }
}
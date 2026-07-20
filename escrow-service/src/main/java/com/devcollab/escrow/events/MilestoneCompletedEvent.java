package com.devcollab.escrow.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Published by Service B (Workspace) when a student marks a milestone as completed.
 * This service consumes it to trigger payment processing.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class MilestoneCompletedEvent extends BaseEvent {

    private Payload payload;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Payload {

        @JsonProperty("milestone_id")
        private UUID milestoneId;

        @JsonProperty("contract_id")
        private UUID contractId;

        @JsonProperty("student_id")
        private UUID studentId;

        @JsonProperty("completion_notes")
        private String completionNotes;

        @JsonProperty("amount")
        private BigDecimal amount;
    }
}

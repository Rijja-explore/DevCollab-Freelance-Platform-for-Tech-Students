package com.devcollab.escrow.events;

import com.fasterxml.jackson.annotation.JsonAlias;
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

        @JsonProperty("project_id")
        @JsonAlias("projectId")
        private UUID projectId;

        @JsonProperty("milestone_id")
        @JsonAlias("milestoneId")
        private UUID milestoneId;

        @JsonProperty("contract_id")
        @JsonAlias("contractId")
        private UUID contractId;

        @JsonProperty("student_id")
        @JsonAlias({"studentId", "submittedBy"})
        private UUID studentId;

        @JsonProperty("completion_notes")
        @JsonAlias("completionNotes")
        private String completionNotes;

        @JsonProperty("amount")
        private BigDecimal amount;
    }
}

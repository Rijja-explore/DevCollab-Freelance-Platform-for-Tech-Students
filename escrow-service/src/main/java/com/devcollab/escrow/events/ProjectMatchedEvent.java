package com.devcollab.escrow.events;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * Published by Service A (Discovery & Matching) when a student is matched to a project.
 * This service consumes this event and creates a Contract with default milestones.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class ProjectMatchedEvent extends BaseEvent {

    private Payload payload;

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Payload {

        @JsonProperty("project_id")
        @JsonAlias("projectId")
        private UUID projectId;

        @JsonProperty("startup_id")
        @JsonAlias("startupId")
        private UUID startupId;

        @JsonProperty("student_id")
        @JsonAlias("studentId")
        private UUID studentId;

        @JsonProperty("project_title")
        @JsonAlias("projectTitle")
        private String projectTitle;

        @JsonProperty("project_description")
        @JsonAlias("projectDescription")
        private String projectDescription;

        @JsonProperty("total_budget")
        @JsonAlias({"totalBudget", "amount"})
        private BigDecimal totalBudget;

        @JsonProperty("currency")
        private String currency;

        @JsonProperty("milestones")
        private List<MilestoneDefinition> milestones;
    }

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MilestoneDefinition {

        @JsonProperty("title")
        private String title;

        @JsonProperty("description")
        private String description;

        @JsonProperty("amount")
        private BigDecimal amount;

        @JsonProperty("sequence_order")
        @JsonAlias("sequenceOrder")
        private int sequenceOrder;

        @JsonProperty("due_date")
        @JsonAlias("dueDate")
        private String dueDate;
    }
}

package com.devcollab.discovery.service;

import com.devcollab.discovery.entity.Project;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProjectMatchedEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${events.exchange:devcollab.events}")
    private String exchange;

    @Value("${events.routing-key.project-matched:project.matched}")
    private String routingKey;

    public void publishProjectMatched(Project project, String studentId) {
        String eventId = UUID.randomUUID().toString();
        log.info("Publishing project.matched event {} for project: {}, student: {}", eventId, project.getId(), studentId);

        BigDecimal total = project.getBudget() != null ? project.getBudget() : BigDecimal.valueOf(1000.00);
        BigDecimal part1 = total.multiply(BigDecimal.valueOf(0.30)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal part2 = total.multiply(BigDecimal.valueOf(0.40)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal part3 = total.subtract(part1).subtract(part2).setScale(2, RoundingMode.HALF_UP);

        List<MilestonePayload> milestones = List.of(
                MilestonePayload.builder()
                        .title("Milestone 1: Project Architecture & Setup")
                        .description("Initial environment setup, repository scaffolding, and data architecture design")
                        .amount(part1)
                        .sequenceOrder(1)
                        .dueDate(LocalDate.now().plusDays(10).toString())
                        .build(),
                MilestonePayload.builder()
                        .title("Milestone 2: Core Feature Implementation")
                        .description("Implementation of core user stories, business logic, and API contracts")
                        .amount(part2)
                        .sequenceOrder(2)
                        .dueDate(LocalDate.now().plusDays(25).toString())
                        .build(),
                MilestonePayload.builder()
                        .title("Milestone 3: Final Delivery & Integration Testing")
                        .description("End-to-end testing, documentation, polishing, and deployment")
                        .amount(part3)
                        .sequenceOrder(3)
                        .dueDate(LocalDate.now().plusDays(40).toString())
                        .build()
        );

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("projectId", project.getId());
        payload.put("project_id", project.getId());
        payload.put("startupId", project.getStartupId());
        payload.put("startup_id", project.getStartupId());
        payload.put("studentId", studentId);
        payload.put("student_id", studentId);
        payload.put("projectTitle", project.getTitle());
        payload.put("project_title", project.getTitle());
        payload.put("projectDescription", project.getDescription());
        payload.put("project_description", project.getDescription());
        payload.put("totalBudget", total);
        payload.put("total_budget", total);
        payload.put("currency", project.getCurrency() != null ? project.getCurrency() : "USD");
        payload.put("milestones", milestones);

        Map<String, Object> eventEnvelope = new LinkedHashMap<>();
        eventEnvelope.put("eventId", eventId);
        eventEnvelope.put("event_id", eventId);
        eventEnvelope.put("eventType", "project.matched");
        eventEnvelope.put("event_type", "project.matched");
        eventEnvelope.put("timestamp", Instant.now().toString());
        eventEnvelope.put("producer", "discovery-service");
        eventEnvelope.put("payload", payload);

        try {
            rabbitTemplate.convertAndSend(exchange, routingKey, eventEnvelope);
            log.info("Successfully published project.matched event {} to exchange '{}' key '{}'", eventId, exchange, routingKey);
        } catch (Exception e) {
            log.warn("RabbitMQ publish failed for event {} (broker may be starting): {}", eventId, e.getMessage());
        }
    }

    @Data
    @Builder
    public static class MilestonePayload {
        private String title;
        private String description;
        private BigDecimal amount;
        private Integer sequenceOrder;
        private String dueDate;
    }
}

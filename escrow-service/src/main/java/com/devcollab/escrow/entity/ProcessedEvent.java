package com.devcollab.escrow.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "processed_events", indexes = {
        @Index(name = "idx_processed_events_event_id", columnList = "event_id", unique = true)
})
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
/**
 * Used for RabbitMQ consumer idempotency.
 * Before processing any event, check if event_id exists in this table.
 * If it does, skip processing. If not, insert and process.
 */
public class ProcessedEvent {

    @Id
    @Column(name = "event_id", nullable = false, length = 100)
    private String eventId;

    @Column(name = "event_type", nullable = false, length = 100)
    private String eventType;

    @Column(name = "processed_at", nullable = false)
    @Builder.Default
    private Instant processedAt = Instant.now();

    @Column(name = "producer", length = 100)
    private String producer;
}

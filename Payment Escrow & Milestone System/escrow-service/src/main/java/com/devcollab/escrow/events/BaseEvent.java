package com.devcollab.escrow.events;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.Instant;

/**
 * Base event envelope for all DevCollab RabbitMQ events.
 * Every event must carry: event_id, event_type, producer, occurred_at, version.
 */
@Getter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public abstract class BaseEvent {

    @JsonProperty("event_id")
    private String eventId;

    @JsonProperty("event_type")
    private String eventType;

    @JsonProperty("producer")
    private String producer;

    @JsonProperty("occurred_at")
    private Instant occurredAt;

    @JsonProperty("version")
    private String version;
}

package com.devcollab.escrow.dto.response;

import com.devcollab.escrow.audit.AuditAction;
import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class AuditLogResponse {

    private UUID id;
    private String entityType;
    private String entityId;
    private AuditAction action;
    private String actor;
    private String description;
    private String metadata;
    private Instant createdAt;
}

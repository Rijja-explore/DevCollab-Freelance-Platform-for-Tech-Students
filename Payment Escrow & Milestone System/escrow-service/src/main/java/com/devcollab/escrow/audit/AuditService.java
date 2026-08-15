package com.devcollab.escrow.audit;

import com.devcollab.escrow.entity.AuditLog;
import com.devcollab.escrow.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Audit service for creating immutable audit log entries.
 *
 * Rules:
 * - NEVER update audit rows.
 * - Uses REQUIRES_NEW propagation so audit logs persist even if the calling
 *   transaction rolls back (e.g., payment failure still creates a log).
 * - Async execution to avoid blocking the main transaction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String entityType,
                    String entityId,
                    AuditAction action,
                    String actor,
                    String description) {
        log(entityType, entityId, action, actor, description, null);
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(String entityType,
                    String entityId,
                    AuditAction action,
                    String actor,
                    String description,
                    String metadata) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .entityType(entityType)
                    .entityId(entityId)
                    .action(action)
                    .actor(actor)
                    .description(description)
                    .metadata(metadata)
                    .build();
            auditLogRepository.save(auditLog);
            log.debug("Audit log created: {} {} {} by {}", action, entityType, entityId, actor);
        } catch (Exception e) {
            // Log audit failure but never propagate — audit must not break business flows
            log.error("Failed to create audit log for action {} on entity {}: {}",
                    action, entityId, e.getMessage());
        }
    }
}

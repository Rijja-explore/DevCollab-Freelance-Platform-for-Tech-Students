package com.devcollab.escrow.controller;

import com.devcollab.escrow.audit.AuditAction;
import com.devcollab.escrow.dto.response.ApiResponse;
import com.devcollab.escrow.dto.response.AuditLogResponse;
import com.devcollab.escrow.dto.response.PageResponse;
import com.devcollab.escrow.entity.AuditLog;
import com.devcollab.escrow.mapper.AuditLogMapper;
import com.devcollab.escrow.repository.AuditLogRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
@Tag(name = "Audit Logs", description = "Immutable audit trail for all financial operations")
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {

    private final AuditLogRepository auditLogRepository;
    private final AuditLogMapper auditLogMapper;

    @GetMapping
    @Operation(summary = "List all audit logs (admin only)")
    public ResponseEntity<ApiResponse<PageResponse<AuditLogResponse>>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String entityType,
            @RequestParam(required = false) String entityId,
            @RequestParam(required = false) AuditAction action) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<AuditLog> logs;

        if (entityType != null && entityId != null) {
            logs = auditLogRepository.findByEntityTypeAndEntityId(entityType, entityId, pageable);
        } else if (entityType != null) {
            logs = auditLogRepository.findByEntityType(entityType, pageable);
        } else if (action != null) {
            logs = auditLogRepository.findByAction(action, pageable);
        } else {
            logs = auditLogRepository.findAll(pageable);
        }

        PageResponse<AuditLogResponse> response = PageResponse.from(
                logs.map(auditLogMapper::toResponse));

        return ResponseEntity.ok(ApiResponse.success(response));
    }
}

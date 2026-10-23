package com.devcollab.escrow.controller;

import com.devcollab.escrow.dto.request.*;
import com.devcollab.escrow.dto.response.ApiResponse;
import com.devcollab.escrow.dto.response.MilestoneResponse;
import com.devcollab.escrow.dto.response.PageResponse;
import com.devcollab.escrow.security.UserPrincipal;
import com.devcollab.escrow.service.MilestoneService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping({"/api/payments/milestones", "/api/milestones"})
@RequiredArgsConstructor
@Tag(name = "Milestones", description = "Milestone lifecycle and payment release management")
public class MilestoneController {

    private final MilestoneService milestoneService;

    @PostMapping
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "Create a milestone for a contract")
    public ResponseEntity<ApiResponse<MilestoneResponse>> createMilestone(
            @Valid @RequestBody CreateMilestoneRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        MilestoneResponse response = milestoneService.createMilestone(request, principal != null ? principal.getEmail() : "system");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Milestone created"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STARTUP', 'STUDENT', 'ADMIN')")
    @Operation(summary = "Get milestone by ID")
    public ResponseEntity<ApiResponse<MilestoneResponse>> getMilestone(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(milestoneService.getById(id)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STARTUP', 'STUDENT', 'ADMIN')")
    @Operation(summary = "List all milestones")
    public ResponseEntity<ApiResponse<PageResponse<MilestoneResponse>>> getAllMilestones(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(milestoneService.getAll(pageable)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "Update milestone details")
    public ResponseEntity<ApiResponse<MilestoneResponse>> updateMilestone(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateMilestoneRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(ApiResponse.success(
                milestoneService.updateMilestone(id, request, principal != null ? principal.getEmail() : "system")));
    }

    @PostMapping("/{id}/start")
    @PreAuthorize("hasAnyRole('STUDENT', 'STARTUP', 'ADMIN')")
    @Operation(summary = "Start working on a milestone")
    public ResponseEntity<ApiResponse<MilestoneResponse>> startMilestone(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        String actor = principal != null ? principal.getEmail() : "system";
        MilestoneResponse response = milestoneService.startMilestone(id, actor);
        return ResponseEntity.ok(ApiResponse.success(response, "Milestone work started"));
    }

    @PostMapping("/{id}/submit")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    @Operation(summary = "Submit milestone deliverable for review")
    public ResponseEntity<ApiResponse<MilestoneResponse>> submitMilestone(
            @PathVariable UUID id,
            @Valid @RequestBody(required = false) SubmitMilestoneRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        String actor = principal != null ? principal.getEmail() : "system";
        MilestoneResponse response = milestoneService.submitMilestone(id, request, actor);
        return ResponseEntity.ok(ApiResponse.success(response, "Milestone deliverable submitted for review"));
    }

    @PostMapping("/{id}/request-changes")
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "Request changes or revisions on a submitted deliverable")
    public ResponseEntity<ApiResponse<MilestoneResponse>> requestChanges(
            @PathVariable UUID id,
            @Valid @RequestBody RequestChangesRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        String actor = principal != null ? principal.getEmail() : "system";
        MilestoneResponse response = milestoneService.requestChanges(id, request, actor);
        return ResponseEntity.ok(ApiResponse.success(response, "Changes requested for milestone deliverable"));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "Approve a submitted milestone and prepare for payment release")
    public ResponseEntity<ApiResponse<MilestoneResponse>> approveMilestone(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        String actorId = principal != null && principal.getUserId() != null
                ? principal.getUserId().toString()
                : (principal != null && principal.getEmail() != null ? principal.getEmail() : "system");
        String actorEmail = principal != null ? principal.getEmail() : "system";
        MilestoneResponse response = milestoneService.approveMilestone(id, actorId, actorEmail);
        return ResponseEntity.ok(ApiResponse.success(response, "Milestone approved. Ready for payment release."));
    }

    @PostMapping("/{id}/release")
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "Trigger payment release for an approved milestone")
    public ResponseEntity<ApiResponse<MilestoneResponse>> releaseMilestone(
            @PathVariable UUID id,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @AuthenticationPrincipal UserPrincipal principal) {

        String key = (idempotencyKey != null && !idempotencyKey.isBlank())
                ? idempotencyKey : "release:" + id.toString();
        String actor = principal != null ? principal.getEmail() : "system";

        MilestoneResponse response = milestoneService.releaseMilestone(id, key, actor);
        if (response.getStatus() == com.devcollab.escrow.enums.MilestoneStatus.FAILED) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(ApiResponse.<MilestoneResponse>builder()
                            .success(false)
                            .message("Payment order creation failed. You can retry payment.")
                            .error(ApiResponse.ErrorDetails.builder()
                                     .code("PAYMENT_GATEWAY_ERROR")
                                    .message("Payment order creation failed. Please retry payment.")
                                    .build())
                            .data(response)
                            .build());
        }
        return ResponseEntity.ok(ApiResponse.success(response, "Payment release initiated"));
    }

    @PostMapping("/{id}/dispute")
    @PreAuthorize("hasAnyRole('STARTUP', 'STUDENT', 'ADMIN')")
    @Operation(summary = "Raise a dispute on a milestone")
    public ResponseEntity<ApiResponse<MilestoneResponse>> disputeMilestone(
            @PathVariable UUID id,
            @Valid @RequestBody DisputeMilestoneRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        String actor = principal != null ? principal.getEmail() : "system";
        MilestoneResponse response = milestoneService.disputeMilestone(id, request, actor);
        return ResponseEntity.ok(ApiResponse.success(response, "Milestone dispute raised"));
    }

    @PostMapping("/{id}/resolve-dispute")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Resolve a milestone dispute (Admin only)")
    public ResponseEntity<ApiResponse<MilestoneResponse>> resolveDispute(
            @PathVariable UUID id,
            @Valid @RequestBody ResolveDisputeRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        String actor = principal != null ? principal.getEmail() : "admin";
        MilestoneResponse response = milestoneService.resolveDispute(id, request, actor);
        return ResponseEntity.ok(ApiResponse.success(response, "Milestone dispute resolved"));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "Manually mark milestone as completed and release funds")
    public ResponseEntity<ApiResponse<MilestoneResponse>> completeMilestone(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = principal != null && principal.getEmail() != null ? principal.getEmail() : "system";
        milestoneService.confirmPaymentRelease(id, "MANUAL_CAP_" + UUID.randomUUID().toString().substring(0, 8),
                "MANUAL_ORDER", actor);
        return ResponseEntity.ok(ApiResponse.success(milestoneService.getById(id), "Milestone payment released and completed"));
    }
}

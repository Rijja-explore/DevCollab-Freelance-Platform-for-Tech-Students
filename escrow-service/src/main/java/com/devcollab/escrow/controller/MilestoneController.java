package com.devcollab.escrow.controller;

import com.devcollab.escrow.dto.request.CreateMilestoneRequest;
import com.devcollab.escrow.dto.request.UpdateMilestoneRequest;
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
@RequestMapping("/api/milestones")
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

        MilestoneResponse response = milestoneService.createMilestone(request, principal.getEmail());
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
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all milestones (admin)")
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
                milestoneService.updateMilestone(id, request, principal.getEmail())));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "Approve a submitted milestone and create a Razorpay payment order")
    public ResponseEntity<ApiResponse<MilestoneResponse>> approveMilestone(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        MilestoneResponse response = milestoneService.approveMilestone(
                id, principal.getUserId(), principal.getEmail());
        return ResponseEntity.ok(ApiResponse.success(response, "Milestone approved. Payment order created."));
    }

    @PostMapping("/{id}/release")
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "Trigger payment release for an approved milestone")
    public ResponseEntity<ApiResponse<MilestoneResponse>> releaseMilestone(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        MilestoneResponse response = milestoneService.releaseMilestone(id, principal.getEmail());
        return ResponseEntity.ok(ApiResponse.success(response, "Payment release initiated"));
    }
}

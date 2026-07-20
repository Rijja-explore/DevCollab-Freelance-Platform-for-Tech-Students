package com.devcollab.escrow.controller;

import com.devcollab.escrow.dto.request.CreateContractRequest;
import com.devcollab.escrow.dto.response.ApiResponse;
import com.devcollab.escrow.dto.response.ContractResponse;
import com.devcollab.escrow.dto.response.PageResponse;
import com.devcollab.escrow.security.UserPrincipal;
import com.devcollab.escrow.service.ContractService;
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
@RequestMapping("/api/contracts")
@RequiredArgsConstructor
@Tag(name = "Contracts", description = "Escrow contract management")
public class ContractController {

    private final ContractService contractService;

    @PostMapping
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "Create a new escrow contract")
    public ResponseEntity<ApiResponse<ContractResponse>> createContract(
            @Valid @RequestBody CreateContractRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        ContractResponse response = contractService.createContract(request, principal.getEmail());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(response, "Contract created successfully"));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STARTUP', 'STUDENT', 'ADMIN')")
    @Operation(summary = "Get contract by ID")
    public ResponseEntity<ApiResponse<ContractResponse>> getContract(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(contractService.getById(id)));
    }

    @GetMapping("/project/{projectId}")
    @PreAuthorize("hasAnyRole('STARTUP', 'STUDENT', 'ADMIN')")
    @Operation(summary = "Get all contracts for a project")
    public ResponseEntity<ApiResponse<PageResponse<ContractResponse>>> getByProject(
            @PathVariable UUID projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(contractService.getByProjectId(projectId, pageable)));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN')")
    @Operation(summary = "List all contracts (admin only)")
    public ResponseEntity<ApiResponse<PageResponse<ContractResponse>>> getAllContracts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(contractService.getAll(pageable)));
    }

    @PostMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Activate a pending contract (admin)")
    public ResponseEntity<ApiResponse<ContractResponse>> activateContract(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(ApiResponse.success(
                contractService.activateContract(id, principal.getEmail()),
                "Contract activated"));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "Cancel a contract")
    public ResponseEntity<ApiResponse<ContractResponse>> cancelContract(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {

        return ResponseEntity.ok(ApiResponse.success(
                contractService.cancelContract(id, principal.getEmail()),
                "Contract cancelled"));
    }
}

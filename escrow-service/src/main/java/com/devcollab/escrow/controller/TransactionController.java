package com.devcollab.escrow.controller;

import com.devcollab.escrow.dto.response.ApiResponse;
import com.devcollab.escrow.dto.response.PageResponse;
import com.devcollab.escrow.dto.response.TransactionResponse;
import com.devcollab.escrow.service.TransactionService;
import com.devcollab.escrow.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.UUID;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
@Tag(name = "Transactions", description = "Payment transaction history")
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "List all transactions")
    public ResponseEntity<ApiResponse<PageResponse<TransactionResponse>>> getAllTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(transactionService.getAll(pageable)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STARTUP', 'STUDENT', 'ADMIN')")
    @Operation(summary = "Get transaction by ID")
    public ResponseEntity<ApiResponse<TransactionResponse>> getTransaction(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success(transactionService.getById(id)));
    }

    @PostMapping("/{id}/capture")
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "Capture an approved payment order")
    public ResponseEntity<ApiResponse<TransactionResponse>> captureTransaction(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        String actor = principal != null ? principal.getEmail() : "system";
        return ResponseEntity.ok(ApiResponse.success(transactionService.capture(id, actor), "Payment captured"));
    }

    @GetMapping("/contract/{contractId}")
    @PreAuthorize("hasAnyRole('STARTUP', 'STUDENT', 'ADMIN')")
    @Operation(summary = "Get transactions for a contract")
    public ResponseEntity<ApiResponse<PageResponse<TransactionResponse>>> getByContract(
            @PathVariable UUID contractId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return ResponseEntity.ok(ApiResponse.success(transactionService.getByContractId(contractId, pageable)));
    }
}

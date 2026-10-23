package com.devcollab.escrow.controller;

import com.devcollab.escrow.dto.response.ApiResponse;
import com.devcollab.escrow.dto.response.PageResponse;
import com.devcollab.escrow.dto.response.ReminderExecutionSummary;
import com.devcollab.escrow.dto.response.ReminderResponse;
import com.devcollab.escrow.service.PaymentReminderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/reminders")
@RequiredArgsConstructor
@Tag(name = "Payment Reminders", description = "Automated milestone due date, submission, and payment reminders")
public class PaymentReminderController {

    private final PaymentReminderService paymentReminderService;

    @PostMapping("/trigger")
    @PreAuthorize("hasAnyRole('STARTUP', 'ADMIN')")
    @Operation(summary = "Manually trigger the payment reminder scan (runs all checks)")
    public ResponseEntity<ApiResponse<ReminderExecutionSummary>> triggerReminders() {
        ReminderExecutionSummary summary = paymentReminderService.processAllReminders();
        return ResponseEntity.ok(ApiResponse.success(summary, "Payment reminder scan executed successfully"));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STARTUP', 'STUDENT', 'ADMIN')")
    @Operation(summary = "List all sent payment reminders")
    public ResponseEntity<ApiResponse<PageResponse<ReminderResponse>>> getAllReminders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        PageRequest pageable = PageRequest.of(page, size, Sort.by("sentAt").descending());
        return ResponseEntity.ok(ApiResponse.success(paymentReminderService.getAllReminders(pageable)));
    }

    @GetMapping("/milestone/{milestoneId}")
    @PreAuthorize("hasAnyRole('STARTUP', 'STUDENT', 'ADMIN')")
    @Operation(summary = "Get payment reminders for a specific milestone")
    public ResponseEntity<ApiResponse<List<ReminderResponse>>> getRemindersForMilestone(
            @PathVariable UUID milestoneId) {

        return ResponseEntity.ok(ApiResponse.success(paymentReminderService.getRemindersForMilestone(milestoneId)));
    }

    @GetMapping("/contract/{contractId}")
    @PreAuthorize("hasAnyRole('STARTUP', 'STUDENT', 'ADMIN')")
    @Operation(summary = "Get payment reminders for a specific contract")
    public ResponseEntity<ApiResponse<List<ReminderResponse>>> getRemindersForContract(
            @PathVariable UUID contractId) {

        return ResponseEntity.ok(ApiResponse.success(paymentReminderService.getRemindersForContract(contractId)));
    }
}


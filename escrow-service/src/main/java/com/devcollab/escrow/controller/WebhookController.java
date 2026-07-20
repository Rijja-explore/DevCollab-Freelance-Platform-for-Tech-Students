package com.devcollab.escrow.controller;

import com.devcollab.escrow.audit.AuditAction;
import com.devcollab.escrow.audit.AuditService;
import com.devcollab.escrow.dto.response.ApiResponse;
import com.devcollab.escrow.webhook.WebhookProcessor;
import com.devcollab.escrow.webhook.WebhookVerifier;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Razorpay webhook endpoint.
 *
 * IMPORTANT: This endpoint bypasses JWT authentication.
 * It is secured via HMAC-SHA256 signature verification instead.
 *
 * The request body must be read as raw bytes to preserve the exact payload
 * for HMAC computation — any JSON parsing before verification would invalidate the check.
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Payments Webhook", description = "Razorpay payment webhook receiver")
public class WebhookController {

    private final WebhookVerifier webhookVerifier;
    private final WebhookProcessor webhookProcessor;
    private final AuditService auditService;

    @PostMapping(value = "/webhook", consumes = "application/json")
    @Operation(summary = "Razorpay webhook receiver — JWT bypassed, HMAC verified")
    public ResponseEntity<ApiResponse<Void>> handleWebhook(
            @RequestBody String rawPayload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {

        log.info("Webhook received. Signature header present: {}", signature != null);

        // Step 1: Verify HMAC signature
        webhookVerifier.verify(rawPayload, signature);

        // Step 2: Log receipt (after verification)
        auditService.log("WEBHOOK", "razorpay",
                AuditAction.WEBHOOK_VERIFIED, "razorpay",
                "Webhook signature verified. Processing payload.");

        // Step 3: Process event
        webhookProcessor.process(rawPayload);

        return ResponseEntity.ok(ApiResponse.success(null, "Webhook processed"));
    }
}

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
 * Payment provider webhook endpoint.
 *
 * IMPORTANT: This endpoint bypasses JWT authentication.
 * It is secured via provider signature verification instead.
 *
 * For PayPal, the request body is read as raw bytes to preserve exact payload
 * for signature verification — any JSON parsing before verification would invalidate the check.
 */
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Payments Webhook", description = "Payment provider webhook receiver")
public class WebhookController {

    private final WebhookVerifier webhookVerifier;
    private final WebhookProcessor webhookProcessor;
    private final AuditService auditService;

    @PostMapping(value = "/webhook", consumes = "application/json")
    @Operation(summary = "Payment provider webhook receiver — JWT bypassed, signature verified")
    public ResponseEntity<ApiResponse<Void>> handleWebhook(
            @RequestBody String rawPayload,
            @RequestHeader(value = "PayPal-Transmission-Id", required = false) String transmissionId,
            @RequestHeader(value = "PayPal-Transmission-Time", required = false) String transmissionTime,
            @RequestHeader(value = "PayPal-Cert-Url", required = false) String certUrl,
            @RequestHeader(value = "PayPal-Auth-Algo", required = false) String authAlgo,
            @RequestHeader(value = "PayPal-Transmission-Sig", required = false) String transmissionSig,
            @RequestHeader(value = "PayPal-Webhook-Id", required = false) String webhookId) {

        log.info("Webhook received. Transmission sig present: {}", transmissionSig != null);

        // Step 1: Verify signature
        webhookVerifier.verify(rawPayload, transmissionId, transmissionTime,
                certUrl, authAlgo, transmissionSig, webhookId);

        // Step 2: Log receipt (after verification)
        auditService.log("WEBHOOK", "paypal",
                AuditAction.WEBHOOK_VERIFIED, "paypal",
                "Webhook signature verified. Processing payload.");

        // Step 3: Process event
        webhookProcessor.process(rawPayload);

        return ResponseEntity.ok(ApiResponse.success(null, "Webhook processed"));
    }
}

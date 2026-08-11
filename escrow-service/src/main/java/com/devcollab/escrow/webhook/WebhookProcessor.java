package com.devcollab.escrow.webhook;

import com.devcollab.escrow.audit.AuditAction;
import com.devcollab.escrow.audit.AuditService;
import com.devcollab.escrow.entity.ProcessedEvent;
import com.devcollab.escrow.repository.ProcessedEventRepository;
import com.devcollab.escrow.service.MilestoneService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Processes incoming payment webhook events.
 *
 * Supports PayPal events:
 * - PAYMENT.CAPTURE.COMPLETED → release milestone, update transaction
 * - PAYMENT.CAPTURE.DENIED   → mark milestone failed, update transaction
 *
 * Idempotency: uses capture id as event_id in ProcessedEvent table.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebhookProcessor {

    private final ProcessedEventRepository processedEventRepository;
    private final MilestoneService milestoneService;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Transactional
    public void process(String rawPayload) {
        try {
            JsonNode root = objectMapper.readTree(rawPayload);
            String eventType = root.path("event_type").asText();
            if (eventType == null || eventType.isBlank()) {
                eventType = root.path("event").asText();
            }

            log.info("Processing payment webhook event: {}", eventType);

            auditService.log("WEBHOOK", eventType,
                    AuditAction.WEBHOOK_RECEIVED, "provider",
                    "Webhook event received: " + eventType);

            switch (eventType) {
                case "PAYMENT.CAPTURE.COMPLETED" -> handleCaptureCompleted(root.path("resource"));
                case "PAYMENT.CAPTURE.DENIED" -> handleCaptureDenied(root.path("resource"));
                case "payment.captured", "order.paid" -> handleRazorpayCaptured(root);
                case "payment.failed" -> handleRazorpayFailed(root);
                default -> {
                    // Generic fallback for custom/mock test webhooks
                    if (root.has("milestone_id") || root.has("milestoneId")) {
                        handleGenericWebhook(root);
                    } else {
                        log.info("Ignoring unhandled webhook event type: {}", eventType);
                    }
                }
            }

        } catch (Exception e) {
            log.error("Error processing webhook payload: {}", e.getMessage(), e);
            throw new RuntimeException("Webhook processing failed: " + e.getMessage(), e);
        }
    }

    private void handleRazorpayCaptured(JsonNode root) {
        JsonNode entity = root.path("payload").path("payment").path("entity");
        String paymentId = entity.path("id").asText();
        String orderId = entity.path("order_id").asText();
        String milestoneIdStr = entity.path("notes").path("milestone_id").asText();

        if (paymentId.isBlank()) {
            paymentId = root.path("payment_id").asText(root.path("id").asText("pay_" + UUID.randomUUID()));
        }
        if (orderId.isBlank()) {
            orderId = root.path("order_id").asText("order_mock");
        }
        if (milestoneIdStr.isBlank()) {
            milestoneIdStr = root.path("milestone_id").asText(root.path("milestoneId").asText());
        }

        processPaymentConfirmation(paymentId, orderId, milestoneIdStr, "razorpay");
    }

    private void handleRazorpayFailed(JsonNode root) {
        JsonNode entity = root.path("payload").path("payment").path("entity");
        String paymentId = entity.path("id").asText(root.path("payment_id").asText());
        String reason = entity.path("error_description").asText(root.path("reason").asText("Payment failed"));

        if (processedEventRepository.existsByEventId("denied:" + paymentId)) {
            return;
        }

        processedEventRepository.save(ProcessedEvent.builder()
                .eventId("denied:" + paymentId)
                .eventType("payment.failed")
                .producer("razorpay")
                .build());

        auditService.log("TRANSACTION", paymentId,
                AuditAction.PAYMENT_FAILED, "razorpay",
                "Payment failed: " + reason);
    }

    private void handleGenericWebhook(JsonNode root) {
        String milestoneIdStr = root.has("milestone_id") ? root.path("milestone_id").asText() : root.path("milestoneId").asText();
        String paymentId = root.path("payment_id").asText(root.path("id").asText("pay_" + UUID.randomUUID()));
        String orderId = root.path("order_id").asText("order_generic");

        processPaymentConfirmation(paymentId, orderId, milestoneIdStr, "generic");
    }

    private void processPaymentConfirmation(String paymentId, String orderId, String milestoneIdStr, String producer) {
        if (milestoneIdStr == null || milestoneIdStr.isBlank()) {
            log.warn("Webhook event missing milestone_id. PaymentId: {}, OrderId: {}", paymentId, orderId);
            return;
        }

        UUID milestoneId;
        try {
            milestoneId = UUID.fromString(milestoneIdStr);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid milestone_id format: {}", milestoneIdStr);
            return;
        }

        // Idempotency check
        if (processedEventRepository.existsByEventId(paymentId)) {
            log.info("Payment {} already processed — skipping duplicate webhook", paymentId);
            auditService.log("WEBHOOK", paymentId,
                    AuditAction.DUPLICATE_EVENT_IGNORED, producer,
                    "Duplicate webhook ignored for payment: " + paymentId);
            return;
        }

        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(paymentId)
                .eventType("payment.released")
                .producer(producer)
                .build());

        milestoneService.confirmPaymentRelease(milestoneId, paymentId, orderId, producer + ":webhook");

        auditService.log("TRANSACTION", paymentId,
                AuditAction.PAYMENT_RELEASED, producer,
                String.format("Payment confirmed: %s for order %s, milestone %s", paymentId, orderId, milestoneId));
    }

    private void handleCaptureCompleted(JsonNode resource) {
        String captureId = resource.path("id").asText();
        String orderId   = resource.path("supplementary_data").path("related_ids").path("order_id").asText();
        String customId  = resource.path("custom_id").asText();

        // Fallback: order id may be embedded elsewhere
        if (orderId == null || orderId.isBlank()) {
            orderId = resource.path("links").path(0).path("href").asText();
        }

        // Idempotency check
        if (processedEventRepository.existsByEventId(captureId)) {
            log.info("Payment {} already processed — skipping duplicate webhook", captureId);
            auditService.log("WEBHOOK", captureId,
                    AuditAction.DUPLICATE_EVENT_IGNORED, "paypal",
                    "Duplicate capture webhook ignored for payment: " + captureId);
            return;
        }

        // Extract milestone_id from custom_id (set at order creation)
        String milestoneIdStr = customId;

        if (milestoneIdStr == null || milestoneIdStr.isBlank()) {
            log.warn("PAYMENT.CAPTURE.COMPLETED webhook missing milestone_id in custom_id. OrderId: {}", orderId);
            return;
        }

        UUID milestoneId;
        try {
            milestoneId = UUID.fromString(milestoneIdStr);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid milestone_id in custom_id: {}", milestoneIdStr);
            return;
        }

        // Mark as processed (idempotency insert)
        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(captureId)
                .eventType("PAYMENT.CAPTURE.COMPLETED")
                .producer("paypal")
                .build());

        // Confirm payment release
        milestoneService.confirmPaymentRelease(milestoneId, captureId, orderId, "paypal:webhook");

        auditService.log("TRANSACTION", captureId,
                AuditAction.PAYMENT_RELEASED, "paypal",
                String.format("Payment captured: %s for order %s, milestone %s",
                        captureId, orderId, milestoneId));
    }

    private void handleCaptureDenied(JsonNode resource) {
        String captureId = resource.path("id").asText();
        String orderId   = resource.path("supplementary_data").path("related_ids").path("order_id").asText();
        String status    = resource.path("status").asText("DENIED");
        String reason    = resource.path("status_details").path("reason").asText("Payment denied");

        if (processedEventRepository.existsByEventId("denied:" + captureId)) {
            log.info("Payment denial {} already processed", captureId);
            return;
        }

        processedEventRepository.save(ProcessedEvent.builder()
                .eventId("denied:" + captureId)
                .eventType("PAYMENT.CAPTURE.DENIED")
                .producer("paypal")
                .build());

        log.warn("Payment denied for order {}: [{}] {}", orderId, status, reason);

        auditService.log("TRANSACTION", captureId,
                AuditAction.PAYMENT_FAILED, "paypal",
                String.format("Payment denied: [%s] %s. OrderId: %s", status, reason, orderId));
    }
}

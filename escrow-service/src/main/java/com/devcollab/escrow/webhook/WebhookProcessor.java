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
 * Processes incoming Razorpay webhook events.
 *
 * Razorpay sends webhooks for:
 * - payment.captured  → release milestone, update transaction
 * - payment.failed    → mark milestone failed, update transaction
 * - order.paid        → (ignored, handled via payment.captured)
 *
 * Idempotency: uses razorpay_payment_id as event_id in ProcessedEvent table.
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
            String eventType = root.path("event").asText();
            JsonNode payload = root.path("payload");

            log.info("Processing Razorpay webhook event: {}", eventType);

            auditService.log("WEBHOOK", eventType,
                    AuditAction.WEBHOOK_RECEIVED, "razorpay",
                    "Webhook event received: " + eventType);

            switch (eventType) {
                case "payment.captured" -> handlePaymentCaptured(payload);
                case "payment.failed"   -> handlePaymentFailed(payload);
                default -> log.info("Ignoring unhandled webhook event type: {}", eventType);
            }

        } catch (Exception e) {
            log.error("Error processing webhook payload: {}", e.getMessage(), e);
            throw new RuntimeException("Webhook processing failed: " + e.getMessage(), e);
        }
    }

    private void handlePaymentCaptured(JsonNode payload) {
        JsonNode paymentEntity = payload.path("payment").path("entity");

        String paymentId = paymentEntity.path("id").asText();
        String orderId   = paymentEntity.path("order_id").asText();
        String notes     = paymentEntity.path("notes").toString();

        // Idempotency check
        if (processedEventRepository.existsByEventId(paymentId)) {
            log.info("Payment {} already processed — skipping duplicate webhook", paymentId);
            auditService.log("WEBHOOK", paymentId,
                    AuditAction.DUPLICATE_EVENT_IGNORED, "razorpay",
                    "Duplicate payment.captured webhook ignored for payment: " + paymentId);
            return;
        }

        // Extract milestone_id from Razorpay order notes
        String milestoneIdStr = null;
        try {
            JsonNode notesNode = objectMapper.readTree(notes);
            milestoneIdStr = notesNode.path("milestone_id").asText(null);
        } catch (Exception e) {
            log.warn("Could not parse order notes: {}", notes);
        }

        if (milestoneIdStr == null || milestoneIdStr.isBlank()) {
            log.warn("payment.captured webhook missing milestone_id in notes. OrderId: {}", orderId);
            return;
        }

        UUID milestoneId = UUID.fromString(milestoneIdStr);

        // Mark as processed (idempotency insert)
        processedEventRepository.save(ProcessedEvent.builder()
                .eventId(paymentId)
                .eventType("payment.captured")
                .producer("razorpay")
                .build());

        // Confirm payment release
        milestoneService.confirmPaymentRelease(milestoneId, paymentId, orderId, "razorpay:webhook");

        auditService.log("TRANSACTION", paymentId,
                AuditAction.PAYMENT_RELEASED, "razorpay",
                String.format("Payment captured: %s for order %s, milestone %s",
                        paymentId, orderId, milestoneId));
    }

    private void handlePaymentFailed(JsonNode payload) {
        JsonNode paymentEntity = payload.path("payment").path("entity");
        String paymentId = paymentEntity.path("id").asText();
        String orderId   = paymentEntity.path("order_id").asText();
        String errorCode = paymentEntity.path("error_code").asText("UNKNOWN");
        String errorDesc = paymentEntity.path("error_description").asText("Payment failed");

        if (processedEventRepository.existsByEventId("failed:" + paymentId)) {
            log.info("Payment failure {} already processed", paymentId);
            return;
        }

        processedEventRepository.save(ProcessedEvent.builder()
                .eventId("failed:" + paymentId)
                .eventType("payment.failed")
                .producer("razorpay")
                .build());

        log.warn("Payment failed for order {}: [{}] {}", orderId, errorCode, errorDesc);

        auditService.log("TRANSACTION", paymentId,
                AuditAction.PAYMENT_FAILED, "razorpay",
                String.format("Payment failed: [%s] %s. OrderId: %s", errorCode, errorDesc, orderId));
    }
}

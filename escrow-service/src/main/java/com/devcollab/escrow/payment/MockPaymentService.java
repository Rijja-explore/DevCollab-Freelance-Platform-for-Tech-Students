package com.devcollab.escrow.payment;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Mock/demo payment provider for local development and offline demos.
 *
 * Activated when {@code payment.provider=mock} (default when no real credentials).
 * Simulates order creation and capture without contacting any external gateway.
 */
@Service
@Slf4j
@ConditionalOnProperty(name = "payment.provider", havingValue = "mock", matchIfMissing = true)
public class MockPaymentService implements PaymentService {

    public static final String PROVIDER_NAME = "MOCK";

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public PaymentResult createOrder(PaymentRequest request) {
        String orderId = "MOCK_ORDER_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String approveUrl = "/mock-pay?orderId=" + orderId;

        log.info("MOCK payment order created for milestone {}: {}", request.getMilestoneId(), orderId);

        return PaymentResult.builder()
                .success(true)
                .orderId(orderId)
                .approveUrl(approveUrl)
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "USD")
                .status("CREATED")
                .build();
    }

    @Override
    public PaymentResult captureOrder(String orderId) {
        String captureId = "MOCK_CAP_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        log.info("MOCK payment captured for order {}: {}", orderId, captureId);

        return PaymentResult.builder()
                .success(true)
                .orderId(orderId)
                .paymentId(captureId)
                .status("COMPLETED")
                .build();
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String transmissionId, String transmissionTime,
                                          String certUrl, String authAlgo, String transmissionSig, String webhookId) {
        // Mock: require at least a transmission signature header to simulate
        // real signature enforcement. This keeps the missing-signature → 401
        // contract intact while allowing demo webhooks with any signature to pass.
        if (transmissionSig == null || transmissionSig.isBlank()) {
            log.warn("Mock webhook received without transmission signature — rejecting");
            return false;
        }
        log.debug("Mock webhook signature accepted (demo mode)");
        return true;
    }

    @Override
    public String toString() {
        return "MockPaymentService{" +
                "provider=" + PROVIDER_NAME +
                '}';
    }
}

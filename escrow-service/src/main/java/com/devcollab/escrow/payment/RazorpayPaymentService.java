package com.devcollab.escrow.payment;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Razorpay TEST MODE payment provider implementation.
 *
 * Activated when {@code payment.provider=razorpay}.
 *
 * HMAC-SHA256 verification computes the hex digest of (rawPayload, webhookSecret)
 * and compares it to the {@code X-Razorpay-Signature} header.
 */
@Service
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(name = "payment.provider", havingValue = "razorpay")
public class RazorpayPaymentService implements PaymentService {

    public static final String PROVIDER_NAME = "RAZORPAY";

    @Value("${razorpay.key-id:rzp_test_placeholder}")
    private String keyId;

    @Value("${razorpay.key-secret:rzp_secret_placeholder}")
    private String keySecret;

    @Value("${razorpay.webhook-secret:whsec_placeholder}")
    private String webhookSecret;

    @Value("${razorpay.currency:INR}")
    private String defaultCurrency;

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public PaymentResult createOrder(PaymentRequest request) {
        String orderId = "order_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        log.info("RAZORPAY test order created for milestone {}: {}", request.getMilestoneId(), orderId);

        return PaymentResult.builder()
                .success(true)
                .orderId(orderId)
                .approveUrl("https://checkout.razorpay.com/v1/checkout.js?order_id=" + orderId)
                .amount(request.getAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : defaultCurrency)
                .status("created")
                .build();
    }

    @Override
    public PaymentResult captureOrder(String orderId) {
        String paymentId = "pay_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        log.info("RAZORPAY payment captured for order {}: {}", orderId, paymentId);

        return PaymentResult.builder()
                .success(true)
                .orderId(orderId)
                .paymentId(paymentId)
                .status("captured")
                .build();
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String transmissionId, String transmissionTime,
                                           String certUrl, String authAlgo, String transmissionSig, String webhookId) {
        // In Razorpay flow, transmissionSig carries the X-Razorpay-Signature header value
        if (transmissionSig == null || transmissionSig.isBlank()) {
            log.warn("Missing Razorpay signature header");
            return false;
        }

        try {
            String expectedSignature = calculateHmacSha256(payload, webhookSecret);
            boolean match = expectedSignature.equalsIgnoreCase(transmissionSig);
            if (!match) {
                log.warn("Razorpay HMAC signature mismatch. Expected: {}, Received: {}", expectedSignature, transmissionSig);
            }
            return match;
        } catch (Exception e) {
            log.error("Error calculating Razorpay HMAC signature: {}", e.getMessage(), e);
            return false;
        }
    }

    public static String calculateHmacSha256(String data, String secret) throws Exception {
        Mac sha256Hmac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        sha256Hmac.init(secretKey);
        byte[] hash = sha256Hmac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}

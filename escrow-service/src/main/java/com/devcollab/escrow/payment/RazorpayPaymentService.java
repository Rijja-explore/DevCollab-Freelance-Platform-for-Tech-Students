package com.devcollab.escrow.payment;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Real Razorpay payment gateway integration.
 *
 * Order flow:
 * 1. createOrder() → creates a Razorpay order, returns orderId
 * 2. Frontend uses orderId + key to open Razorpay checkout
 * 3. On success, Razorpay posts webhook to /api/payments/webhook
 * 4. verifyWebhookSignature() validates the HMAC-SHA256 signature
 * 5. WebhookProcessor marks milestone released and publishes event
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class RazorpayPaymentService implements PaymentService {

    private final RazorpayClient razorpayClient;

    @Value("${razorpay.webhook-secret}")
    private String webhookSecret;

    @Value("${razorpay.currency}")
    private String defaultCurrency;

    /**
     * Create a Razorpay order.
     * Amount is in smallest currency unit (paise for INR).
     */
    @Override
    public PaymentResult createOrder(PaymentRequest request) {
        try {
            // Razorpay expects amount in paise (smallest unit): multiply by 100
            long amountInPaise = request.getAmount()
                    .multiply(BigDecimal.valueOf(100))
                    .setScale(0, RoundingMode.HALF_UP)
                    .longValue();

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", request.getCurrency() != null
                    ? request.getCurrency() : defaultCurrency);
            orderRequest.put("receipt", request.getIdempotencyKey());
            orderRequest.put("notes", new JSONObject()
                    .put("milestone_id", request.getMilestoneId().toString())
                    .put("description", request.getDescription()));

            log.info("Creating Razorpay order for milestone: {}, amount: {} paise",
                    request.getMilestoneId(), amountInPaise);

            Order order = razorpayClient.orders.create(orderRequest);

            log.info("Razorpay order created: {}", order.get("id"));

            return PaymentResult.builder()
                    .success(true)
                    .orderId(order.get("id").toString())
                    .amount(new BigDecimal(order.get("amount").toString())
                            .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP))
                    .currency(order.get("currency").toString())
                    .status(order.get("status").toString())
                    .build();

        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed for milestone {}: {}",
                    request.getMilestoneId(), e.getMessage());
            return PaymentResult.failure("Razorpay error: " + e.getMessage());
        }
    }

    /**
     * Verify payment signature for Razorpay Checkout flow.
     * HMAC-SHA256(orderId + "|" + paymentId, keySecret)
     */
    @Override
    public boolean verifyPayment(String orderId, String paymentId, String signature) {
        try {
            JSONObject attributes = new JSONObject();
            attributes.put("razorpay_order_id", orderId);
            attributes.put("razorpay_payment_id", paymentId);
            attributes.put("razorpay_signature", signature);
            Utils.verifyPaymentSignature(attributes, getKeySecret());
            return true;
        } catch (RazorpayException e) {
            log.warn("Payment signature verification failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Verify Razorpay webhook signature.
     * HMAC-SHA256(rawPayload, webhookSecret)
     */
    @Override
    public boolean verifyWebhookSignature(String payload, String razorpaySignature) {
        try {
            Utils.verifyWebhookSignature(payload, razorpaySignature, webhookSecret);
            log.debug("Webhook signature verified successfully");
            return true;
        } catch (RazorpayException e) {
            log.warn("Webhook HMAC verification failed: {}", e.getMessage());
            return false;
        }
    }

    private String getKeySecret() {
        // Read from same env var as injected into RazorpayClient
        return System.getenv("RAZORPAY_KEY_SECRET") != null
                ? System.getenv("RAZORPAY_KEY_SECRET")
                : "placeholder_secret";
    }
}

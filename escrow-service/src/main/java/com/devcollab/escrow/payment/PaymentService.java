package com.devcollab.escrow.payment;

/**
 * Payment gateway abstraction.
 * Allows swapping Razorpay for Stripe or other providers without touching service logic.
 */
public interface PaymentService {

    /**
     * Create a payment order with the provider.
     * Returns a PaymentResult with the order ID and status.
     */
    PaymentResult createOrder(PaymentRequest request);

    /**
     * Verify the payment after webhook confirmation.
     * Returns true if the payment is valid.
     */
    boolean verifyPayment(String orderId, String paymentId, String signature);

    /**
     * Verify webhook HMAC signature.
     * Returns true if the signature is valid.
     */
    boolean verifyWebhookSignature(String payload, String razorpaySignature);
}

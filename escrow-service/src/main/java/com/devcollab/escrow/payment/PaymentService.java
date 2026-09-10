package com.devcollab.escrow.payment;

import java.util.List;

/**
 * Gateway-agnostic payment abstraction.
 *
 * Payment abstraction used by PayPal Checkout and the local development mock.
 *
 * Implementations:
*  - {@link PayPalPaymentService}  — real PayPal Checkout Orders REST API (WebClient)
 *  - {@link MockPaymentService}    — offline/demo provider for local development
 */
public interface PaymentService {

    /**
     * Create a payment order with the provider.
     * Returns a PaymentResult with the order ID, approve URL, and status.
     */
    PaymentResult createOrder(PaymentRequest request);

    /**
     * Capture a previously created order (PayPal flow).
     * Called after the payer approves the payment on PayPal's site.
     *
     * @param orderId the provider order id
     * @return PaymentResult with capture status
     */
    PaymentResult captureOrder(String orderId);

    /**
     * Verify the provider webhook payload signature.
     * Returns true if the signature is valid.
     */
    boolean verifyWebhookSignature(String payload, String transmissionId, String transmissionTime,
                                   String certUrl, String authAlgo, String transmissionSig, String webhookId);

    /**
     * Returns the provider display name (e.g. "PAYPAL", "MOCK").
     */
    String getProviderName();

    /**
     * Returns the list of approved URLs (approval link) for a created order.
     * Used by the PayPal JS SDK flow.
     */
    default List<String> getApprovedLinks() {
        return List.of();
    }
}

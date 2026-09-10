package com.devcollab.escrow.webhook;

import com.devcollab.escrow.exception.InvalidSignatureException;
import com.devcollab.escrow.payment.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Verifies provider webhook signatures.
 *
 * For PayPal, verification uses the transmission headers:
 *  - PayPal-Transmission-Id
 *  - PayPal-Transmission-Time
 *  - PayPal-Cert-Url
 *  - PayPal-Auth-Algo
 *  - PayPal-Transmission-Sig
 *  - PayPal-Webhook-Id
 *
 * For the mock provider, verification always passes.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class WebhookVerifier {

    private final PaymentService paymentService;

    /**
     * Verifies the provider webhook signature.
     * Throws InvalidSignatureException if verification fails.
     *
     * @param rawPayload The raw request body (must be raw bytes, not parsed JSON)
     * @param transmissionId    PayPal-Transmission-Id header
     * @param transmissionTime  PayPal-Transmission-Time header
     * @param certUrl           PayPal-Cert-Url header
     * @param authAlgo          PayPal-Auth-Algo header
     * @param transmissionSig   PayPal-Transmission-Sig header
     * @param webhookId         PayPal-Webhook-Id header
     */
    public void verify(String rawPayload,
                       String transmissionId,
                       String transmissionTime,
                       String certUrl,
                       String authAlgo,
                       String transmissionSig,
                       String webhookId) {

        boolean valid = paymentService.verifyWebhookSignature(
                rawPayload, transmissionId, transmissionTime, certUrl,
                authAlgo, transmissionSig, webhookId);

        if (!valid) {
            log.warn("Webhook signature verification failed. Signature: {}", transmissionSig);
            throw new InvalidSignatureException("Webhook signature mismatch");
        }

        log.debug("Webhook signature verified successfully");
    }
}

package com.devcollab.escrow.webhook;

import com.devcollab.escrow.exception.InvalidSignatureException;
import com.devcollab.escrow.payment.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebhookVerifier {

    private final PaymentService paymentService;

    /**
     * Verifies the Razorpay webhook HMAC-SHA256 signature.
     * Throws InvalidSignatureException if verification fails.
     *
     * @param rawPayload The raw request body (must be raw bytes, not parsed JSON)
     * @param signature  X-Razorpay-Signature header value
     */
    public void verify(String rawPayload, String signature) {
        if (signature == null || signature.isBlank()) {
            log.warn("Webhook received without X-Razorpay-Signature header");
            throw new InvalidSignatureException("Missing X-Razorpay-Signature header");
        }

        boolean valid = paymentService.verifyWebhookSignature(rawPayload, signature);

        if (!valid) {
            log.warn("Webhook HMAC verification failed. Signature: {}", signature);
            throw new InvalidSignatureException("HMAC signature mismatch");
        }

        log.debug("Webhook signature verified successfully");
    }
}

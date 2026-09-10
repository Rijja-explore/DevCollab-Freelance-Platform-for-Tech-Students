package com.devcollab.escrow.exception;

import org.springframework.http.HttpStatus;

public class InvalidSignatureException extends EscrowException {

    public InvalidSignatureException(String detail) {
        super("Webhook signature verification failed: " + detail,
              HttpStatus.UNAUTHORIZED, "INVALID_WEBHOOK_SIGNATURE");
    }
}

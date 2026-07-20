package com.devcollab.escrow.exception;

import org.springframework.http.HttpStatus;

public class DuplicateReleaseException extends EscrowException {

    public DuplicateReleaseException(String milestoneId) {
        super(String.format("Payment for milestone %s has already been released or is in progress. " +
                            "Duplicate release requests are rejected.", milestoneId),
              HttpStatus.CONFLICT, "DUPLICATE_PAYMENT_RELEASE");
    }
}

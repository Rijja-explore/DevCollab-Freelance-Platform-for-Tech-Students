package com.devcollab.escrow.exception;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends EscrowException {

    public ResourceNotFoundException(String resource, String identifier) {
        super(String.format("%s not found with identifier: %s", resource, identifier),
              HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
    }
}

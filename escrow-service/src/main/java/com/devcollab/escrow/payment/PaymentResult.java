package com.devcollab.escrow.payment;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Builder
public class PaymentResult {

    private boolean success;
    private String orderId;
    private String paymentId;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String approveUrl;
    private List<String> approvedLinks;
    private String failureReason;

    public static PaymentResult failure(String reason) {
        return PaymentResult.builder()
                .success(false)
                .failureReason(reason)
                .build();
    }
}

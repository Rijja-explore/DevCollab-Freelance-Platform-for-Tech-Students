package com.devcollab.escrow.service;

import com.devcollab.escrow.dto.response.PageResponse;
import com.devcollab.escrow.dto.response.TransactionResponse;
import com.devcollab.escrow.entity.Transaction;
import com.devcollab.escrow.enums.TransactionStatus;
import com.devcollab.escrow.exception.EscrowException;
import com.devcollab.escrow.exception.ResourceNotFoundException;
import com.devcollab.escrow.mapper.TransactionMapper;
import com.devcollab.escrow.payment.PaymentResult;
import com.devcollab.escrow.payment.PaymentService;
import com.devcollab.escrow.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final TransactionMapper transactionMapper;
    private final PaymentService paymentService;
    private final MilestoneService milestoneService;

    public PageResponse<TransactionResponse> getAll(Pageable pageable) {
        Page<Transaction> transactions = transactionRepository.findAll(pageable);
        return PageResponse.from(transactions.map(transactionMapper::toResponse));
    }

    public TransactionResponse getById(UUID transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", transactionId.toString()));
        return transactionMapper.toResponse(transaction);
    }

    /** Captures an approved provider order and records the verified result. */
    @Transactional
    public TransactionResponse capture(UUID transactionId, String actor) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", transactionId.toString()));

        if (transaction.getStatus() == TransactionStatus.SUCCESS) return transactionMapper.toResponse(transaction);
        if (transaction.getStatus() != TransactionStatus.PENDING || transaction.getProviderOrderId() == null) {
            throw new EscrowException("Transaction cannot be captured in its current state",
                    HttpStatus.CONFLICT, "TRANSACTION_NOT_CAPTURABLE");
        }

        PaymentResult result = paymentService.captureOrder(transaction.getProviderOrderId());
        if (!result.isSuccess() || !"COMPLETED".equalsIgnoreCase(result.getStatus())) {
            transaction.setStatus(TransactionStatus.FAILED);
            transaction.setFailureReason(result.getFailureReason() != null
                    ? result.getFailureReason() : "Provider did not complete the payment capture");
            transactionRepository.save(transaction);
            throw new EscrowException(transaction.getFailureReason(), HttpStatus.BAD_GATEWAY, "PAYMENT_CAPTURE_FAILED");
        }

        milestoneService.confirmPaymentRelease(transaction.getMilestone().getId(), result.getPaymentId(),
                transaction.getProviderOrderId(), actor);
        return transactionMapper.toResponse(transactionRepository.findById(transactionId).orElseThrow());
    }

    public PageResponse<TransactionResponse> getByContractId(UUID contractId, Pageable pageable) {
        Page<Transaction> transactions = transactionRepository.findByContractId(contractId, pageable);
        return PageResponse.from(transactions.map(transactionMapper::toResponse));
    }
}

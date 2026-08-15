package com.devcollab.escrow.service;

import com.devcollab.escrow.dto.response.PageResponse;
import com.devcollab.escrow.dto.response.TransactionResponse;
import com.devcollab.escrow.entity.Transaction;
import com.devcollab.escrow.exception.ResourceNotFoundException;
import com.devcollab.escrow.mapper.TransactionMapper;
import com.devcollab.escrow.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final TransactionMapper transactionMapper;

    public PageResponse<TransactionResponse> getAll(Pageable pageable) {
        Page<Transaction> transactions = transactionRepository.findAll(pageable);
        return PageResponse.from(transactions.map(transactionMapper::toResponse));
    }

    public TransactionResponse getById(UUID transactionId) {
        Transaction transaction = transactionRepository.findById(transactionId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction", transactionId.toString()));
        return transactionMapper.toResponse(transaction);
    }

    public PageResponse<TransactionResponse> getByContractId(UUID contractId, Pageable pageable) {
        Page<Transaction> transactions = transactionRepository.findByContractId(contractId, pageable);
        return PageResponse.from(transactions.map(transactionMapper::toResponse));
    }
}

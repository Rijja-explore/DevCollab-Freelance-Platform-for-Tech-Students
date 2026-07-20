package com.devcollab.escrow.repository;

import com.devcollab.escrow.entity.Transaction;
import com.devcollab.escrow.enums.TransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    List<Transaction> findByMilestoneIdOrderByCreatedAtDesc(UUID milestoneId);

    Optional<Transaction> findByProviderOrderId(String providerOrderId);

    Optional<Transaction> findByProviderPaymentId(String providerPaymentId);

    Optional<Transaction> findByIdempotencyKey(String idempotencyKey);

    Page<Transaction> findByStatus(TransactionStatus status, Pageable pageable);

    boolean existsByMilestoneIdAndStatus(UUID milestoneId, TransactionStatus status);

    @Query("SELECT t FROM Transaction t WHERE t.milestone.contract.id = :contractId ORDER BY t.createdAt DESC")
    Page<Transaction> findByContractId(@Param("contractId") UUID contractId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.status = 'SUCCESS'")
    java.math.BigDecimal sumSuccessfulTransactions();
}

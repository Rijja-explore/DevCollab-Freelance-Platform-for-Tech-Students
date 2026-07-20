package com.devcollab.escrow.repository;

import com.devcollab.escrow.entity.Milestone;
import com.devcollab.escrow.enums.MilestoneStatus;
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
public interface MilestoneRepository extends JpaRepository<Milestone, UUID> {

    List<Milestone> findByContractIdOrderBySequenceOrder(UUID contractId);

    Page<Milestone> findByContractId(UUID contractId, Pageable pageable);

    Page<Milestone> findByStatus(MilestoneStatus status, Pageable pageable);

    Optional<Milestone> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdAndStatus(UUID id, MilestoneStatus status);

    @Query("SELECT COUNT(m) FROM Milestone m WHERE m.status = :status")
    long countByStatus(@Param("status") MilestoneStatus status);

    @Query("SELECT COALESCE(SUM(m.amount), 0) FROM Milestone m WHERE m.status = 'RELEASED'")
    java.math.BigDecimal sumReleasedMilestoneAmounts();

    @Query("SELECT m FROM Milestone m WHERE m.contract.id = :contractId AND m.status = :status ORDER BY m.sequenceOrder")
    List<Milestone> findByContractIdAndStatus(@Param("contractId") UUID contractId,
                                              @Param("status") MilestoneStatus status);

    @Query("SELECT COUNT(m) FROM Milestone m WHERE m.contract.id = :contractId AND m.status != 'RELEASED'")
    long countUnreleasedByContractId(@Param("contractId") UUID contractId);
}

package com.devcollab.escrow.repository;

import com.devcollab.escrow.entity.Milestone;
import com.devcollab.escrow.enums.MilestoneStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface MilestoneRepository extends JpaRepository<Milestone, UUID> {

    @Query("SELECT m FROM Milestone m WHERE m.contract.id = :contractId ORDER BY m.sequenceOrder")
    List<Milestone> findByContractIdOrderBySequenceOrder(@Param("contractId") UUID contractId);

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

    @Query("SELECT m FROM Milestone m WHERE m.contract.id = :contractId AND m.sequenceOrder < :sequenceOrder ORDER BY m.sequenceOrder ASC")
    List<Milestone> findPrecedingMilestones(
            @Param("contractId") UUID contractId,
            @Param("sequenceOrder") Integer sequenceOrder);

    @Query("SELECT m FROM Milestone m WHERE m.status IN :statuses AND m.dueDate < :today")
    List<Milestone> findOverdueMilestones(
            @Param("statuses") Collection<MilestoneStatus> statuses,
            @Param("today") LocalDate today);

    @Query("SELECT m FROM Milestone m WHERE m.status IN :statuses AND m.dueDate BETWEEN :start AND :end")
    List<Milestone> findUpcomingMilestones(
            @Param("statuses") Collection<MilestoneStatus> statuses,
            @Param("start") LocalDate start,
            @Param("end") LocalDate end);

    @Query("SELECT m FROM Milestone m WHERE m.status = 'SUBMITTED' AND m.submittedAt < :cutoff")
    List<Milestone> findPendingApprovalMilestones(@Param("cutoff") Instant cutoff);

    @Query("SELECT m FROM Milestone m WHERE m.status = 'APPROVED' AND m.approvedAt < :cutoff")
    List<Milestone> findPendingReleaseMilestones(@Param("cutoff") Instant cutoff);
}

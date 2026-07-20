package com.devcollab.escrow.repository;

import com.devcollab.escrow.entity.Contract;
import com.devcollab.escrow.enums.ContractStatus;
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
public interface ContractRepository extends JpaRepository<Contract, UUID> {

    Optional<Contract> findByIdAndStartupId(UUID id, UUID startupId);

    Optional<Contract> findByIdAndStudentId(UUID id, UUID studentId);

    Page<Contract> findByProjectId(UUID projectId, Pageable pageable);

    Page<Contract> findByStartupId(UUID startupId, Pageable pageable);

    Page<Contract> findByStudentId(UUID studentId, Pageable pageable);

    Page<Contract> findByStatus(ContractStatus status, Pageable pageable);

    boolean existsByProjectIdAndStatus(UUID projectId, ContractStatus status);

    @Query("SELECT c FROM Contract c WHERE c.projectId = :projectId ORDER BY c.createdAt DESC")
    List<Contract> findAllByProjectId(@Param("projectId") UUID projectId);

    @Query("SELECT COUNT(c) FROM Contract c WHERE c.status = :status")
    long countByStatus(@Param("status") ContractStatus status);

    @Query("SELECT COALESCE(SUM(c.totalAmount), 0) FROM Contract c WHERE c.status = 'COMPLETED'")
    java.math.BigDecimal sumCompletedContractAmounts();
}

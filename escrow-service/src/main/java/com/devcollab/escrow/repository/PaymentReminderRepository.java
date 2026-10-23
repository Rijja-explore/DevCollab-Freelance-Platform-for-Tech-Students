package com.devcollab.escrow.repository;

import com.devcollab.escrow.entity.PaymentReminder;
import com.devcollab.escrow.enums.ReminderType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface PaymentReminderRepository extends JpaRepository<PaymentReminder, UUID> {

    Page<PaymentReminder> findAllByOrderBySentAtDesc(Pageable pageable);

    List<PaymentReminder> findByMilestoneIdOrderBySentAtDesc(UUID milestoneId);

    List<PaymentReminder> findByContractIdOrderBySentAtDesc(UUID contractId);

    @Query("SELECT COUNT(r) > 0 FROM PaymentReminder r WHERE r.milestoneId = :milestoneId AND r.reminderType = :reminderType AND r.sentAt > :after")
    boolean existsRecentReminder(
            @Param("milestoneId") UUID milestoneId,
            @Param("reminderType") ReminderType reminderType,
            @Param("after") Instant after);
}


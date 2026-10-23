package com.devcollab.escrow.service;

import com.devcollab.escrow.audit.AuditAction;
import com.devcollab.escrow.audit.AuditService;
import com.devcollab.escrow.dto.response.PageResponse;
import com.devcollab.escrow.dto.response.ReminderExecutionSummary;
import com.devcollab.escrow.dto.response.ReminderResponse;
import com.devcollab.escrow.entity.Contract;
import com.devcollab.escrow.entity.Milestone;
import com.devcollab.escrow.entity.PaymentReminder;
import com.devcollab.escrow.enums.MilestoneStatus;
import com.devcollab.escrow.enums.ReminderType;
import com.devcollab.escrow.repository.MilestoneRepository;
import com.devcollab.escrow.repository.PaymentReminderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentReminderService {

    private final MilestoneRepository milestoneRepository;
    private final PaymentReminderRepository paymentReminderRepository;
    private final AuditService auditService;

    @Transactional
    public ReminderExecutionSummary processAllReminders() {
        log.info("Starting automated payment reminder scan...");

        Instant now = Instant.now();
        Instant oneDayAgo = now.minus(24, ChronoUnit.HOURS);
        LocalDate today = LocalDate.now();
        LocalDate twoDaysFromNow = today.plusDays(2);

        int overdueCount = 0;
        int upcomingCount = 0;
        int pendingApprovalCount = 0;
        int pendingReleaseCount = 0;

        // 1. Scan Overdue Milestones (due date passed and not yet submitted/released)
        List<Milestone> overdueMilestones = milestoneRepository.findOverdueMilestones(
                Set.of(MilestoneStatus.PENDING, MilestoneStatus.IN_PROGRESS), today);

        for (Milestone m : overdueMilestones) {
            if (!paymentReminderRepository.existsRecentReminder(m.getId(), ReminderType.OVERDUE_MILESTONE, oneDayAgo)) {
                Contract contract = m.getContract();
                String subject = String.format("[OVERDUE] Milestone '%s' deadline passed", m.getTitle());
                String message = String.format("Milestone '%s' (Contract '%s', Amount: %s %s) was due on %s. Please submit work or update the due date.",
                        m.getTitle(), contract.getTitle(), m.getAmount(), contract.getCurrency(), m.getDueDate());

                createReminder(m.getId(), contract.getId(), contract.getStudentId(), null,
                        ReminderType.OVERDUE_MILESTONE, subject, message);
                overdueCount++;
            }
        }

        // 2. Scan Upcoming Milestones (due within next 48 hours)
        List<Milestone> upcomingMilestones = milestoneRepository.findUpcomingMilestones(
                Set.of(MilestoneStatus.PENDING, MilestoneStatus.IN_PROGRESS), today, twoDaysFromNow);

        for (Milestone m : upcomingMilestones) {
            if (!paymentReminderRepository.existsRecentReminder(m.getId(), ReminderType.UPCOMING_DUE_DATE, oneDayAgo)) {
                Contract contract = m.getContract();
                String subject = String.format("[UPCOMING] Milestone '%s' due on %s", m.getTitle(), m.getDueDate());
                String message = String.format("Milestone '%s' (Contract '%s') is due in less than 48 hours (%s). Ensure deliverable is on track for submission.",
                        m.getTitle(), contract.getTitle(), m.getDueDate());

                createReminder(m.getId(), contract.getId(), contract.getStudentId(), null,
                        ReminderType.UPCOMING_DUE_DATE, subject, message);
                upcomingCount++;
            }
        }

        // 3. Scan Pending Approval Milestones (submitted > 48h ago and waiting for startup review)
        Instant submittedCutoff = now.minus(48, ChronoUnit.HOURS);
        List<Milestone> pendingApproval = milestoneRepository.findPendingApprovalMilestones(submittedCutoff);

        for (Milestone m : pendingApproval) {
            if (!paymentReminderRepository.existsRecentReminder(m.getId(), ReminderType.PENDING_APPROVAL_REMINDER, oneDayAgo)) {
                Contract contract = m.getContract();
                String subject = String.format("[REVIEW NEEDED] Milestone '%s' awaiting your approval", m.getTitle());
                String message = String.format("The deliverable for milestone '%s' was submitted over 48 hours ago. Please review and approve to initiate escrow payment release.",
                        m.getTitle());

                createReminder(m.getId(), contract.getId(), contract.getStartupId(), null,
                        ReminderType.PENDING_APPROVAL_REMINDER, subject, message);
                pendingApprovalCount++;
            }
        }

        // 4. Scan Pending Release Milestones (approved > 24h ago without payment release completed)
        Instant approvedCutoff = now.minus(24, ChronoUnit.HOURS);
        List<Milestone> pendingRelease = milestoneRepository.findPendingReleaseMilestones(approvedCutoff);

        for (Milestone m : pendingRelease) {
            if (!paymentReminderRepository.existsRecentReminder(m.getId(), ReminderType.PENDING_RELEASE_REMINDER, oneDayAgo)) {
                Contract contract = m.getContract();
                String subject = String.format("[ACTION REQUIRED] Release payment for milestone '%s'", m.getTitle());
                String message = String.format("Milestone '%s' is approved for payment of %s %s. Please finalize the escrow release transaction.",
                        m.getTitle(), m.getAmount(), contract.getCurrency());

                createReminder(m.getId(), contract.getId(), contract.getStartupId(), null,
                        ReminderType.PENDING_RELEASE_REMINDER, subject, message);
                pendingReleaseCount++;
            }
        }

        int total = overdueCount + upcomingCount + pendingApprovalCount + pendingReleaseCount;
        log.info("Payment reminder scan complete. Total reminders generated: {} (Overdue: {}, Upcoming: {}, Pending Approval: {}, Pending Release: {})",
                total, overdueCount, upcomingCount, pendingApprovalCount, pendingReleaseCount);

        return ReminderExecutionSummary.builder()
                .overdueRemindersSent(overdueCount)
                .upcomingRemindersSent(upcomingCount)
                .pendingApprovalRemindersSent(pendingApprovalCount)
                .pendingReleaseRemindersSent(pendingReleaseCount)
                .totalRemindersSent(total)
                .executedAt(now)
                .message("Payment reminder scan completed successfully")
                .build();
    }

    private void createReminder(UUID milestoneId, UUID contractId, UUID recipientId, String recipientEmail,
                                ReminderType type, String subject, String message) {
        PaymentReminder reminder = PaymentReminder.builder()
                .milestoneId(milestoneId)
                .contractId(contractId)
                .recipientId(recipientId)
                .recipientEmail(recipientEmail)
                .reminderType(type)
                .subject(subject)
                .message(message)
                .status("SENT")
                .build();

        paymentReminderRepository.save(reminder);

        auditService.log("MILESTONE", milestoneId.toString(),
                AuditAction.REMINDER_SENT, "scheduler",
                String.format("[%s] %s", type, subject));
    }

    @Transactional(readOnly = true)
    public PageResponse<ReminderResponse> getAllReminders(Pageable pageable) {
        Page<PaymentReminder> page = paymentReminderRepository.findAllByOrderBySentAtDesc(pageable);
        return PageResponse.from(page.map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public List<ReminderResponse> getRemindersForMilestone(UUID milestoneId) {
        return paymentReminderRepository.findByMilestoneIdOrderBySentAtDesc(milestoneId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ReminderResponse> getRemindersForContract(UUID contractId) {
        return paymentReminderRepository.findByContractIdOrderBySentAtDesc(contractId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private ReminderResponse toResponse(PaymentReminder r) {
        return ReminderResponse.builder()
                .id(r.getId())
                .milestoneId(r.getMilestoneId())
                .contractId(r.getContractId())
                .recipientId(r.getRecipientId())
                .recipientEmail(r.getRecipientEmail())
                .reminderType(r.getReminderType())
                .subject(r.getSubject())
                .message(r.getMessage())
                .status(r.getStatus())
                .sentAt(r.getSentAt())
                .build();
    }
}


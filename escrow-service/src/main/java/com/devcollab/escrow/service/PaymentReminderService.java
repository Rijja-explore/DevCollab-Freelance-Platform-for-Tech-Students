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
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentReminderService {

    /** Reminder row status when the email could not be delivered to anyone. */
    static final String STATUS_NOT_EMAILED = "NOT_EMAILED";

    private final MilestoneRepository milestoneRepository;
    private final PaymentReminderRepository paymentReminderRepository;
    private final AuditService auditService;
    private final ReminderEmailService reminderEmailService;

    @Transactional
    public ReminderExecutionSummary processAllReminders() {
        log.info("Starting automated payment reminder scan...");

        Instant now = Instant.now();
        Instant oneDayAgo = now.minus(24, ChronoUnit.HOURS);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate twoDaysFromNow = today.plusDays(2);
        Set<MilestoneStatus> openWork = Set.of(MilestoneStatus.PENDING, MilestoneStatus.IN_PROGRESS);

        int overdueCount = 0;
        int upcomingCount = 0;
        int pendingApprovalCount = 0;
        int pendingReleaseCount = 0;
        int emailsSent = 0;

        // 1. Overdue milestones (due date passed and work not yet submitted) → student
        for (Milestone m : milestoneRepository.findOverdueMilestones(openWork, today)) {
            if (!paymentReminderRepository.existsRecentReminder(m.getId(), ReminderType.OVERDUE_MILESTONE, oneDayAgo)) {
                Contract contract = m.getContract();
                String subject = String.format("[OVERDUE] Milestone '%s' deadline passed", m.getTitle());
                String message = String.format("Milestone '%s' (Contract '%s', Amount: %s %s) was due on %s. Please submit your deliverable or agree a new due date with the startup.",
                        m.getTitle(), contract.getTitle(), m.getAmount(), contract.getCurrency(), m.getDueDate());

                if (createReminder(m, contract.getStudentId(), contract.getStudentEmail(),
                        ReminderType.OVERDUE_MILESTONE, subject, message)) {
                    emailsSent++;
                }
                overdueCount++;
            }
        }

        // 2. Upcoming milestones (due within the next 48 hours) → student
        for (Milestone m : milestoneRepository.findUpcomingMilestones(openWork, today, twoDaysFromNow)) {
            if (!paymentReminderRepository.existsRecentReminder(m.getId(), ReminderType.UPCOMING_DUE_DATE, oneDayAgo)) {
                Contract contract = m.getContract();
                String subject = String.format("[UPCOMING] Milestone '%s' due on %s", m.getTitle(), m.getDueDate());
                String message = String.format("Milestone '%s' (Contract '%s') is due within 48 hours (%s). Make sure the deliverable is on track for submission.",
                        m.getTitle(), contract.getTitle(), m.getDueDate());

                if (createReminder(m, contract.getStudentId(), contract.getStudentEmail(),
                        ReminderType.UPCOMING_DUE_DATE, subject, message)) {
                    emailsSent++;
                }
                upcomingCount++;
            }
        }

        // 3. Submitted > 48h ago and still waiting for the startup's review → startup
        for (Milestone m : milestoneRepository.findPendingApprovalMilestones(now.minus(48, ChronoUnit.HOURS))) {
            if (!paymentReminderRepository.existsRecentReminder(m.getId(), ReminderType.PENDING_APPROVAL_REMINDER, oneDayAgo)) {
                Contract contract = m.getContract();
                String subject = String.format("[REVIEW NEEDED] Milestone '%s' awaiting your approval", m.getTitle());
                String message = String.format("The deliverable for milestone '%s' (Contract '%s') was submitted over 48 hours ago. Approve it to release %s %s from escrow, or request changes.",
                        m.getTitle(), contract.getTitle(), m.getAmount(), contract.getCurrency());

                if (createReminder(m, contract.getStartupId(), contract.getStartupEmail(),
                        ReminderType.PENDING_APPROVAL_REMINDER, subject, message)) {
                    emailsSent++;
                }
                pendingApprovalCount++;
            }
        }

        // 4. Approved > 24h ago but the payment has not completed (release failed or the
        //    PayPal order is still awaiting capture) → startup
        for (Milestone m : milestoneRepository.findPendingReleaseMilestones(
                Set.of(MilestoneStatus.APPROVED, MilestoneStatus.PAYMENT_PROCESSING, MilestoneStatus.FAILED),
                oneDayAgo)) {
            if (!paymentReminderRepository.existsRecentReminder(m.getId(), ReminderType.PENDING_RELEASE_REMINDER, oneDayAgo)) {
                Contract contract = m.getContract();
                String subject = String.format("[ACTION REQUIRED] Complete payment for milestone '%s'", m.getTitle());
                String detail = m.getStatus() == MilestoneStatus.PAYMENT_PROCESSING
                        ? "The payment order was created but has not been completed. Finish the PayPal checkout to release the funds."
                        : "The payment release has not gone through yet. Retry the release from the Milestones page.";
                String message = String.format("Milestone '%s' (Contract '%s') was approved for %s %s. %s",
                        m.getTitle(), contract.getTitle(), m.getAmount(), contract.getCurrency(), detail);

                if (createReminder(m, contract.getStartupId(), contract.getStartupEmail(),
                        ReminderType.PENDING_RELEASE_REMINDER, subject, message)) {
                    emailsSent++;
                }
                pendingReleaseCount++;
            }
        }

        int total = overdueCount + upcomingCount + pendingApprovalCount + pendingReleaseCount;
        log.info("Payment reminder scan complete. Reminders: {} (Overdue: {}, Upcoming: {}, Pending Approval: {}, Pending Release: {}), emails sent: {}",
                total, overdueCount, upcomingCount, pendingApprovalCount, pendingReleaseCount, emailsSent);

        return ReminderExecutionSummary.builder()
                .overdueRemindersSent(overdueCount)
                .upcomingRemindersSent(upcomingCount)
                .pendingApprovalRemindersSent(pendingApprovalCount)
                .pendingReleaseRemindersSent(pendingReleaseCount)
                .totalRemindersSent(total)
                .emailsSent(emailsSent)
                .executedAt(now)
                .message(total == 0
                        ? "Payment reminder scan completed — nothing needed a reminder"
                        : String.format("Payment reminder scan completed — %d reminder(s), %d email(s) sent", total, emailsSent))
                .build();
    }

    /** Records the reminder and emails it; returns true when the email was delivered. */
    private boolean createReminder(Milestone milestone, UUID recipientId, String recipientEmail,
                                   ReminderType type, String subject, String message) {
        ReminderEmailService.DeliveryStatus delivery = reminderEmailService.send(recipientEmail, subject, message);
        if (delivery == null) {
            delivery = ReminderEmailService.DeliveryStatus.DISABLED;
        }
        String status = switch (delivery) {
            case SENT -> "SENT";
            case FAILED -> "FAILED";
            default -> STATUS_NOT_EMAILED;
        };

        PaymentReminder reminder = PaymentReminder.builder()
                .milestoneId(milestone.getId())
                .contractId(milestone.getContract().getId())
                .recipientId(recipientId)
                .recipientEmail(recipientEmail)
                .reminderType(type)
                .subject(subject)
                .message(message)
                .status(status)
                .build();

        paymentReminderRepository.save(reminder);

        auditService.log("MILESTONE", milestone.getId().toString(),
                AuditAction.REMINDER_SENT, "scheduler",
                String.format("[%s] %s (email: %s)", type, subject, delivery));

        return delivery == ReminderEmailService.DeliveryStatus.SENT;
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

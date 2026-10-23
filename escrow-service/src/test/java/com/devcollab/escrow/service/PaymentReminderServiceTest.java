package com.devcollab.escrow.service;

import com.devcollab.escrow.audit.AuditService;
import com.devcollab.escrow.dto.response.ReminderExecutionSummary;
import com.devcollab.escrow.entity.Contract;
import com.devcollab.escrow.entity.Milestone;
import com.devcollab.escrow.entity.PaymentReminder;
import com.devcollab.escrow.enums.MilestoneStatus;
import com.devcollab.escrow.enums.ReminderType;
import com.devcollab.escrow.repository.MilestoneRepository;
import com.devcollab.escrow.repository.PaymentReminderRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("PaymentReminderService Unit Tests")
class PaymentReminderServiceTest {

    @Mock private MilestoneRepository milestoneRepository;
    @Mock private PaymentReminderRepository paymentReminderRepository;
    @Mock private AuditService auditService;

    @InjectMocks
    private PaymentReminderService paymentReminderService;

    private Contract contract;
    private Milestone overdueMilestone;
    private Milestone upcomingMilestone;
    private Milestone pendingApprovalMilestone;
    private Milestone pendingReleaseMilestone;

    @BeforeEach
    void setUp() {
        contract = Contract.builder()
                .id(UUID.randomUUID())
                .title("Mobile App Development")
                .startupId(UUID.randomUUID())
                .studentId(UUID.randomUUID())
                .currency("USD")
                .totalAmount(BigDecimal.valueOf(5000))
                .build();

        overdueMilestone = Milestone.builder()
                .id(UUID.randomUUID())
                .contract(contract)
                .title("Backend Architecture")
                .amount(BigDecimal.valueOf(1500))
                .status(MilestoneStatus.IN_PROGRESS)
                .dueDate(LocalDate.now().minusDays(3))
                .build();

        upcomingMilestone = Milestone.builder()
                .id(UUID.randomUUID())
                .contract(contract)
                .title("Frontend Integration")
                .amount(BigDecimal.valueOf(1500))
                .status(MilestoneStatus.IN_PROGRESS)
                .dueDate(LocalDate.now().plusDays(1))
                .build();

        pendingApprovalMilestone = Milestone.builder()
                .id(UUID.randomUUID())
                .contract(contract)
                .title("Database Setup")
                .amount(BigDecimal.valueOf(1000))
                .status(MilestoneStatus.SUBMITTED)
                .submittedAt(Instant.now().minusSeconds(180000)) // > 48h
                .build();

        pendingReleaseMilestone = Milestone.builder()
                .id(UUID.randomUUID())
                .contract(contract)
                .title("Security Audit")
                .amount(BigDecimal.valueOf(1000))
                .status(MilestoneStatus.APPROVED)
                .approvedAt(Instant.now().minusSeconds(100000)) // > 24h
                .build();
    }

    @Test
    @DisplayName("Should detect and send overdue reminders when milestone dueDate has passed")
    void processAllReminders_ShouldSendOverdueReminders() {
        given(milestoneRepository.findOverdueMilestones(anyCollection(), any(LocalDate.class)))
                .willReturn(List.of(overdueMilestone));
        given(milestoneRepository.findUpcomingMilestones(anyCollection(), any(LocalDate.class), any(LocalDate.class)))
                .willReturn(List.of());
        given(milestoneRepository.findPendingApprovalMilestones(any(Instant.class)))
                .willReturn(List.of());
        given(milestoneRepository.findPendingReleaseMilestones(any(Instant.class)))
                .willReturn(List.of());

        given(paymentReminderRepository.existsRecentReminder(eq(overdueMilestone.getId()), eq(ReminderType.OVERDUE_MILESTONE), any(Instant.class)))
                .willReturn(false);

        ReminderExecutionSummary summary = paymentReminderService.processAllReminders();

        assertThat(summary).isNotNull();
        assertThat(summary.getOverdueRemindersSent()).isEqualTo(1);
        assertThat(summary.getTotalRemindersSent()).isEqualTo(1);
        verify(paymentReminderRepository).save(any(PaymentReminder.class));
    }

    @Test
    @DisplayName("Should detect and send upcoming reminders when milestone is due within 48 hours")
    void processAllReminders_ShouldSendUpcomingReminders() {
        given(milestoneRepository.findOverdueMilestones(anyCollection(), any(LocalDate.class)))
                .willReturn(List.of());
        given(milestoneRepository.findUpcomingMilestones(anyCollection(), any(LocalDate.class), any(LocalDate.class)))
                .willReturn(List.of(upcomingMilestone));
        given(milestoneRepository.findPendingApprovalMilestones(any(Instant.class)))
                .willReturn(List.of());
        given(milestoneRepository.findPendingReleaseMilestones(any(Instant.class)))
                .willReturn(List.of());

        given(paymentReminderRepository.existsRecentReminder(eq(upcomingMilestone.getId()), eq(ReminderType.UPCOMING_DUE_DATE), any(Instant.class)))
                .willReturn(false);

        ReminderExecutionSummary summary = paymentReminderService.processAllReminders();

        assertThat(summary.getUpcomingRemindersSent()).isEqualTo(1);
        assertThat(summary.getTotalRemindersSent()).isEqualTo(1);
        verify(paymentReminderRepository).save(any(PaymentReminder.class));
    }

    @Test
    @DisplayName("Should suppress duplicate reminder if one was already sent recently")
    void processAllReminders_ShouldSuppressDuplicateReminders() {
        given(milestoneRepository.findOverdueMilestones(anyCollection(), any(LocalDate.class)))
                .willReturn(List.of(overdueMilestone));
        given(milestoneRepository.findUpcomingMilestones(anyCollection(), any(LocalDate.class), any(LocalDate.class)))
                .willReturn(List.of());
        given(milestoneRepository.findPendingApprovalMilestones(any(Instant.class)))
                .willReturn(List.of());
        given(milestoneRepository.findPendingReleaseMilestones(any(Instant.class)))
                .willReturn(List.of());

        // Already sent in last 24h
        given(paymentReminderRepository.existsRecentReminder(eq(overdueMilestone.getId()), eq(ReminderType.OVERDUE_MILESTONE), any(Instant.class)))
                .willReturn(true);

        ReminderExecutionSummary summary = paymentReminderService.processAllReminders();

        assertThat(summary.getOverdueRemindersSent()).isEqualTo(0);
        assertThat(summary.getTotalRemindersSent()).isEqualTo(0);
    }
}


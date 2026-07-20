package com.devcollab.escrow.service;

import com.devcollab.escrow.audit.AuditService;
import com.devcollab.escrow.entity.Contract;
import com.devcollab.escrow.entity.Milestone;
import com.devcollab.escrow.entity.Transaction;
import com.devcollab.escrow.enums.ContractStatus;
import com.devcollab.escrow.enums.MilestoneStatus;
import com.devcollab.escrow.enums.TransactionStatus;
import com.devcollab.escrow.exception.DuplicateReleaseException;
import com.devcollab.escrow.exception.EscrowException;
import com.devcollab.escrow.mapper.MilestoneMapper;
import com.devcollab.escrow.payment.PaymentResult;
import com.devcollab.escrow.payment.PaymentService;
import com.devcollab.escrow.rabbitmq.EventPublisher;
import com.devcollab.escrow.repository.ContractRepository;
import com.devcollab.escrow.repository.MilestoneRepository;
import com.devcollab.escrow.repository.TransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MilestoneService Unit Tests")
class MilestoneServiceTest {

    @Mock private MilestoneRepository milestoneRepository;
    @Mock private ContractRepository contractRepository;
    @Mock private TransactionRepository transactionRepository;
    @Mock private MilestoneMapper milestoneMapper;
    @Mock private AuditService auditService;
    @Mock private PaymentService paymentService;
    @Mock private EventPublisher eventPublisher;

    @InjectMocks
    private MilestoneService milestoneService;

    private Contract contract;
    private Milestone milestone;

    @BeforeEach
    void setUp() {
        contract = Contract.builder()
                .id(UUID.randomUUID())
                .projectId(UUID.randomUUID())
                .startupId(UUID.randomUUID())
                .studentId(UUID.randomUUID())
                .totalAmount(new BigDecimal("10000.00"))
                .currency("INR")
                .status(ContractStatus.ACTIVE)
                .build();

        milestone = Milestone.builder()
                .id(UUID.randomUUID())
                .contract(contract)
                .title("Phase 1 Delivery")
                .amount(new BigDecimal("2500.00"))
                .sequenceOrder(1)
                .status(MilestoneStatus.APPROVED)
                .build();
    }

    @Test
    @DisplayName("Should reject release when milestone is already RELEASED")
    void releaseMilestone_ShouldThrow_WhenAlreadyReleased() {
        // Given
        milestone.setStatus(MilestoneStatus.RELEASED);
        given(milestoneRepository.findById(milestone.getId()))
                .willReturn(Optional.of(milestone));

        // When / Then
        assertThatThrownBy(() -> milestoneService.releaseMilestone(milestone.getId(), "startup@test.com"))
                .isInstanceOf(DuplicateReleaseException.class);

        then(paymentService).should(never()).createOrder(any());
    }

    @Test
    @DisplayName("Should reject release when payment is already PROCESSING")
    void releaseMilestone_ShouldThrow_WhenPaymentInProgress() {
        // Given
        milestone.setStatus(MilestoneStatus.PAYMENT_PROCESSING);
        given(milestoneRepository.findById(milestone.getId()))
                .willReturn(Optional.of(milestone));

        // When / Then
        assertThatThrownBy(() -> milestoneService.releaseMilestone(milestone.getId(), "startup@test.com"))
                .isInstanceOf(EscrowException.class)
                .hasMessageContaining("already being processed");
    }

    @Test
    @DisplayName("Should reject release when milestone is not APPROVED")
    void releaseMilestone_ShouldThrow_WhenNotApproved() {
        // Given
        milestone.setStatus(MilestoneStatus.PENDING);
        given(milestoneRepository.findById(milestone.getId()))
                .willReturn(Optional.of(milestone));

        // When / Then
        assertThatThrownBy(() -> milestoneService.releaseMilestone(milestone.getId(), "startup@test.com"))
                .isInstanceOf(EscrowException.class)
                .hasMessageContaining("APPROVED milestones");
    }

    @Test
    @DisplayName("Should reject release when successful transaction already exists (idempotency)")
    void releaseMilestone_ShouldThrow_WhenSuccessfulTransactionExists() {
        // Given
        given(milestoneRepository.findById(milestone.getId()))
                .willReturn(Optional.of(milestone));
        given(transactionRepository.existsByMilestoneIdAndStatus(
                milestone.getId(), TransactionStatus.SUCCESS))
                .willReturn(true);

        // When / Then
        assertThatThrownBy(() -> milestoneService.releaseMilestone(milestone.getId(), "startup@test.com"))
                .isInstanceOf(DuplicateReleaseException.class);
    }

    @Test
    @DisplayName("Should create Razorpay order and transition to PAYMENT_PROCESSING on success")
    void releaseMilestone_ShouldCreateOrder_WhenApproved() {
        // Given
        given(milestoneRepository.findById(milestone.getId())).willReturn(Optional.of(milestone));
        given(transactionRepository.existsByMilestoneIdAndStatus(any(), any())).willReturn(false);
        given(paymentService.createOrder(any())).willReturn(PaymentResult.builder()
                .success(true)
                .orderId("order_test_123")
                .amount(new BigDecimal("2500.00"))
                .currency("INR")
                .status("created")
                .build());
        given(transactionRepository.save(any(Transaction.class))).willAnswer(inv -> inv.getArgument(0));
        given(milestoneRepository.save(any(Milestone.class))).willAnswer(inv -> inv.getArgument(0));
        given(milestoneMapper.toResponse(any(Milestone.class))).willReturn(
                com.devcollab.escrow.dto.response.MilestoneResponse.builder()
                        .id(milestone.getId())
                        .status(MilestoneStatus.PAYMENT_PROCESSING)
                        .build());

        // When
        var result = milestoneService.releaseMilestone(milestone.getId(), "startup@test.com");

        // Then
        assertThat(result).isNotNull();
        then(paymentService).should().createOrder(any());
        then(transactionRepository).should().save(argThat(tx ->
                tx.getStatus() == TransactionStatus.PENDING));
        then(milestoneRepository).should().save(argThat(m ->
                m.getStatus() == MilestoneStatus.PAYMENT_PROCESSING));
    }

    @Test
    @DisplayName("Should mark milestone FAILED when Razorpay order creation fails")
    void releaseMilestone_ShouldMarkFailed_WhenRazorpayFails() {
        // Given
        given(milestoneRepository.findById(milestone.getId())).willReturn(Optional.of(milestone));
        given(transactionRepository.existsByMilestoneIdAndStatus(any(), any())).willReturn(false);
        given(paymentService.createOrder(any())).willReturn(PaymentResult.failure("Razorpay connection error"));
        given(transactionRepository.save(any(Transaction.class))).willAnswer(inv -> inv.getArgument(0));
        given(milestoneRepository.save(any(Milestone.class))).willAnswer(inv -> inv.getArgument(0));
        given(milestoneMapper.toResponse(any(Milestone.class))).willReturn(
                com.devcollab.escrow.dto.response.MilestoneResponse.builder()
                        .id(milestone.getId())
                        .status(MilestoneStatus.FAILED)
                        .build());

        // When
        var result = milestoneService.releaseMilestone(milestone.getId(), "startup@test.com");

        // Then
        then(transactionRepository).should().save(argThat(tx ->
                tx.getStatus() == TransactionStatus.FAILED));
        then(milestoneRepository).should().save(argThat(m ->
                m.getStatus() == MilestoneStatus.FAILED));
        then(eventPublisher).should().publishPaymentFailed(any());
    }
}

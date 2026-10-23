package com.devcollab.escrow.service;

import com.devcollab.escrow.audit.AuditService;
import com.devcollab.escrow.dto.request.DisputeMilestoneRequest;
import com.devcollab.escrow.dto.request.RequestChangesRequest;
import com.devcollab.escrow.dto.request.ResolveDisputeRequest;
import com.devcollab.escrow.dto.request.SubmitMilestoneRequest;
import com.devcollab.escrow.dto.response.MilestoneResponse;
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
import java.util.List;
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
    @DisplayName("Should return existing milestone safely when milestone is already RELEASED")
    void releaseMilestone_ShouldReturnExisting_WhenAlreadyReleased() {
        milestone.setStatus(MilestoneStatus.RELEASED);
        given(milestoneRepository.findById(milestone.getId()))
                .willReturn(Optional.of(milestone));
        given(milestoneMapper.toResponse(milestone))
                .willReturn(MilestoneResponse.builder()
                        .id(milestone.getId())
                        .status(MilestoneStatus.RELEASED)
                        .build());

        var response = milestoneService.releaseMilestone(milestone.getId(), "startup@test.com");

        assertThat(response).isNotNull();
        assertThat(response.getStatus()).isEqualTo(MilestoneStatus.RELEASED);
        then(paymentService).should(never()).createOrder(any());
    }

    @Test
    @DisplayName("Should reject release when payment is already PROCESSING")
    void releaseMilestone_ShouldThrow_WhenPaymentInProgress() {
        milestone.setStatus(MilestoneStatus.PAYMENT_PROCESSING);
        given(milestoneRepository.findById(milestone.getId())).willReturn(Optional.of(milestone));

        assertThatThrownBy(() -> milestoneService.releaseMilestone(milestone.getId(), "startup@test.com"))
                .isInstanceOf(EscrowException.class)
                .hasMessageContaining("already being processed");
    }

    @Test
    @DisplayName("Should reject release when milestone is not APPROVED")
    void releaseMilestone_ShouldThrow_WhenMilestoneNotApproved() {
        milestone.setStatus(MilestoneStatus.IN_PROGRESS);
        given(milestoneRepository.findById(milestone.getId())).willReturn(Optional.of(milestone));

        assertThatThrownBy(() -> milestoneService.releaseMilestone(milestone.getId(), "startup@test.com"))
                .isInstanceOf(EscrowException.class)
                .hasMessageContaining("APPROVED milestones");
    }

    @Test
    @DisplayName("Should reject release when successful transaction already exists (idempotency)")
    void releaseMilestone_ShouldThrow_WhenSuccessfulTransactionExists() {
        given(milestoneRepository.findById(milestone.getId())).willReturn(Optional.of(milestone));
        given(transactionRepository.existsByMilestoneIdAndStatus(milestone.getId(), TransactionStatus.SUCCESS))
                .willReturn(true);

        assertThatThrownBy(() -> milestoneService.releaseMilestone(milestone.getId(), "startup@test.com"))
                .isInstanceOf(DuplicateReleaseException.class);
    }

    @Test
    @DisplayName("Should create payment order and transition to PAYMENT_PROCESSING on success")
    void releaseMilestone_ShouldCreateOrder_WhenApproved() {
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
                MilestoneResponse.builder()
                        .id(milestone.getId())
                        .status(MilestoneStatus.PAYMENT_PROCESSING)
                        .build());

        var result = milestoneService.releaseMilestone(milestone.getId(), "startup@test.com");

        assertThat(result).isNotNull();
        then(paymentService).should().createOrder(any());
        then(transactionRepository).should().save(argThat(tx -> tx.getStatus() == TransactionStatus.PENDING));
        then(milestoneRepository).should().save(argThat(m -> m.getStatus() == MilestoneStatus.PAYMENT_PROCESSING));
    }

    @Test
    @DisplayName("Should mark milestone FAILED when payment order creation fails")
    void releaseMilestone_ShouldMarkFailed_WhenProviderFails() {
        given(milestoneRepository.findById(milestone.getId())).willReturn(Optional.of(milestone));
        given(transactionRepository.existsByMilestoneIdAndStatus(any(), any())).willReturn(false);
        given(paymentService.createOrder(any())).willReturn(PaymentResult.failure("Payment provider connection error"));
        given(transactionRepository.save(any(Transaction.class))).willAnswer(inv -> inv.getArgument(0));
        given(milestoneRepository.save(any(Milestone.class))).willAnswer(inv -> inv.getArgument(0));
        given(milestoneMapper.toResponse(any(Milestone.class))).willReturn(
                MilestoneResponse.builder()
                        .id(milestone.getId())
                        .status(MilestoneStatus.FAILED)
                        .build());

        var result = milestoneService.releaseMilestone(milestone.getId(), "startup@test.com");

        then(transactionRepository).should().save(argThat(tx -> tx.getStatus() == TransactionStatus.FAILED));
        then(milestoneRepository).should().save(argThat(m -> m.getStatus() == MilestoneStatus.FAILED));
        then(eventPublisher).should().publishPaymentFailed(any());
    }

    @Test
    @DisplayName("Should start milestone and record started_at")
    void startMilestone_ShouldTransitionToInProgress() {
        milestone.setStatus(MilestoneStatus.PENDING);
        given(milestoneRepository.findById(milestone.getId())).willReturn(Optional.of(milestone));
        given(milestoneMapper.toResponse(any())).willReturn(
                MilestoneResponse.builder()
                        .id(milestone.getId())
                        .status(MilestoneStatus.IN_PROGRESS)
                        .build());

        var result = milestoneService.startMilestone(milestone.getId(), "student@test.com");

        assertThat(result.getStatus()).isEqualTo(MilestoneStatus.IN_PROGRESS);
        assertThat(milestone.getStatus()).isEqualTo(MilestoneStatus.IN_PROGRESS);
        assertThat(milestone.getStartedAt()).isNotNull();
        then(milestoneRepository).should().save(milestone);
    }

    @Test
    @DisplayName("Should submit milestone deliverable and update status to SUBMITTED")
    void submitMilestone_ShouldSetDeliverableAndSubmittedStatus() {
        milestone.setStatus(MilestoneStatus.IN_PROGRESS);
        given(milestoneRepository.findById(milestone.getId())).willReturn(Optional.of(milestone));
        given(milestoneMapper.toResponse(any())).willReturn(
                MilestoneResponse.builder()
                        .id(milestone.getId())
                        .status(MilestoneStatus.SUBMITTED)
                        .build());

        SubmitMilestoneRequest request = SubmitMilestoneRequest.builder()
                .deliverableUrl("https://github.com/devcollab/pull/1")
                .submissionNotes("Completed Phase 1 with tests")
                .build();

        var result = milestoneService.submitMilestone(milestone.getId(), request, "student@test.com");

        assertThat(result.getStatus()).isEqualTo(MilestoneStatus.SUBMITTED);
        assertThat(milestone.getStatus()).isEqualTo(MilestoneStatus.SUBMITTED);
        assertThat(milestone.getDeliverableUrl()).isEqualTo("https://github.com/devcollab/pull/1");
        assertThat(milestone.getSubmittedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should request changes, increment revision count and reset to IN_PROGRESS")
    void requestChanges_ShouldIncrementRevisionsAndResetStatus() {
        milestone.setStatus(MilestoneStatus.SUBMITTED);
        milestone.setRevisionCount(0);
        given(milestoneRepository.findById(milestone.getId())).willReturn(Optional.of(milestone));
        given(milestoneMapper.toResponse(any())).willReturn(
                MilestoneResponse.builder()
                        .id(milestone.getId())
                        .status(MilestoneStatus.IN_PROGRESS)
                        .revisionCount(1)
                        .build());

        RequestChangesRequest request = RequestChangesRequest.builder()
                .reviewFeedback("Please add unit test coverage for the payment endpoint")
                .build();

        var result = milestoneService.requestChanges(milestone.getId(), request, "startup@test.com");

        assertThat(milestone.getStatus()).isEqualTo(MilestoneStatus.IN_PROGRESS);
        assertThat(milestone.getRevisionCount()).isEqualTo(1);
        assertThat(milestone.getReviewFeedback()).contains("Please add unit test coverage");
    }

    @Test
    @DisplayName("Should enforce sequential release and reject milestone 2 if milestone 1 is not released")
    void sequentialRelease_ShouldRejectWhenPrecedingMilestoneNotReleased() {
        Milestone milestone2 = Milestone.builder()
                .id(UUID.randomUUID())
                .contract(contract)
                .title("Phase 2")
                .sequenceOrder(2)
                .status(MilestoneStatus.SUBMITTED)
                .build();

        Milestone milestone1 = Milestone.builder()
                .id(UUID.randomUUID())
                .contract(contract)
                .title("Phase 1")
                .sequenceOrder(1)
                .status(MilestoneStatus.IN_PROGRESS) // Not yet RELEASED!
                .build();

        given(milestoneRepository.findById(milestone2.getId())).willReturn(Optional.of(milestone2));
        given(milestoneRepository.findPrecedingMilestones(contract.getId(), 2))
                .willReturn(List.of(milestone1));

        assertThatThrownBy(() -> milestoneService.approveMilestone(milestone2.getId(), UUID.randomUUID(), "startup@test.com"))
                .isInstanceOf(EscrowException.class)
                .hasMessageContaining("cannot be released/approved before preceding milestone")
                .extracting(ex -> ((EscrowException) ex).getErrorCode())
                .isEqualTo("SEQUENTIAL_RELEASE_VIOLATION");
    }

    @Test
    @DisplayName("Should raise dispute and update contract status to DISPUTED")
    void disputeMilestone_ShouldSetDisputeStatus() {
        milestone.setStatus(MilestoneStatus.SUBMITTED);
        given(milestoneRepository.findById(milestone.getId())).willReturn(Optional.of(milestone));
        given(milestoneMapper.toResponse(any())).willReturn(
                MilestoneResponse.builder()
                        .id(milestone.getId())
                        .status(MilestoneStatus.DISPUTED)
                        .build());

        DisputeMilestoneRequest request = DisputeMilestoneRequest.builder()
                .reason("Deliverable does not meet scope requirements")
                .build();

        var result = milestoneService.disputeMilestone(milestone.getId(), request, "startup@test.com");

        assertThat(milestone.getStatus()).isEqualTo(MilestoneStatus.DISPUTED);
        assertThat(contract.getStatus()).isEqualTo(ContractStatus.DISPUTED);
        assertThat(milestone.getDisputeReason()).contains("Deliverable does not meet scope");
    }

    @Test
    @DisplayName("Should resolve dispute and unfreeze contract")
    void resolveDispute_ShouldResolveAndRestoreContract() {
        milestone.setStatus(MilestoneStatus.DISPUTED);
        given(milestoneRepository.findById(milestone.getId())).willReturn(Optional.of(milestone));
        given(milestoneRepository.countUnreleasedByContractId(contract.getId())).willReturn(1L);
        given(milestoneMapper.toResponse(any())).willReturn(
                MilestoneResponse.builder()
                        .id(milestone.getId())
                        .status(MilestoneStatus.IN_PROGRESS)
                        .build());

        ResolveDisputeRequest request = ResolveDisputeRequest.builder()
                .resolution("REOPEN")
                .resolutionNotes("Parties agreed to revise requirements")
                .build();

        var result = milestoneService.resolveDispute(milestone.getId(), request, "admin@test.com");

        assertThat(milestone.getStatus()).isEqualTo(MilestoneStatus.IN_PROGRESS);
        assertThat(contract.getStatus()).isEqualTo(ContractStatus.ACTIVE);
        assertThat(milestone.getDisputeResolution()).isEqualTo("REOPEN");
    }
}

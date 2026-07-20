package com.devcollab.escrow.service;

import com.devcollab.escrow.audit.AuditAction;
import com.devcollab.escrow.audit.AuditService;
import com.devcollab.escrow.dto.request.CreateMilestoneRequest;
import com.devcollab.escrow.dto.request.UpdateMilestoneRequest;
import com.devcollab.escrow.dto.response.MilestoneResponse;
import com.devcollab.escrow.dto.response.PageResponse;
import com.devcollab.escrow.entity.Contract;
import com.devcollab.escrow.entity.Milestone;
import com.devcollab.escrow.entity.Transaction;
import com.devcollab.escrow.enums.ContractStatus;
import com.devcollab.escrow.enums.MilestoneStatus;
import com.devcollab.escrow.enums.TransactionStatus;
import com.devcollab.escrow.events.PaymentFailedEvent;
import com.devcollab.escrow.events.PaymentReleasedEvent;
import com.devcollab.escrow.exception.DuplicateReleaseException;
import com.devcollab.escrow.exception.EscrowException;
import com.devcollab.escrow.exception.ResourceNotFoundException;
import com.devcollab.escrow.mapper.MilestoneMapper;
import com.devcollab.escrow.payment.PaymentRequest;
import com.devcollab.escrow.payment.PaymentResult;
import com.devcollab.escrow.payment.PaymentService;
import com.devcollab.escrow.rabbitmq.EventPublisher;
import com.devcollab.escrow.repository.ContractRepository;
import com.devcollab.escrow.repository.MilestoneRepository;
import com.devcollab.escrow.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class MilestoneService {

    private final MilestoneRepository milestoneRepository;
    private final ContractRepository contractRepository;
    private final TransactionRepository transactionRepository;
    private final MilestoneMapper milestoneMapper;
    private final AuditService auditService;
    private final PaymentService paymentService;
    private final EventPublisher eventPublisher;

    @Transactional
    public MilestoneResponse createMilestone(CreateMilestoneRequest request, String actor) {
        Contract contract = contractRepository.findById(request.getContractId())
                .orElseThrow(() -> new ResourceNotFoundException("Contract", request.getContractId().toString()));

        if (contract.getStatus() != ContractStatus.ACTIVE) {
            throw new EscrowException("Milestones can only be added to ACTIVE contracts",
                    HttpStatus.BAD_REQUEST, "CONTRACT_NOT_ACTIVE");
        }

        Milestone milestone = Milestone.builder()
                .contract(contract)
                .title(request.getTitle())
                .description(request.getDescription())
                .amount(request.getAmount())
                .sequenceOrder(request.getSequenceOrder())
                .dueDate(request.getDueDate())
                .status(MilestoneStatus.PENDING)
                .build();

        milestone = milestoneRepository.save(milestone);

        auditService.log("MILESTONE", milestone.getId().toString(),
                AuditAction.MILESTONE_CREATED, actor,
                String.format("Milestone '%s' created for contract %s",
                        milestone.getTitle(), contract.getId()));

        return milestoneMapper.toResponse(milestone);
    }

    public MilestoneResponse getById(UUID milestoneId) {
        return milestoneMapper.toResponse(findMilestoneOrThrow(milestoneId));
    }

    public PageResponse<MilestoneResponse> getAll(Pageable pageable) {
        Page<Milestone> milestones = milestoneRepository.findAll(pageable);
        return PageResponse.from(milestones.map(milestoneMapper::toResponse));
    }

    @Transactional
    public MilestoneResponse updateMilestone(UUID milestoneId, UpdateMilestoneRequest request, String actor) {
        Milestone milestone = findMilestoneOrThrow(milestoneId);

        if (milestone.getStatus() == MilestoneStatus.RELEASED) {
            throw new EscrowException("Released milestones cannot be modified",
                    HttpStatus.BAD_REQUEST, "MILESTONE_ALREADY_RELEASED");
        }

        if (request.getTitle() != null) milestone.setTitle(request.getTitle());
        if (request.getDescription() != null) milestone.setDescription(request.getDescription());
        if (request.getDueDate() != null) milestone.setDueDate(request.getDueDate());

        milestone = milestoneRepository.save(milestone);
        return milestoneMapper.toResponse(milestone);
    }

    /**
     * Startup approves a milestone, triggering payment processing.
     *
     * Guards:
     * - Only SUBMITTED milestones can be approved
     * - Idempotency: if already in PAYMENT_PROCESSING or RELEASED, reject
     */
    @Transactional
    public MilestoneResponse approveMilestone(UUID milestoneId, UUID approvedBy, String actor) {
        Milestone milestone = findMilestoneOrThrow(milestoneId);

        // Idempotency check — reject if already approved/in-progress/released
        if (milestone.getStatus() == MilestoneStatus.PAYMENT_PROCESSING ||
            milestone.getStatus() == MilestoneStatus.RELEASED) {
            throw new DuplicateReleaseException(milestoneId.toString());
        }

        if (milestone.getStatus() != MilestoneStatus.SUBMITTED &&
            milestone.getStatus() != MilestoneStatus.IN_PROGRESS &&
            milestone.getStatus() != MilestoneStatus.PENDING) {
            throw new EscrowException(
                    String.format("Cannot approve milestone in status: %s", milestone.getStatus()),
                    HttpStatus.BAD_REQUEST, "INVALID_MILESTONE_STATUS");
        }

        // Create idempotency key: milestoneId + approve to prevent double approval
        String idempotencyKey = "approve:" + milestoneId.toString();

        if (milestoneRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            throw new DuplicateReleaseException(milestoneId.toString());
        }

        milestone.setStatus(MilestoneStatus.APPROVED);
        milestone.setApprovedBy(approvedBy);
        milestone.setApprovedAt(Instant.now());
        milestone.setIdempotencyKey(idempotencyKey);
        milestoneRepository.save(milestone);

        auditService.log("MILESTONE", milestoneId.toString(),
                AuditAction.MILESTONE_APPROVED, actor,
                String.format("Milestone '%s' approved. Ready for payment release.", milestone.getTitle()));

        return milestoneMapper.toResponse(milestone);
    }

    /**
     * Release payment for an approved milestone via Razorpay.
     *
     * This method:
     * 1. Validates milestone is APPROVED (not already released)
     * 2. Checks no pending/successful transaction exists (idempotency)
     * 3. Creates Razorpay order
     * 4. Creates Transaction record
     * 5. Updates milestone to PAYMENT_PROCESSING
     */
    @Transactional
    public MilestoneResponse releaseMilestone(UUID milestoneId, String actor) {
        Milestone milestone = findMilestoneOrThrow(milestoneId);

        // Hard guard: cannot release twice
        if (milestone.getStatus() == MilestoneStatus.RELEASED) {
            throw new DuplicateReleaseException(milestoneId.toString());
        }

        if (milestone.getStatus() == MilestoneStatus.PAYMENT_PROCESSING) {
            throw new EscrowException("Payment is already being processed for this milestone",
                    HttpStatus.CONFLICT, "PAYMENT_IN_PROGRESS");
        }

        if (milestone.getStatus() != MilestoneStatus.APPROVED) {
            throw new EscrowException(
                    "Only APPROVED milestones can have payments released. Current status: " + milestone.getStatus(),
                    HttpStatus.BAD_REQUEST, "MILESTONE_NOT_APPROVED");
        }

        // Check for existing successful transaction (idempotency at transaction level)
        if (transactionRepository.existsByMilestoneIdAndStatus(milestoneId, TransactionStatus.SUCCESS)) {
            throw new DuplicateReleaseException(milestoneId.toString());
        }

        String idempotencyKey = "release:" + milestoneId.toString();

        // Create Razorpay order
        PaymentRequest paymentRequest = PaymentRequest.builder()
                .milestoneId(milestoneId)
                .amount(milestone.getAmount())
                .currency(milestone.getContract().getCurrency())
                .description("Payment for milestone: " + milestone.getTitle())
                .idempotencyKey(idempotencyKey)
                .receipt("M-" + milestoneId.toString().substring(0, 8))
                .build();

        PaymentResult result = paymentService.createOrder(paymentRequest);

        // Record the transaction
        Transaction transaction = Transaction.builder()
                .milestone(milestone)
                .providerOrderId(result.isSuccess() ? result.getOrderId() : null)
                .amount(milestone.getAmount())
                .currency(milestone.getContract().getCurrency())
                .status(result.isSuccess() ? TransactionStatus.PENDING : TransactionStatus.FAILED)
                .provider("RAZORPAY")
                .failureReason(result.isSuccess() ? null : result.getFailureReason())
                .idempotencyKey(idempotencyKey)
                .build();

        transactionRepository.save(transaction);

        if (result.isSuccess()) {
            milestone.setStatus(MilestoneStatus.PAYMENT_PROCESSING);
            milestoneRepository.save(milestone);

            auditService.log("MILESTONE", milestoneId.toString(),
                    AuditAction.PAYMENT_INITIATED, actor,
                    String.format("Payment order created: %s for amount %s",
                            result.getOrderId(), milestone.getAmount()));
        } else {
            milestone.setStatus(MilestoneStatus.FAILED);
            milestoneRepository.save(milestone);

            auditService.log("MILESTONE", milestoneId.toString(),
                    AuditAction.PAYMENT_FAILED, actor,
                    "Payment order creation failed: " + result.getFailureReason());

            eventPublisher.publishPaymentFailed(PaymentFailedEvent.Payload.builder()
                    .transactionId(transaction.getId())
                    .milestoneId(milestoneId)
                    .contractId(milestone.getContract().getId())
                    .amount(milestone.getAmount())
                    .failureReason(result.getFailureReason())
                    .build());
        }

        return milestoneMapper.toResponse(milestone);
    }

    /**
     * Called by WebhookProcessor after successful payment confirmation from Razorpay.
     * Marks milestone as RELEASED and publishes payment.released event.
     */
    @Transactional
    public void confirmPaymentRelease(UUID milestoneId, String providerPaymentId,
                                      String providerOrderId, String actor) {
        Milestone milestone = findMilestoneOrThrow(milestoneId);

        if (milestone.getStatus() == MilestoneStatus.RELEASED) {
            log.warn("Milestone {} already released — ignoring duplicate webhook confirmation", milestoneId);
            return;
        }

        // Update transaction
        transactionRepository.findByProviderOrderId(providerOrderId).ifPresent(tx -> {
            tx.setProviderPaymentId(providerPaymentId);
            tx.setStatus(TransactionStatus.SUCCESS);
            tx.setCompletedAt(Instant.now());
            transactionRepository.save(tx);
        });

        // Release milestone
        milestone.setStatus(MilestoneStatus.RELEASED);
        milestone.setReleasedAt(Instant.now());
        milestoneRepository.save(milestone);

        auditService.log("MILESTONE", milestoneId.toString(),
                AuditAction.PAYMENT_RELEASED, actor,
                String.format("Payment released for milestone '%s'. Provider payment: %s",
                        milestone.getTitle(), providerPaymentId));

        // Publish payment.released event
        eventPublisher.publishPaymentReleased(PaymentReleasedEvent.Payload.builder()
                .milestoneId(milestoneId)
                .contractId(milestone.getContract().getId())
                .studentId(milestone.getContract().getStudentId())
                .startupId(milestone.getContract().getStartupId())
                .amount(milestone.getAmount())
                .currency(milestone.getContract().getCurrency())
                .providerPaymentId(providerPaymentId)
                .build());

        // Check if all milestones are released — if so, complete the contract
        checkAndCompleteContract(milestone.getContract().getId());
    }

    private void checkAndCompleteContract(UUID contractId) {
        long unreleased = milestoneRepository.countUnreleasedByContractId(contractId);
        if (unreleased == 0) {
            contractRepository.findById(contractId).ifPresent(contract -> {
                contract.setStatus(ContractStatus.COMPLETED);
                contractRepository.save(contract);
                auditService.log("CONTRACT", contractId.toString(),
                        AuditAction.CONTRACT_COMPLETED, "system",
                        "All milestones released. Contract auto-completed.");
                log.info("Contract {} auto-completed after all milestones released", contractId);
            });
        }
    }

    private Milestone findMilestoneOrThrow(UUID milestoneId) {
        return milestoneRepository.findById(milestoneId)
                .orElseThrow(() -> new ResourceNotFoundException("Milestone", milestoneId.toString()));
    }
}

package com.devcollab.escrow.service;

import com.devcollab.escrow.audit.AuditAction;
import com.devcollab.escrow.audit.AuditService;
import com.devcollab.escrow.dto.request.*;
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
import java.util.List;
import java.util.Optional;
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
                .revisionCount(0)
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
     * Start work on a milestone.
     */
    @Transactional
    public MilestoneResponse startMilestone(UUID milestoneId, String actor) {
        Milestone milestone = findMilestoneOrThrow(milestoneId);

        if (milestone.getStatus() != MilestoneStatus.PENDING) {
            throw new EscrowException(
                    "Only PENDING milestones can be started. Current status: " + milestone.getStatus(),
                    HttpStatus.BAD_REQUEST, "INVALID_MILESTONE_STATUS");
        }

        milestone.setStatus(MilestoneStatus.IN_PROGRESS);
        milestone.setStartedAt(Instant.now());
        milestoneRepository.save(milestone);

        auditService.log("MILESTONE", milestoneId.toString(),
                AuditAction.MILESTONE_STARTED, actor,
                String.format("Work started on milestone '%s'", milestone.getTitle()));

        return milestoneMapper.toResponse(milestone);
    }

    /**
     * Student submits milestone deliverable for review.
     */
    @Transactional
    public MilestoneResponse submitMilestone(UUID milestoneId, SubmitMilestoneRequest request, String actor) {
        Milestone milestone = findMilestoneOrThrow(milestoneId);

        if (milestone.getStatus() != MilestoneStatus.IN_PROGRESS && milestone.getStatus() != MilestoneStatus.PENDING) {
            throw new EscrowException(
                    "Only PENDING or IN_PROGRESS milestones can be submitted. Current status: " + milestone.getStatus(),
                    HttpStatus.BAD_REQUEST, "INVALID_MILESTONE_STATUS");
        }

        milestone.setStatus(MilestoneStatus.SUBMITTED);
        milestone.setSubmittedAt(Instant.now());
        if (request != null) {
            if (request.getDeliverableUrl() != null) milestone.setDeliverableUrl(request.getDeliverableUrl());
            if (request.getSubmissionNotes() != null) milestone.setSubmissionNotes(request.getSubmissionNotes());
        }
        milestoneRepository.save(milestone);

        auditService.log("MILESTONE", milestoneId.toString(),
                AuditAction.MILESTONE_SUBMITTED, actor,
                String.format("Milestone deliverable '%s' submitted for review.", milestone.getTitle()));

        return milestoneMapper.toResponse(milestone);
    }

    /**
     * Client requests changes/revisions on a submitted milestone.
     */
    @Transactional
    public MilestoneResponse requestChanges(UUID milestoneId, RequestChangesRequest request, String actor) {
        Milestone milestone = findMilestoneOrThrow(milestoneId);

        if (milestone.getStatus() != MilestoneStatus.SUBMITTED) {
            throw new EscrowException(
                    "Only SUBMITTED milestones can have changes requested. Current status: " + milestone.getStatus(),
                    HttpStatus.BAD_REQUEST, "INVALID_MILESTONE_STATUS");
        }

        milestone.setStatus(MilestoneStatus.IN_PROGRESS);
        milestone.setReviewFeedback(request.getReviewFeedback());
        milestone.setRevisionCount(milestone.getRevisionCount() != null ? milestone.getRevisionCount() + 1 : 1);
        milestoneRepository.save(milestone);

        auditService.log("MILESTONE", milestoneId.toString(),
                AuditAction.MILESTONE_CHANGES_REQUESTED, actor,
                String.format("Changes requested for milestone '%s': %s", milestone.getTitle(), request.getReviewFeedback()));

        return milestoneMapper.toResponse(milestone);
    }

    /**
     * Startup approves a milestone, preparing for payment release.
     * Enforces sequential milestone release rules.
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
            milestone.getStatus() != MilestoneStatus.PENDING &&
            milestone.getStatus() != MilestoneStatus.FAILED) {
            throw new EscrowException(
                    String.format("Cannot approve milestone in status: %s", milestone.getStatus()),
                    HttpStatus.BAD_REQUEST, "INVALID_MILESTONE_STATUS");
        }

        // Validate sequential release: all earlier milestones must be released first
        validateSequentialRelease(milestone);

        String idempotencyKey = "approve:" + milestoneId.toString();

        if (milestone.getStatus() != MilestoneStatus.FAILED && milestoneRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
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
     * Release payment for an approved milestone via the configured provider.
     */
    @Transactional
    public MilestoneResponse releaseMilestone(UUID milestoneId, String actor) {
        return releaseMilestone(milestoneId, "release:" + milestoneId.toString(), actor);
    }

    /**
     * Release payment for an approved milestone via the configured provider.
     * Supports API-level idempotency via idempotencyKey.
     */
    @Transactional
    public MilestoneResponse releaseMilestone(UUID milestoneId, String idempotencyKey, String actor) {
        Milestone milestone = findMilestoneOrThrow(milestoneId);

        // Check idempotency key in transaction repository
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            Optional<Transaction> existingTx = transactionRepository.findByIdempotencyKey(idempotencyKey);
            if (existingTx.isPresent()) {
                Transaction tx = existingTx.get();
                if (tx.getStatus() == TransactionStatus.SUCCESS || tx.getStatus() == TransactionStatus.PENDING) {
                    log.info("Duplicate milestone release attempt with key {} for milestone {} — returning existing state",
                            idempotencyKey, milestoneId);
                    return milestoneMapper.toResponse(milestone);
                }
                idempotencyKey = idempotencyKey + ":retry:" + System.currentTimeMillis();
            }
        } else {
            idempotencyKey = "release:" + milestoneId.toString();
        }

        // Hard guard: cannot release twice
        if (milestone.getStatus() == MilestoneStatus.RELEASED) {
            return milestoneMapper.toResponse(milestone);
        }

        if (milestone.getStatus() == MilestoneStatus.PAYMENT_PROCESSING) {
            throw new EscrowException("Payment is already being processed for this milestone",
                    HttpStatus.CONFLICT, "PAYMENT_IN_PROGRESS");
        }

        if (milestone.getStatus() != MilestoneStatus.APPROVED && milestone.getStatus() != MilestoneStatus.FAILED) {
            throw new EscrowException(
                    "Only APPROVED milestones can have payments released. Current status: " + milestone.getStatus(),
                    HttpStatus.BAD_REQUEST, "MILESTONE_NOT_APPROVED");
        }

        // Sequential release guard: ensure preceding milestones are already RELEASED
        validateSequentialRelease(milestone);

        // Check for existing successful transaction
        if (transactionRepository.existsByMilestoneIdAndStatus(milestoneId, TransactionStatus.SUCCESS)) {
            throw new DuplicateReleaseException(milestoneId.toString());
        }

        // Create provider order
        PaymentRequest paymentRequest = PaymentRequest.builder()
                .milestoneId(milestoneId)
                .amount(milestone.getAmount())
                .currency(milestone.getContract().getCurrency())
                .description("Payment for milestone: " + milestone.getTitle())
                .idempotencyKey(idempotencyKey)
                .receipt("M-" + milestoneId.toString().substring(0, 8))
                .build();

        PaymentResult result = paymentService.createOrder(paymentRequest);
        String providerName = paymentService.getProviderName();

        Transaction transaction = Transaction.builder()
                .milestone(milestone)
                .providerOrderId(result.isSuccess() ? result.getOrderId() : null)
                .approveUrl(result.isSuccess() ? result.getApproveUrl() : null)
                .amount(milestone.getAmount())
                .currency(milestone.getContract().getCurrency())
                .status(result.isSuccess() ? TransactionStatus.PENDING : TransactionStatus.FAILED)
                .provider(providerName)
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
                    .projectId(milestone.getContract().getProjectId())
                    .amount(milestone.getAmount())
                    .reason(result.getFailureReason())
                    .build());
        }

        MilestoneResponse response = milestoneMapper.toResponse(milestone);
        return MilestoneResponse.builder()
                .id(response.getId())
                .contractId(response.getContractId())
                .title(response.getTitle())
                .description(response.getDescription())
                .amount(response.getAmount())
                .sequenceOrder(response.getSequenceOrder())
                .status(response.getStatus())
                .dueDate(response.getDueDate())
                .approvedBy(response.getApprovedBy())
                .approvedAt(response.getApprovedAt())
                .releasedAt(response.getReleasedAt())
                .idempotencyKey(response.getIdempotencyKey())
                .deliverableUrl(response.getDeliverableUrl())
                .submissionNotes(response.getSubmissionNotes())
                .reviewFeedback(response.getReviewFeedback())
                .revisionCount(response.getRevisionCount())
                .startedAt(response.getStartedAt())
                .submittedAt(response.getSubmittedAt())
                .transactionId(transaction.getId())
                .providerOrderId(result.isSuccess() ? result.getOrderId() : null)
                .approveUrl(result.isSuccess() ? result.getApproveUrl() : null)
                .createdAt(response.getCreatedAt())
                .updatedAt(response.getUpdatedAt())
                .build();
    }

    /**
     * Raise a dispute on a milestone.
     */
    @Transactional
    public MilestoneResponse disputeMilestone(UUID milestoneId, DisputeMilestoneRequest request, String actor) {
        Milestone milestone = findMilestoneOrThrow(milestoneId);

        if (milestone.getStatus() == MilestoneStatus.RELEASED) {
            throw new EscrowException("Released milestone cannot be disputed",
                    HttpStatus.BAD_REQUEST, "MILESTONE_ALREADY_RELEASED");
        }

        milestone.setStatus(MilestoneStatus.DISPUTED);
        milestone.setDisputeReason(request.getReason());
        milestone.setDisputedAt(Instant.now());
        milestoneRepository.save(milestone);

        // Put contract in DISPUTED status as well
        Contract contract = milestone.getContract();
        contract.setStatus(ContractStatus.DISPUTED);
        contractRepository.save(contract);

        auditService.log("MILESTONE", milestoneId.toString(),
                AuditAction.DISPUTE_RAISED, actor,
                String.format("Milestone '%s' disputed: %s", milestone.getTitle(), request.getReason()));

        return milestoneMapper.toResponse(milestone);
    }

    /**
     * Resolve a disputed milestone (Admin action).
     */
    @Transactional
    public MilestoneResponse resolveDispute(UUID milestoneId, ResolveDisputeRequest request, String actor) {
        Milestone milestone = findMilestoneOrThrow(milestoneId);

        if (milestone.getStatus() != MilestoneStatus.DISPUTED) {
            throw new EscrowException("Only DISPUTED milestones can be resolved",
                    HttpStatus.BAD_REQUEST, "MILESTONE_NOT_DISPUTED");
        }

        String resolution = request.getResolution().toUpperCase();
        milestone.setDisputeResolvedAt(Instant.now());
        milestone.setDisputeResolution(resolution);

        switch (resolution) {
            case "RELEASE" -> {
                milestone.setStatus(MilestoneStatus.APPROVED);
                milestoneRepository.save(milestone);
                releaseMilestone(milestoneId, actor);
            }
            case "REFUND" -> {
                milestone.setStatus(MilestoneStatus.FAILED);
                milestoneRepository.save(milestone);
            }
            case "REOPEN" -> {
                milestone.setStatus(MilestoneStatus.IN_PROGRESS);
                milestoneRepository.save(milestone);
            }
            default -> throw new EscrowException("Invalid resolution: " + resolution + ". Supported: RELEASE, REFUND, REOPEN",
                    HttpStatus.BAD_REQUEST, "INVALID_RESOLUTION");
        }

        // Restore contract status
        Contract contract = milestone.getContract();
        long unreleased = milestoneRepository.countUnreleasedByContractId(contract.getId());
        contract.setStatus(unreleased == 0 ? ContractStatus.COMPLETED : ContractStatus.ACTIVE);
        contractRepository.save(contract);

        auditService.log("MILESTONE", milestoneId.toString(),
                AuditAction.DISPUTE_RESOLVED, actor,
                String.format("Milestone dispute resolved with action: %s. Notes: %s",
                        resolution, request.getResolutionNotes()));

        return milestoneMapper.toResponse(milestone);
    }

    /**
     * Validates sequential milestone release: prior milestones must be RELEASED.
     */
    private void validateSequentialRelease(Milestone milestone) {
        if (milestone.getSequenceOrder() != null && milestone.getSequenceOrder() > 1) {
            List<Milestone> preceding = milestoneRepository.findPrecedingMilestones(
                    milestone.getContract().getId(), milestone.getSequenceOrder());
            for (Milestone m : preceding) {
                if (m.getStatus() != MilestoneStatus.RELEASED) {
                    throw new EscrowException(
                            String.format("Milestone '%s' (Order %d) cannot be released/approved before preceding milestone '%s' (Order %d) is RELEASED. Preceding status: %s",
                                    milestone.getTitle(), milestone.getSequenceOrder(),
                                    m.getTitle(), m.getSequenceOrder(), m.getStatus()),
                            HttpStatus.BAD_REQUEST, "SEQUENTIAL_RELEASE_VIOLATION");
                }
            }
        }
    }

    /**
     * Called by WebhookProcessor after successful payment confirmation from the provider.
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

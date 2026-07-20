package com.devcollab.escrow.service;

import com.devcollab.escrow.audit.AuditAction;
import com.devcollab.escrow.audit.AuditService;
import com.devcollab.escrow.dto.request.CreateContractRequest;
import com.devcollab.escrow.dto.response.ContractResponse;
import com.devcollab.escrow.dto.response.PageResponse;
import com.devcollab.escrow.entity.Contract;
import com.devcollab.escrow.entity.Milestone;
import com.devcollab.escrow.enums.ContractStatus;
import com.devcollab.escrow.enums.MilestoneStatus;
import com.devcollab.escrow.exception.EscrowException;
import com.devcollab.escrow.exception.ResourceNotFoundException;
import com.devcollab.escrow.mapper.ContractMapper;
import com.devcollab.escrow.repository.ContractRepository;
import com.devcollab.escrow.repository.MilestoneRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ContractService {

    private final ContractRepository contractRepository;
    private final MilestoneRepository milestoneRepository;
    private final ContractMapper contractMapper;
    private final AuditService auditService;

    @Transactional
    public ContractResponse createContract(CreateContractRequest request, String createdBy) {
        log.info("Creating contract for project: {}, startup: {}, student: {}",
                request.getProjectId(), request.getStartupId(), request.getStudentId());

        // Prevent duplicate active contracts for the same project
        if (contractRepository.existsByProjectIdAndStatus(request.getProjectId(), ContractStatus.ACTIVE)) {
            throw new EscrowException(
                    "An active contract already exists for project: " + request.getProjectId(),
                    HttpStatus.CONFLICT, "DUPLICATE_CONTRACT");
        }

        Contract contract = Contract.builder()
                .projectId(request.getProjectId())
                .startupId(request.getStartupId())
                .studentId(request.getStudentId())
                .title(request.getTitle())
                .description(request.getDescription())
                .totalAmount(request.getTotalAmount())
                .currency(request.getCurrency() != null ? request.getCurrency() : "INR")
                .terms(request.getTerms())
                .status(ContractStatus.ACTIVE)
                .milestones(new ArrayList<>())
                .build();

        contract = contractRepository.save(contract);

        // Create milestones if provided
        if (request.getMilestones() != null && !request.getMilestones().isEmpty()) {
            final Contract savedContract = contract;
            List<Milestone> milestones = request.getMilestones().stream()
                    .map(md -> Milestone.builder()
                            .contract(savedContract)
                            .title(md.getTitle())
                            .description(md.getDescription())
                            .amount(md.getAmount())
                            .sequenceOrder(md.getSequenceOrder())
                            .dueDate(md.getDueDate())
                            .status(MilestoneStatus.PENDING)
                            .build())
                    .toList();
            milestoneRepository.saveAll(milestones);
            contract.getMilestones().addAll(milestones);
        }

        auditService.log("CONTRACT", contract.getId().toString(),
                AuditAction.CONTRACT_CREATED, createdBy,
                String.format("Contract created for project %s with %d milestones",
                        request.getProjectId(),
                        request.getMilestones() != null ? request.getMilestones().size() : 0));

        log.info("Contract created: {}", contract.getId());
        return contractMapper.toResponse(contract);
    }

    public ContractResponse getById(UUID contractId) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", contractId.toString()));
        return contractMapper.toResponse(contract);
    }

    public PageResponse<ContractResponse> getByProjectId(UUID projectId, Pageable pageable) {
        Page<Contract> contracts = contractRepository.findByProjectId(projectId, pageable);
        return PageResponse.from(contracts.map(contractMapper::toResponseWithoutMilestones));
    }

    public PageResponse<ContractResponse> getAll(Pageable pageable) {
        Page<Contract> contracts = contractRepository.findAll(pageable);
        return PageResponse.from(contracts.map(contractMapper::toResponseWithoutMilestones));
    }

    @Transactional
    public ContractResponse activateContract(UUID contractId, String actor) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", contractId.toString()));

        if (contract.getStatus() != ContractStatus.PENDING) {
            throw new EscrowException("Only PENDING contracts can be activated",
                    HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION");
        }

        contract.setStatus(ContractStatus.ACTIVE);
        contractRepository.save(contract);

        auditService.log("CONTRACT", contractId.toString(),
                AuditAction.CONTRACT_ACTIVATED, actor, "Contract activated");

        return contractMapper.toResponseWithoutMilestones(contract);
    }

    @Transactional
    public ContractResponse cancelContract(UUID contractId, String actor) {
        Contract contract = contractRepository.findById(contractId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract", contractId.toString()));

        if (contract.getStatus() == ContractStatus.COMPLETED) {
            throw new EscrowException("Completed contracts cannot be cancelled",
                    HttpStatus.BAD_REQUEST, "INVALID_STATUS_TRANSITION");
        }

        contract.setStatus(ContractStatus.CANCELLED);
        contractRepository.save(contract);

        auditService.log("CONTRACT", contractId.toString(),
                AuditAction.CONTRACT_CANCELLED, actor, "Contract cancelled");

        return contractMapper.toResponseWithoutMilestones(contract);
    }

    /**
     * Called by RabbitMQ consumer when project.matched event arrives.
     * Creates contract and default milestones atomically.
     */
    @Transactional
    public Contract createFromEvent(UUID projectId, UUID startupId, UUID studentId,
                                    String title, String description,
                                    java.math.BigDecimal totalBudget, String currency,
                                    List<MilestoneDefinitionData> milestoneDefs) {
        log.info("Creating contract from event for project: {}", projectId);

        Contract contract = Contract.builder()
                .projectId(projectId)
                .startupId(startupId)
                .studentId(studentId)
                .title(title)
                .description(description)
                .totalAmount(totalBudget)
                .currency(currency != null ? currency : "INR")
                .status(ContractStatus.ACTIVE)
                .milestones(new ArrayList<>())
                .build();

        contract = contractRepository.save(contract);
        final Contract savedContract = contract;

        if (milestoneDefs != null && !milestoneDefs.isEmpty()) {
            List<Milestone> milestones = milestoneDefs.stream()
                    .map(md -> Milestone.builder()
                            .contract(savedContract)
                            .title(md.title())
                            .description(md.description())
                            .amount(md.amount())
                            .sequenceOrder(md.sequenceOrder())
                            .dueDate(md.dueDate())
                            .status(MilestoneStatus.PENDING)
                            .build())
                    .toList();
            milestoneRepository.saveAll(milestones);
        }

        auditService.log("CONTRACT", contract.getId().toString(),
                AuditAction.CONTRACT_CREATED, "system:rabbitmq",
                "Contract auto-created from project.matched event for project: " + projectId);

        return contract;
    }

    public record MilestoneDefinitionData(
            String title,
            String description,
            java.math.BigDecimal amount,
            int sequenceOrder,
            LocalDate dueDate
    ) {}
}

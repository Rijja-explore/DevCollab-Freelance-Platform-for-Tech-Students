package com.devcollab.escrow.service;

import com.devcollab.escrow.audit.AuditService;
import com.devcollab.escrow.dto.request.CreateContractRequest;
import com.devcollab.escrow.dto.response.ContractResponse;
import com.devcollab.escrow.entity.Contract;
import com.devcollab.escrow.enums.ContractStatus;
import com.devcollab.escrow.exception.EscrowException;
import com.devcollab.escrow.mapper.ContractMapper;
import com.devcollab.escrow.repository.ContractRepository;
import com.devcollab.escrow.repository.MilestoneRepository;
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
@DisplayName("ContractService Unit Tests")
class ContractServiceTest {

    @Mock
    private ContractRepository contractRepository;

    @Mock
    private MilestoneRepository milestoneRepository;

    @Mock
    private ContractMapper contractMapper;

    @Mock
    private AuditService auditService;

    @InjectMocks
    private ContractService contractService;

    private UUID projectId;
    private UUID startupId;
    private UUID studentId;
    private Contract sampleContract;
    private ContractResponse sampleResponse;

    @BeforeEach
    void setUp() {
        projectId = UUID.randomUUID();
        startupId = UUID.randomUUID();
        studentId = UUID.randomUUID();

        sampleContract = Contract.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .startupId(startupId)
                .studentId(studentId)
                .title("Test Contract")
                .totalAmount(new BigDecimal("5000.00"))
                .currency("INR")
                .status(ContractStatus.ACTIVE)
                .build();

        sampleResponse = ContractResponse.builder()
                .id(sampleContract.getId())
                .projectId(projectId)
                .startupId(startupId)
                .studentId(studentId)
                .title("Test Contract")
                .totalAmount(new BigDecimal("5000.00"))
                .status(ContractStatus.ACTIVE)
                .build();
    }

    @Test
    @DisplayName("Should create contract successfully when no active contract exists")
    void createContract_ShouldSucceed_WhenNoActiveContractExists() {
        // Given
        CreateContractRequest request = buildCreateRequest();
        given(contractRepository.existsByProjectIdAndStatus(projectId, ContractStatus.ACTIVE))
                .willReturn(false);
        given(contractRepository.save(any(Contract.class))).willReturn(sampleContract);
        given(contractMapper.toResponse(any(Contract.class))).willReturn(sampleResponse);

        // When
        ContractResponse result = contractService.createContract(request, "startup@test.com");

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(ContractStatus.ACTIVE);
        then(contractRepository).should().save(any(Contract.class));
        then(auditService).should().log(anyString(), anyString(), any(), anyString(), anyString());
    }

    @Test
    @DisplayName("Should throw EscrowException when active contract already exists for project")
    void createContract_ShouldThrow_WhenActiveContractExists() {
        // Given
        CreateContractRequest request = buildCreateRequest();
        given(contractRepository.existsByProjectIdAndStatus(projectId, ContractStatus.ACTIVE))
                .willReturn(true);

        // When / Then
        assertThatThrownBy(() -> contractService.createContract(request, "startup@test.com"))
                .isInstanceOf(EscrowException.class)
                .hasMessageContaining("active contract already exists");

        then(contractRepository).should(never()).save(any());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when contract not found")
    void getById_ShouldThrow_WhenContractNotFound() {
        // Given
        UUID nonExistentId = UUID.randomUUID();
        given(contractRepository.findById(nonExistentId)).willReturn(Optional.empty());

        // When / Then
        assertThatThrownBy(() -> contractService.getById(nonExistentId))
                .isInstanceOf(com.devcollab.escrow.exception.ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Should activate PENDING contract")
    void activateContract_ShouldSucceed_WhenContractIsPending() {
        // Given
        sampleContract.setStatus(ContractStatus.PENDING);
        given(contractRepository.findById(sampleContract.getId()))
                .willReturn(Optional.of(sampleContract));
        given(contractRepository.save(any(Contract.class))).willReturn(sampleContract);
        given(contractMapper.toResponseWithoutMilestones(any(Contract.class))).willReturn(sampleResponse);

        // When
        ContractResponse result = contractService.activateContract(
                sampleContract.getId(), "admin@test.com");

        // Then
        assertThat(result).isNotNull();
        then(contractRepository).should().save(argThat(c -> c.getStatus() == ContractStatus.ACTIVE));
    }

    @Test
    @DisplayName("Should reject activation of non-PENDING contract")
    void activateContract_ShouldThrow_WhenContractNotPending() {
        // Given — contract is already ACTIVE
        given(contractRepository.findById(sampleContract.getId()))
                .willReturn(Optional.of(sampleContract));

        // When / Then
        assertThatThrownBy(() -> contractService.activateContract(
                sampleContract.getId(), "admin@test.com"))
                .isInstanceOf(EscrowException.class)
                .hasMessageContaining("PENDING contracts can be activated");
    }

    private CreateContractRequest buildCreateRequest() {
        CreateContractRequest request = new CreateContractRequest();
        request.setProjectId(projectId);
        request.setStartupId(startupId);
        request.setStudentId(studentId);
        request.setTitle("Test Contract");
        request.setTotalAmount(new BigDecimal("5000.00"));
        request.setCurrency("INR");
        return request;
    }
}

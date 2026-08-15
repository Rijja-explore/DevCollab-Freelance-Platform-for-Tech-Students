package com.devcollab.escrow.integration;

import com.devcollab.escrow.dto.request.CreateContractRequest;
import com.devcollab.escrow.dto.request.CreateMilestoneRequest;
import com.devcollab.escrow.entity.Contract;
import com.devcollab.escrow.entity.Milestone;
import com.devcollab.escrow.enums.ContractStatus;
import com.devcollab.escrow.enums.MilestoneStatus;
import com.devcollab.escrow.enums.TransactionStatus;
import com.devcollab.escrow.rabbitmq.EventPublisher;
import com.devcollab.escrow.rabbitmq.MilestoneCompletedConsumer;
import com.devcollab.escrow.rabbitmq.ProjectMatchedConsumer;
import com.devcollab.escrow.repository.ContractRepository;
import com.devcollab.escrow.repository.MilestoneRepository;
import com.devcollab.escrow.repository.ProcessedEventRepository;
import com.devcollab.escrow.repository.TransactionRepository;
import com.devcollab.escrow.security.UserPrincipal;
import com.devcollab.escrow.service.ContractService;
import com.devcollab.escrow.service.MilestoneService;
import com.devcollab.escrow.config.TestAmqpConfig;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.context.annotation.Import;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultHandlers.print;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-End Integration Test covering the full escrow lifecycle:
 *
 * <pre>
 *  Flow A: REST contract creation (POST /api/contracts)
 *  Flow B: Milestone lifecycle — create, approve, release (service + REST)
 *  Flow C: Webhook confirmation → RELEASED + event published
 *  Flow D: Security / access control assertions
 *  Flow E: Event-driven contract shell creation (ContractService.createFromEvent)
 * </pre>
 *
 * <p>RabbitMQ consumers are replaced with {@code @MockBean} to avoid requiring
 * a live broker. The {@link EventPublisher} is also mocked so we can verify
 * event publishing calls without a broker. The {@link com.devcollab.escrow.payment.PaymentService}
 * uses the {@code mock} provider that always succeeds without external calls.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(TestAmqpConfig.class)
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
@TestPropertySource(properties = {
        // ── Database ──────────────────────────────────────────────────────
        "spring.datasource.url=jdbc:h2:mem:e2edb;DB_CLOSE_DELAY=-1;MODE=MySQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        // ── AMQP placeholder values (mocked, no real broker needed) ────────
        "spring.rabbitmq.host=localhost",
        "spring.rabbitmq.port=5672",
        "escrow.exchange=devcollab.exchange",
        "escrow.queues.project-matched=project.matched.queue",
        "escrow.queues.milestone-completed=milestone.completed.queue",
        "escrow.routing-keys.project-matched=project.matched",
        "escrow.routing-keys.milestone-completed=milestone.completed",
        "escrow.routing-keys.payment-released=payment.released",
        "escrow.routing-keys.payment-failed=payment.failed",
        "escrow.dlx.exchange=devcollab.dlx.exchange",
        "escrow.dlx.queue=devcollab.dlx.queue",
        // ── JWT ───────────────────────────────────────────────────────────
        "jwt.public-key=classpath:keys/test-public.pem",
        "jwt.issuer=devcollab-auth",
        // ── Payment ───────────────────────────────────────────────────────
        "payment.provider=mock",
        "paypal.client-id=mock_client_id",
        "paypal.client-secret=mock_client_secret",
        "paypal.mode=sandbox",
        "paypal.webhook-id=mock_webhook_id",
        "razorpay.key-secret=test_secret",
        "razorpay.webhook-secret=test_webhook_secret_key_123",
        // ── Rate limiter ──────────────────────────────────────────────────
        "rate-limiter.max-requests-per-minute=1000"
})
@DisplayName("Person C — End-to-End Business Flow Integration Test")
public class EndToEndFlowTest {

    // ── Mock out AMQP consumers and publisher (no broker needed) ──────────
    @MockBean private ProjectMatchedConsumer projectMatchedConsumer;
    @MockBean private MilestoneCompletedConsumer milestoneCompletedConsumer;
    @MockBean private EventPublisher eventPublisher;

    // ── Injected beans ────────────────────────────────────────────────────
    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private ContractService contractService;
    @Autowired private MilestoneService milestoneService;
    @Autowired private ContractRepository contractRepository;
    @Autowired private MilestoneRepository milestoneRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private ProcessedEventRepository processedEventRepository;

    // ── Shared test state (persists across @Order tests) ─────────────────
    private static UUID sharedProjectId;
    private static UUID sharedStartupId;
    private static UUID sharedStudentId;
    private static UUID sharedContractId;
    private static UUID sharedMilestoneId;

    @BeforeEach
    void initSharedIds() {
        if (sharedProjectId == null) {
            sharedProjectId = UUID.randomUUID();
            sharedStartupId = UUID.randomUUID();
            sharedStudentId = UUID.randomUUID();
        }
    }

    // ── Auth helpers ──────────────────────────────────────────────────────

    private UsernamePasswordAuthenticationToken startupAuth() {
        UserPrincipal p = new UserPrincipal(sharedStartupId, "startup@e2e.test", List.of("STARTUP"));
        return new UsernamePasswordAuthenticationToken(p, null, p.getAuthorities());
    }

    private UsernamePasswordAuthenticationToken adminAuth() {
        UserPrincipal p = new UserPrincipal(UUID.randomUUID(), "admin@e2e.test", List.of("ADMIN"));
        return new UsernamePasswordAuthenticationToken(p, null, p.getAuthorities());
    }

    // ═════════════════════════════════════════════════════════════════════
    // FLOW A — Contract Creation via REST
    // ═════════════════════════════════════════════════════════════════════

    @Test
    @Order(1)
    @DisplayName("Flow A-1: POST /api/contracts → 201 ACTIVE contract created")
    void flowA1_createContract_returnsActiveContract() throws Exception {
        CreateContractRequest request = new CreateContractRequest();
        request.setProjectId(sharedProjectId);
        request.setStartupId(sharedStartupId);
        request.setStudentId(sharedStudentId);
        request.setTitle("E2E Integration Contract");
        request.setTotalAmount(new BigDecimal("50000.00"));
        request.setCurrency("INR");

        MvcResult result = mockMvc.perform(post("/api/contracts")
                        .with(authentication(startupAuth()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andDo(print())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.title").value("E2E Integration Contract"))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        String contractIdStr = objectMapper.readTree(body).path("data").path("id").asText();
        sharedContractId = UUID.fromString(contractIdStr);

        Contract contract = contractRepository.findById(sharedContractId).orElseThrow();
        assertThat(contract.getStatus()).isEqualTo(ContractStatus.ACTIVE);
        assertThat(contract.getProjectId()).isEqualTo(sharedProjectId);
    }

    @Test
    @Order(2)
    @DisplayName("Flow A-2: Duplicate project contract → 409 CONFLICT")
    void flowA2_duplicateContract_returns409() throws Exception {
        CreateContractRequest request = new CreateContractRequest();
        request.setProjectId(sharedProjectId); // same project → conflict
        request.setStartupId(sharedStartupId);
        request.setStudentId(sharedStudentId);
        request.setTitle("Duplicate Contract");
        request.setTotalAmount(new BigDecimal("5000.00"));
        request.setCurrency("INR");

        mockMvc.perform(post("/api/contracts")
                        .with(authentication(startupAuth()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error.code").value("DUPLICATE_CONTRACT"));
    }

    @Test
    @Order(3)
    @DisplayName("Flow A-3: GET /api/contracts/{id} → contract details returned")
    void flowA3_getContract_returnsDetails() throws Exception {
        mockMvc.perform(get("/api/contracts/" + sharedContractId)
                        .with(authentication(startupAuth())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(sharedContractId.toString()))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    // ═════════════════════════════════════════════════════════════════════
    // FLOW B — Milestone Lifecycle (REST + Service)
    // ═════════════════════════════════════════════════════════════════════

    @Test
    @Order(4)
    @DisplayName("Flow B-1: POST /api/milestones → 201 PENDING milestone")
    void flowB1_createMilestone_returnsPending() throws Exception {
        CreateMilestoneRequest req = new CreateMilestoneRequest();
        req.setContractId(sharedContractId);
        req.setTitle("Phase 1 — Backend API");
        req.setDescription("Develop all REST endpoints");
        req.setAmount(new BigDecimal("20000.00"));
        req.setSequenceOrder(1);

        MvcResult result = mockMvc.perform(post("/api/milestones")
                        .with(authentication(startupAuth()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("PENDING"))
                .andExpect(jsonPath("$.data.title").value("Phase 1 — Backend API"))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        sharedMilestoneId = UUID.fromString(
                objectMapper.readTree(body).path("data").path("id").asText());

        Milestone m = milestoneRepository.findById(sharedMilestoneId).orElseThrow();
        assertThat(m.getStatus()).isEqualTo(MilestoneStatus.PENDING);
    }

    @Test
    @Order(5)
    @DisplayName("Flow B-2: approveMilestone (service layer) → APPROVED")
    void flowB2_approveMilestone_becomesApproved() {
        milestoneService.approveMilestone(sharedMilestoneId, sharedStartupId, "e2e:test");

        Milestone m = milestoneRepository.findById(sharedMilestoneId).orElseThrow();
        assertThat(m.getStatus()).isEqualTo(MilestoneStatus.APPROVED);
        assertThat(m.getApprovedBy()).isEqualTo(sharedStartupId);
    }

    @Test
    @Order(6)
    @DisplayName("Flow B-3: POST /api/milestones/{id}/release → PAYMENT_PROCESSING (mock provider)")
    void flowB3_releaseMilestone_initatesPaymentProcessing() throws Exception {
        String idempotencyKey = "e2e-release-" + sharedMilestoneId;

        mockMvc.perform(post("/api/milestones/" + sharedMilestoneId + "/release")
                        .with(authentication(startupAuth()))
                        .header("Idempotency-Key", idempotencyKey))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("PAYMENT_PROCESSING"));

        Milestone m = milestoneRepository.findById(sharedMilestoneId).orElseThrow();
        assertThat(m.getStatus()).isEqualTo(MilestoneStatus.PAYMENT_PROCESSING);

        // A PENDING transaction must exist
        assertThat(transactionRepository.existsByMilestoneIdAndStatus(
                sharedMilestoneId, TransactionStatus.PENDING)).isTrue();
    }

    @Test
    @Order(7)
    @DisplayName("Flow B-4: Duplicate release (same Idempotency-Key) → 200 idempotent, only 1 TX")
    void flowB4_duplicateRelease_isIdempotent() throws Exception {
        String idempotencyKey = "e2e-release-" + sharedMilestoneId;

        mockMvc.perform(post("/api/milestones/" + sharedMilestoneId + "/release")
                        .with(authentication(startupAuth()))
                        .header("Idempotency-Key", idempotencyKey))
                .andExpect(status().isOk());

        // Still PAYMENT_PROCESSING — not double-processed
        Milestone m = milestoneRepository.findById(sharedMilestoneId).orElseThrow();
        assertThat(m.getStatus()).isEqualTo(MilestoneStatus.PAYMENT_PROCESSING);

        // Exactly ONE transaction record
        assertThat(transactionRepository.findByMilestoneIdOrderByCreatedAtDesc(sharedMilestoneId))
                .hasSize(1);
    }

    // ═════════════════════════════════════════════════════════════════════
    // FLOW C — Webhook Confirmation → RELEASED + Event Published
    // ═════════════════════════════════════════════════════════════════════

    @Test
    @Order(8)
    @DisplayName("Flow C-1: POST /api/payments/webhook (mock capture) → milestone RELEASED")
    void flowC1_webhook_releasesMilestone() throws Exception {
        String providerOrderId = transactionRepository
                .findByMilestoneIdOrderByCreatedAtDesc(sharedMilestoneId)
                .stream().findFirst()
                .map(tx -> tx.getProviderOrderId() != null ? tx.getProviderOrderId() : "mock_order_001")
                .orElse("mock_order_001");

        String captureId = "capture_e2e_" + System.currentTimeMillis();

        // Generic webhook payload — WebhookProcessor.handleGenericWebhook() handles this
        String webhookPayload = String.format(
                "{\"event\":\"payment.captured\",\"milestone_id\":\"%s\"," +
                "\"order_id\":\"%s\",\"payment_id\":\"%s\"}",
                sharedMilestoneId, providerOrderId, captureId);

        mockMvc.perform(post("/api/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload)
                        // Mock provider passes any non-null signature
                        .header("X-Razorpay-Signature", "mock_sig_valid"))
                .andDo(print())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Webhook processed"));

        // Milestone must now be RELEASED
        Milestone m = milestoneRepository.findById(sharedMilestoneId).orElseThrow();
        assertThat(m.getStatus()).isEqualTo(MilestoneStatus.RELEASED);
        assertThat(m.getReleasedAt()).isNotNull();

        // Transaction must be SUCCESS
        assertThat(transactionRepository.existsByMilestoneIdAndStatus(
                sharedMilestoneId, TransactionStatus.SUCCESS)).isTrue();

        // payment.released event must have been published
        verify(eventPublisher, atLeastOnce()).publishPaymentReleased(any());
    }

    @Test
    @Order(9)
    @DisplayName("Flow C-2: Duplicate webhook (same capture ID) → 200 idempotent, no double release")
    void flowC2_duplicateWebhook_isIdempotent() throws Exception {
        String webhookPayload = String.format(
                "{\"event\":\"payment.captured\",\"milestone_id\":\"%s\"," +
                "\"order_id\":\"mock_order_dupe\",\"payment_id\":\"capture_dupe_001\"}",
                sharedMilestoneId);

        // First call — may already be processed if capture_dupe_001 was sent before
        mockMvc.perform(post("/api/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload)
                        .header("X-Razorpay-Signature", "mock_sig_valid"))
                .andExpect(status().isOk());

        // Second call — must be idempotent
        mockMvc.perform(post("/api/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(webhookPayload)
                        .header("X-Razorpay-Signature", "mock_sig_valid"))
                .andExpect(status().isOk());

        // Milestone still RELEASED — never double-released
        Milestone m = milestoneRepository.findById(sharedMilestoneId).orElseThrow();
        assertThat(m.getStatus()).isEqualTo(MilestoneStatus.RELEASED);
    }

    @Test
    @Order(10)
    @DisplayName("Flow C-3: Contract auto-completes when last milestone released")
    void flowC3_contract_autoCompletesWhenAllMilestonesReleased() {
        long unreleased = milestoneRepository.countUnreleasedByContractId(sharedContractId);
        assertThat(unreleased).isZero();

        Contract contract = contractRepository.findById(sharedContractId).orElseThrow();
        assertThat(contract.getStatus()).isEqualTo(ContractStatus.COMPLETED);
    }

    // ═════════════════════════════════════════════════════════════════════
    // FLOW D — Security / Access Control
    // ═════════════════════════════════════════════════════════════════════

    @Test
    @Order(11)
    @DisplayName("Flow D-1: GET /api/audit → ADMIN can access")
    void flowD1_admin_canAccessAuditLogs() throws Exception {
        mockMvc.perform(get("/api/audit")
                        .with(authentication(adminAuth())))
                .andExpect(status().isOk());
    }

    @Test
    @Order(12)
    @DisplayName("Flow D-2: GET /api/audit → STARTUP role is forbidden")
    void flowD2_startup_cannotAccessAuditLogs() throws Exception {
        mockMvc.perform(get("/api/audit")
                        .with(authentication(startupAuth())))
                .andExpect(status().isForbidden());
    }

    @Test
    @Order(13)
    @DisplayName("Flow D-3: POST /api/payments/webhook without signature → 401 Unauthorized")
    void flowD3_webhook_withoutSignature_returns401() throws Exception {
        mockMvc.perform(post("/api/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"event\":\"payment.captured\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @Order(14)
        @DisplayName("Flow D-4: POST /api/contracts without auth → 403 Forbidden")
    void flowD4_contract_withoutAuth_returns401() throws Exception {
        CreateContractRequest request = new CreateContractRequest();
        request.setProjectId(UUID.randomUUID());
        request.setTotalAmount(new BigDecimal("1000.00"));

        mockMvc.perform(post("/api/contracts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                        .andExpect(status().isForbidden());
    }

    // ═════════════════════════════════════════════════════════════════════
    // FLOW E — Event-Driven Contract Creation (Service Layer)
    // ═════════════════════════════════════════════════════════════════════

    @Test
    @Order(15)
    @DisplayName("Flow E-1: createFromEvent → ACTIVE contract + milestones persisted")
    void flowE1_createFromEvent_createsContractAndMilestones() {
        UUID eventProjectId = UUID.randomUUID();
        UUID eventStartupId = UUID.randomUUID();
        UUID eventStudentId = UUID.randomUUID();

        contractService.createFromEvent(
                eventProjectId,
                eventStartupId,
                eventStudentId,
                "AI Resume Tool",
                "Build an AI-powered resume generator",
                new BigDecimal("30000.00"),
                "INR",
                List.of(
                        new ContractService.MilestoneDefinitionData(
                                "Backend API", "Build Spring Boot API",
                                new BigDecimal("15000.00"), 1, null),
                        new ContractService.MilestoneDefinitionData(
                                "Frontend UI", "Build React frontend",
                                new BigDecimal("15000.00"), 2, null)
                )
        );

        List<Contract> contracts = contractRepository.findAllByProjectId(eventProjectId);
        assertThat(contracts).hasSize(1);
        Contract contract = contracts.get(0);
        assertThat(contract.getStatus()).isEqualTo(ContractStatus.ACTIVE);
        assertThat(contract.getTitle()).isEqualTo("AI Resume Tool");
        assertThat(contract.getTotalAmount()).isEqualByComparingTo("30000.00");

        List<Milestone> milestones =
                milestoneRepository.findByContractIdOrderBySequenceOrder(contract.getId());
        assertThat(milestones).hasSize(2);
        assertThat(milestones.get(0).getTitle()).isEqualTo("Backend API");
        assertThat(milestones.get(0).getStatus()).isEqualTo(MilestoneStatus.PENDING);
        assertThat(milestones.get(1).getTitle()).isEqualTo("Frontend UI");
    }

    @Test
    @Order(16)
    @DisplayName("Flow E-2: createFromEvent duplicate project → only one ACTIVE contract exists")
    void flowE2_createFromEvent_duplicateProjectIdempotent() {
        UUID freshProjectId = UUID.randomUUID();

        contractService.createFromEvent(
                freshProjectId, UUID.randomUUID(), UUID.randomUUID(),
                "Test Project", "Description", new BigDecimal("1000.00"), "INR", List.of());

        // Second call for same project should be silently skipped (duplicate guard)
        contractService.createFromEvent(
                freshProjectId, UUID.randomUUID(), UUID.randomUUID(),
                "Test Project Duplicate", "Desc", new BigDecimal("1000.00"), "INR", List.of());

        List<Contract> contracts = contractRepository.findAllByProjectId(freshProjectId);
        assertThat(contracts).hasSize(1);
    }
}

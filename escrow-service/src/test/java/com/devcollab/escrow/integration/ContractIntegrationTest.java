package com.devcollab.escrow.integration;

import com.devcollab.escrow.dto.request.CreateContractRequest;
import com.devcollab.escrow.dto.response.ApiResponse;
import com.devcollab.escrow.dto.response.ContractResponse;
import com.devcollab.escrow.enums.ContractStatus;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=MySQL",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false",
        "spring.rabbitmq.host=localhost",
        "spring.rabbitmq.port=5672",
        "jwt.public-key=classpath:keys/test-public.pem",
        "jwt.issuer=devcollab-auth",
        "razorpay.key-id=rzp_test_mock",
        "razorpay.key-secret=mock_secret",
        "razorpay.webhook-secret=mock_webhook_secret"
})
@DisplayName("Contract Integration Tests")
class ContractIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /api/contracts — should return 201 with STARTUP role")
    @WithMockUser(username = "startup@test.com", roles = {"STARTUP"})
    void createContract_ShouldReturn201_WithStartupRole() throws Exception {
        CreateContractRequest request = buildCreateRequest("Integration Test Contract");

        MvcResult result = mockMvc.perform(post("/api/contracts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.title").value("Integration Test Contract"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).contains("Contract created successfully");
    }

    @Test
    @DisplayName("POST /api/contracts — should return 403 with STUDENT role")
    @WithMockUser(username = "student@test.com", roles = {"STUDENT"})
    void createContract_ShouldReturn403_WithStudentRole() throws Exception {
        CreateContractRequest request = buildCreateRequest("Student Attempt Contract");

        mockMvc.perform(post("/api/contracts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/contracts — should return 422 with invalid request")
    @WithMockUser(roles = {"STARTUP"})
    void createContract_ShouldReturn422_WithInvalidRequest() throws Exception {
        CreateContractRequest invalid = new CreateContractRequest();
        // Missing required fields

        mockMvc.perform(post("/api/contracts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("GET /api/contracts/{id} — should return 404 for unknown contract")
    @WithMockUser(roles = {"STARTUP"})
    void getContract_ShouldReturn404_WhenNotFound() throws Exception {
        UUID randomId = UUID.randomUUID();

        mockMvc.perform(get("/api/contracts/" + randomId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("RESOURCE_NOT_FOUND"));
    }

    @Test
    @DisplayName("GET /api/audit — should return 403 for non-ADMIN")
    @WithMockUser(roles = {"STARTUP"})
    void getAuditLogs_ShouldReturn403_ForNonAdmin() throws Exception {
        mockMvc.perform(get("/api/audit"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("POST /api/payments/webhook — should return 401 with missing signature")
    void webhook_ShouldReturn401_WithMissingSignature() throws Exception {
        String payload = "{\"event\":\"payment.captured\"}";

        mockMvc.perform(post("/api/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isUnauthorized());
    }

    private CreateContractRequest buildCreateRequest(String title) {
        CreateContractRequest req = new CreateContractRequest();
        req.setProjectId(UUID.randomUUID());
        req.setStartupId(UUID.randomUUID());
        req.setStudentId(UUID.randomUUID());
        req.setTitle(title);
        req.setTotalAmount(new BigDecimal("10000.00"));
        req.setCurrency("INR");
        return req;
    }
}

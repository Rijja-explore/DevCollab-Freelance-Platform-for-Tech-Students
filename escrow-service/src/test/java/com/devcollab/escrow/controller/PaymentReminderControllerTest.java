package com.devcollab.escrow.controller;

import com.devcollab.escrow.dto.response.PageResponse;
import com.devcollab.escrow.dto.response.ReminderExecutionSummary;
import com.devcollab.escrow.dto.response.ReminderResponse;
import com.devcollab.escrow.enums.ReminderType;
import com.devcollab.escrow.security.JwtAuthFilter;
import com.devcollab.escrow.security.RateLimiterFilter;
import com.devcollab.escrow.service.PaymentReminderService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PaymentReminderController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("PaymentReminderController WebMvc Tests")
class PaymentReminderControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PaymentReminderService paymentReminderService;

    @MockBean
    private JwtAuthFilter jwtAuthFilter;

    @MockBean
    private RateLimiterFilter rateLimiterFilter;

    @Test
    @DisplayName("POST /api/reminders/trigger — should execute reminder scan and return summary")
    void triggerReminders_ShouldReturnSummary() throws Exception {
        ReminderExecutionSummary summary = ReminderExecutionSummary.builder()
                .overdueRemindersSent(2)
                .upcomingRemindersSent(1)
                .pendingApprovalRemindersSent(1)
                .pendingReleaseRemindersSent(0)
                .totalRemindersSent(4)
                .executedAt(Instant.now())
                .message("Payment reminder scan completed successfully")
                .build();

        given(paymentReminderService.processAllReminders()).willReturn(summary);

        mockMvc.perform(post("/api/reminders/trigger")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalRemindersSent").value(4))
                .andExpect(jsonPath("$.data.overdueRemindersSent").value(2));
    }

    @Test
    @DisplayName("GET /api/reminders — should return paginated list of reminders")
    void getAllReminders_ShouldReturnPagedReminders() throws Exception {
        ReminderResponse reminder = ReminderResponse.builder()
                .id(UUID.randomUUID())
                .milestoneId(UUID.randomUUID())
                .reminderType(ReminderType.OVERDUE_MILESTONE)
                .subject("[OVERDUE] Milestone deadline passed")
                .message("Please take action.")
                .status("SENT")
                .sentAt(Instant.now())
                .build();

        PageResponse<ReminderResponse> page = PageResponse.<ReminderResponse>builder()
                .content(List.of(reminder))
                .page(0)
                .size(20)
                .totalElements(1)
                .totalPages(1)
                .first(true)
                .last(true)
                .build();

        given(paymentReminderService.getAllReminders(any(Pageable.class))).willReturn(page);

        mockMvc.perform(get("/api/reminders?page=0&size=20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].reminderType").value("OVERDUE_MILESTONE"));
    }
}


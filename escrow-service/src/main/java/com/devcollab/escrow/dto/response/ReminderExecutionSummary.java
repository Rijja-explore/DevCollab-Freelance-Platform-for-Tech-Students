package com.devcollab.escrow.dto.response;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class ReminderExecutionSummary {
    private int overdueRemindersSent;
    private int upcomingRemindersSent;
    private int pendingApprovalRemindersSent;
    private int pendingReleaseRemindersSent;
    private int totalRemindersSent;
    private Instant executedAt;
    private String message;
}


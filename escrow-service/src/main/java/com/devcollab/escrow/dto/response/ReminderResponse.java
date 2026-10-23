package com.devcollab.escrow.dto.response;

import com.devcollab.escrow.enums.ReminderType;
import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class ReminderResponse {
    private UUID id;
    private UUID milestoneId;
    private UUID contractId;
    private UUID recipientId;
    private String recipientEmail;
    private ReminderType reminderType;
    private String subject;
    private String message;
    private String status;
    private Instant sentAt;
}


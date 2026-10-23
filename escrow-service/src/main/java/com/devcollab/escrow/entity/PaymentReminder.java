package com.devcollab.escrow.entity;

import com.devcollab.escrow.enums.ReminderType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payment_reminders", indexes = {
        @Index(name = "idx_payment_reminders_milestone", columnList = "milestone_id"),
        @Index(name = "idx_payment_reminders_contract", columnList = "contract_id"),
        @Index(name = "idx_payment_reminders_type", columnList = "reminder_type"),
        @Index(name = "idx_payment_reminders_sent_at", columnList = "sent_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentReminder {

    @Id
    @UuidGenerator
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "CHAR(36)")
    private UUID id;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "milestone_id", columnDefinition = "CHAR(36)")
    private UUID milestoneId;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "contract_id", columnDefinition = "CHAR(36)")
    private UUID contractId;

    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "recipient_id", columnDefinition = "CHAR(36)")
    private UUID recipientId;

    @Column(name = "recipient_email", length = 255)
    private String recipientEmail;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "reminder_type", nullable = false, length = 50)
    private ReminderType reminderType;

    @Column(name = "subject", nullable = false, length = 255)
    private String subject;

    @Column(name = "message", columnDefinition = "TEXT", nullable = false)
    private String message;

    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private String status = "SENT";

    @CreationTimestamp
    @Column(name = "sent_at", updatable = false, nullable = false)
    private Instant sentAt;
}


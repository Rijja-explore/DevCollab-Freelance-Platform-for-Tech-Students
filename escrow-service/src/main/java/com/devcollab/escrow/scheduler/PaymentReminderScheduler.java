package com.devcollab.escrow.scheduler;

import com.devcollab.escrow.dto.response.ReminderExecutionSummary;
import com.devcollab.escrow.service.PaymentReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class PaymentReminderScheduler {

    private final PaymentReminderService paymentReminderService;

    /**
     * Daily schedule to check milestones and trigger payment/submission reminders.
     * Defaults to 9:00 AM daily (or configurable via property).
     */
    @Scheduled(cron = "${escrow.reminders.cron:0 0 9 * * *}")
    public void runScheduledReminders() {
        log.info("PaymentReminderScheduler triggered by schedule");
        try {
            ReminderExecutionSummary summary = paymentReminderService.processAllReminders();
            log.info("PaymentReminderScheduler executed successfully: {} reminders sent", summary.getTotalRemindersSent());
        } catch (Exception e) {
            log.error("Error executing PaymentReminderScheduler: {}", e.getMessage(), e);
        }
    }
}


package com.devcollab.escrow.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends payment reminder emails. Mail is optional: when no SMTP host is configured
 * (spring.mail.host) or emails are disabled, reminders are still recorded in the
 * database and shown in the UI, just not emailed.
 */
@Service
@Slf4j
public class ReminderEmailService {

    public enum DeliveryStatus { SENT, NO_RECIPIENT, DISABLED, FAILED }

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final boolean enabled;
    private final String from;

    public ReminderEmailService(ObjectProvider<JavaMailSender> mailSenderProvider,
                                @Value("${escrow.reminders.email.enabled:true}") boolean enabled,
                                @Value("${escrow.reminders.email.from:DevCollab Escrow <no-reply@devcollab.local>}") String from) {
        this.mailSenderProvider = mailSenderProvider;
        this.enabled = enabled;
        this.from = from;
    }

    public DeliveryStatus send(String to, String subject, String body) {
        if (to == null || to.isBlank()) {
            return DeliveryStatus.NO_RECIPIENT;
        }
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (!enabled || sender == null) {
            log.debug("Reminder email not sent (mail disabled or not configured): {}", subject);
            return DeliveryStatus.DISABLED;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body + "\n\n— DevCollab Escrow\nYou are receiving this because you are a party to this contract.");
            sender.send(message);
            log.info("Reminder email sent to {}: {}", to, subject);
            return DeliveryStatus.SENT;
        } catch (MailException e) {
            log.warn("Failed to send reminder email to {}: {}", to, e.getMessage());
            return DeliveryStatus.FAILED;
        }
    }
}

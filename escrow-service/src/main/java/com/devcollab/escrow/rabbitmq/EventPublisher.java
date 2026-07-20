package com.devcollab.escrow.rabbitmq;

import com.devcollab.escrow.events.BaseEvent;
import com.devcollab.escrow.events.PaymentFailedEvent;
import com.devcollab.escrow.events.PaymentReleasedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class EventPublisher {

    private final RabbitTemplate rabbitTemplate;

    @Value("${escrow.exchange}")
    private String exchange;

    @Value("${escrow.routing-keys.payment-released}")
    private String paymentReleasedRoutingKey;

    @Value("${escrow.routing-keys.payment-failed}")
    private String paymentFailedRoutingKey;

    public void publishPaymentReleased(PaymentReleasedEvent.Payload payload) {
        PaymentReleasedEvent event = PaymentReleasedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("payment.released")
                .producer("escrow-service")
                .occurredAt(Instant.now())
                .version("1.0")
                .payload(payload)
                .build();

        publish(paymentReleasedRoutingKey, event);
        log.info("Published payment.released event for milestone: {}", payload.getMilestoneId());
    }

    public void publishPaymentFailed(PaymentFailedEvent.Payload payload) {
        PaymentFailedEvent event = PaymentFailedEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .eventType("payment.failed")
                .producer("escrow-service")
                .occurredAt(Instant.now())
                .version("1.0")
                .payload(payload)
                .build();

        publish(paymentFailedRoutingKey, event);
        log.info("Published payment.failed event for milestone: {}", payload.getMilestoneId());
    }

    private void publish(String routingKey, BaseEvent event) {
        try {
            rabbitTemplate.convertAndSend(exchange, routingKey, event);
        } catch (Exception e) {
            log.error("Failed to publish event [{}] with routing key [{}]: {}",
                    event.getEventType(), routingKey, e.getMessage());
            // Don't throw — event publishing failure should not roll back financial transactions
        }
    }
}

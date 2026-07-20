package com.devcollab.escrow.rabbitmq;

import com.devcollab.escrow.entity.Milestone;
import com.devcollab.escrow.entity.ProcessedEvent;
import com.devcollab.escrow.enums.MilestoneStatus;
import com.devcollab.escrow.events.MilestoneCompletedEvent;
import com.devcollab.escrow.repository.MilestoneRepository;
import com.devcollab.escrow.repository.ProcessedEventRepository;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class MilestoneCompletedConsumer {

    private final ProcessedEventRepository processedEventRepository;
    private final MilestoneRepository milestoneRepository;

    @RabbitListener(queues = "${escrow.queues.milestone-completed}",
                    containerFactory = "rabbitListenerContainerFactory")
    @Transactional
    public void consume(MilestoneCompletedEvent event,
                        Channel channel,
                        @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            log.info("Received milestone.completed event: {}", event.getEventId());

            // Idempotency check
            if (processedEventRepository.existsByEventId(event.getEventId())) {
                log.info("Event {} already processed — acking without reprocessing", event.getEventId());
                channel.basicAck(deliveryTag, false);
                return;
            }

            MilestoneCompletedEvent.Payload payload = event.getPayload();

            Optional<Milestone> milestoneOpt = milestoneRepository.findById(payload.getMilestoneId());

            if (milestoneOpt.isEmpty()) {
                log.warn("Milestone {} from event {} not found — acking to avoid DLX loop",
                        payload.getMilestoneId(), event.getEventId());
                channel.basicAck(deliveryTag, false);
                return;
            }

            Milestone milestone = milestoneOpt.get();

            // Only update if in appropriate state
            if (milestone.getStatus() == MilestoneStatus.PENDING ||
                milestone.getStatus() == MilestoneStatus.IN_PROGRESS) {
                milestone.setStatus(MilestoneStatus.SUBMITTED);
                milestoneRepository.save(milestone);
                log.info("Milestone {} marked as SUBMITTED", payload.getMilestoneId());
            } else {
                log.info("Milestone {} is in status {} — no state change from event",
                        payload.getMilestoneId(), milestone.getStatus());
            }

            // Mark event as processed
            processedEventRepository.save(ProcessedEvent.builder()
                    .eventId(event.getEventId())
                    .eventType(event.getEventType())
                    .producer(event.getProducer())
                    .build());

            channel.basicAck(deliveryTag, false);
            log.info("milestone.completed event {} processed", event.getEventId());

        } catch (Exception e) {
            log.error("Failed to process milestone.completed event {}: {}",
                    event.getEventId(), e.getMessage(), e);
            channel.basicNack(deliveryTag, false, false);
        }
    }
}

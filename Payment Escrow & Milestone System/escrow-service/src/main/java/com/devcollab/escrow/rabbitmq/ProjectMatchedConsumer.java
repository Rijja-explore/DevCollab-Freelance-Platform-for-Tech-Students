package com.devcollab.escrow.rabbitmq;

import com.devcollab.escrow.entity.ProcessedEvent;
import com.devcollab.escrow.events.ProjectMatchedEvent;
import com.devcollab.escrow.repository.ProcessedEventRepository;
import com.devcollab.escrow.service.ContractService;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProjectMatchedConsumer {

    private final ProcessedEventRepository processedEventRepository;
    private final ContractService contractService;

    @RabbitListener(queues = "${escrow.queues.project-matched}",
                    containerFactory = "rabbitListenerContainerFactory")
    @Transactional
    public void consume(ProjectMatchedEvent event,
                        Channel channel,
                        @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            log.info("Received project.matched event: {}", event.getEventId());

            // Idempotency check
            if (processedEventRepository.existsByEventId(event.getEventId())) {
                log.info("Event {} already processed — acknowledging without reprocessing", event.getEventId());
                channel.basicAck(deliveryTag, false);
                return;
            }

            ProjectMatchedEvent.Payload payload = event.getPayload();

            // Map milestone definitions from event to service record
            List<ContractService.MilestoneDefinitionData> milestoneDefs = Collections.emptyList();
            if (payload.getMilestones() != null) {
                milestoneDefs = payload.getMilestones().stream()
                        .map(md -> new ContractService.MilestoneDefinitionData(
                                md.getTitle(),
                                md.getDescription(),
                                md.getAmount(),
                                md.getSequenceOrder(),
                                md.getDueDate() != null ? LocalDate.parse(md.getDueDate()) : null
                        ))
                        .toList();
            }

            contractService.createFromEvent(
                    payload.getProjectId(),
                    payload.getStartupId(),
                    payload.getStudentId(),
                    payload.getProjectTitle(),
                    payload.getProjectDescription(),
                    payload.getTotalBudget(),
                    payload.getCurrency(),
                    milestoneDefs
            );

            // Record as processed AFTER successful contract creation
            processedEventRepository.save(ProcessedEvent.builder()
                    .eventId(event.getEventId())
                    .eventType(event.getEventType())
                    .producer(event.getProducer())
                    .build());

            channel.basicAck(deliveryTag, false);
            log.info("project.matched event {} processed successfully", event.getEventId());

        } catch (Exception e) {
            log.error("Failed to process project.matched event {}: {}", event.getEventId(), e.getMessage(), e);
            // Reject and send to DLX (do not requeue to avoid infinite loop)
            channel.basicNack(deliveryTag, false, false);
        }
    }
}

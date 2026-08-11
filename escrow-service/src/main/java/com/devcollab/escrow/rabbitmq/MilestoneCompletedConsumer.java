package com.devcollab.escrow.rabbitmq;

import com.devcollab.escrow.entity.Contract;
import com.devcollab.escrow.entity.Milestone;
import com.devcollab.escrow.entity.ProcessedEvent;
import com.devcollab.escrow.enums.MilestoneStatus;
import com.devcollab.escrow.events.MilestoneCompletedEvent;
import com.devcollab.escrow.repository.ContractRepository;
import com.devcollab.escrow.repository.MilestoneRepository;
import com.devcollab.escrow.repository.ProcessedEventRepository;
import com.devcollab.escrow.service.MilestoneService;
import com.rabbitmq.client.Channel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.support.AmqpHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class MilestoneCompletedConsumer {

    private final ProcessedEventRepository processedEventRepository;
    private final MilestoneRepository milestoneRepository;
    private final ContractRepository contractRepository;
    private final MilestoneService milestoneService;

    @RabbitListener(queues = "${escrow.queues.milestone-completed}",
                    containerFactory = "rabbitListenerContainerFactory")
    @Transactional
    public void consume(MilestoneCompletedEvent event,
                        Channel channel,
                        @Header(AmqpHeaders.DELIVERY_TAG) long deliveryTag) throws IOException {
        try {
            log.info("Received milestone.completed event: {}", event.getEventId());

            // 1. Idempotency check via persistent ProcessedEvent table
            if (processedEventRepository.existsByEventId(event.getEventId())) {
                log.info("Event {} already processed — acking without reprocessing", event.getEventId());
                channel.basicAck(deliveryTag, false);
                return;
            }

            MilestoneCompletedEvent.Payload payload = event.getPayload();
            if (payload == null) {
                log.warn("milestone.completed event {} has null payload — acking to clear", event.getEventId());
                channel.basicAck(deliveryTag, false);
                return;
            }

            // 2. Validate milestone exists (by milestoneId or by projectId)
            Optional<Milestone> milestoneOpt = Optional.empty();
            if (payload.getMilestoneId() != null) {
                milestoneOpt = milestoneRepository.findById(payload.getMilestoneId());
            }

            if (milestoneOpt.isEmpty() && payload.getProjectId() != null) {
                List<Contract> contracts = contractRepository.findAllByProjectId(payload.getProjectId());
                if (!contracts.isEmpty()) {
                    List<Milestone> milestones = milestoneRepository.findByContractIdOrderBySequenceOrder(contracts.get(0).getId());
                    milestoneOpt = milestones.stream()
                            .filter(m -> m.getStatus() != MilestoneStatus.RELEASED)
                            .findFirst();
                }
            }

            if (milestoneOpt.isEmpty()) {
                log.warn("Milestone for event {} (milestoneId={}, projectId={}) not found — acking to avoid DLX loop",
                        event.getEventId(), payload.getMilestoneId(), payload.getProjectId());
                channel.basicAck(deliveryTag, false);
                return;
            }

            Milestone milestone = milestoneOpt.get();

            // 3. Validate contract / project
            if (payload.getProjectId() != null &&
                !payload.getProjectId().equals(milestone.getContract().getProjectId())) {
                log.warn("Project ID mismatch for milestone {}. Event project: {}, Contract project: {}",
                        milestone.getId(), payload.getProjectId(), milestone.getContract().getProjectId());
            }

            // 4. Check current milestone state & prevent duplicate release
            if (milestone.getStatus() == MilestoneStatus.RELEASED ||
                milestone.getStatus() == MilestoneStatus.PAYMENT_PROCESSING) {
                log.info("Milestone {} is already in status {} — skipping release execution",
                        milestone.getId(), milestone.getStatus());
            } else {
                // Approve if needed
                if (milestone.getStatus() != MilestoneStatus.APPROVED) {
                    milestoneService.approveMilestone(
                            milestone.getId(),
                            milestone.getContract().getStartupId(),
                            "rabbitmq:milestone.completed");
                }

                // Initiate payment provider release
                String idempotencyKey = "event:" + event.getEventId();
                milestoneService.releaseMilestone(milestone.getId(), idempotencyKey, "rabbitmq:milestone.completed");
                log.info("Milestone {} payment release initiated via event {}", milestone.getId(), event.getEventId());
            }

            // 5. Record event as processed AFTER safe processing
            processedEventRepository.save(ProcessedEvent.builder()
                    .eventId(event.getEventId())
                    .eventType(event.getEventType())
                    .producer(event.getProducer())
                    .build());

            channel.basicAck(deliveryTag, false);
            log.info("milestone.completed event {} processed successfully", event.getEventId());

        } catch (Exception e) {
            log.error("Failed to process milestone.completed event {}: {}",
                    event.getEventId(), e.getMessage(), e);
            channel.basicNack(deliveryTag, false, false);
        }
    }
}

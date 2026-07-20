package com.devcollab.escrow.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    @Value("${escrow.exchange}")
    private String exchangeName;

    @Value("${escrow.queues.project-matched}")
    private String projectMatchedQueue;

    @Value("${escrow.queues.milestone-completed}")
    private String milestoneCompletedQueue;

    @Value("${escrow.routing-keys.project-matched}")
    private String projectMatchedRoutingKey;

    @Value("${escrow.routing-keys.milestone-completed}")
    private String milestoneCompletedRoutingKey;

    @Value("${escrow.dlx.exchange}")
    private String dlxExchange;

    @Value("${escrow.dlx.queue}")
    private String dlxQueue;

    // ─────────────────────────────────────────────────────────
    //  Exchange
    // ─────────────────────────────────────────────────────────

    @Bean
    public TopicExchange devCollabExchange() {
        return ExchangeBuilder.topicExchange(exchangeName)
                .durable(true)
                .build();
    }

    @Bean
    public DirectExchange deadLetterExchange() {
        return ExchangeBuilder.directExchange(dlxExchange)
                .durable(true)
                .build();
    }

    // ─────────────────────────────────────────────────────────
    //  Queues
    // ─────────────────────────────────────────────────────────

    @Bean
    public Queue projectMatchedQueueBean() {
        return QueueBuilder.durable(projectMatchedQueue)
                .withArgument("x-dead-letter-exchange", dlxExchange)
                .withArgument("x-dead-letter-routing-key", "dead.letter")
                .withArgument("x-message-ttl", 86400000) // 24 hours
                .build();
    }

    @Bean
    public Queue milestoneCompletedQueueBean() {
        return QueueBuilder.durable(milestoneCompletedQueue)
                .withArgument("x-dead-letter-exchange", dlxExchange)
                .withArgument("x-dead-letter-routing-key", "dead.letter")
                .withArgument("x-message-ttl", 86400000)
                .build();
    }

    @Bean
    public Queue deadLetterQueue() {
        return QueueBuilder.durable(dlxQueue).build();
    }

    // ─────────────────────────────────────────────────────────
    //  Bindings
    // ─────────────────────────────────────────────────────────

    @Bean
    public Binding projectMatchedBinding() {
        return BindingBuilder
                .bind(projectMatchedQueueBean())
                .to(devCollabExchange())
                .with(projectMatchedRoutingKey);
    }

    @Bean
    public Binding milestoneCompletedBinding() {
        return BindingBuilder
                .bind(milestoneCompletedQueueBean())
                .to(devCollabExchange())
                .with(milestoneCompletedRoutingKey);
    }

    @Bean
    public Binding deadLetterBinding() {
        return BindingBuilder
                .bind(deadLetterQueue())
                .to(deadLetterExchange())
                .with("dead.letter");
    }

    // ─────────────────────────────────────────────────────────
    //  Serialization
    // ─────────────────────────────────────────────────────────

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        template.setMandatory(true);
        return template;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(messageConverter());
        factory.setAcknowledgeMode(org.springframework.amqp.core.AcknowledgeMode.MANUAL);
        factory.setPrefetchCount(10);
        return factory;
    }
}

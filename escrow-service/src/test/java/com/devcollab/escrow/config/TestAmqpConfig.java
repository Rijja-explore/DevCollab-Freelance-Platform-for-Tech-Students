package com.devcollab.escrow.config;

import org.mockito.Mockito;
import org.springframework.amqp.rabbit.connection.CachingConnectionFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Test configuration that replaces AMQP infrastructure with mocks.
 * Activated via {@code @Import(TestAmqpConfig.class)} or {@code @ActiveProfiles("test")}.
 *
 * <p>This prevents the need for a live RabbitMQ broker during integration tests
 * while still allowing the application context to start fully.
 */
@TestConfiguration
public class TestAmqpConfig {

    /**
     * Provides a mock {@link ConnectionFactory} so {@link RabbitMQConfig} can
     * inject it without a real broker.
     */
    @Bean
    @Primary
    public ConnectionFactory mockConnectionFactory() {
        return Mockito.mock(CachingConnectionFactory.class);
    }

    /**
     * Provides a mock {@link RabbitTemplate} that no-ops all publish calls.
     */
    @Bean
    @Primary
    public RabbitTemplate mockRabbitTemplate(ConnectionFactory connectionFactory) {
        return Mockito.mock(RabbitTemplate.class);
    }
}

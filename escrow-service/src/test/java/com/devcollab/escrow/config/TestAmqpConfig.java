package com.devcollab.escrow.config;

import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import org.mockito.Mockito;
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
        InvocationHandler handler = (Object proxy, Method method, Object[] args) -> {
            String name = method.getName();
            if (name.equals("getPublisherConnectionFactory")) {
                return proxy;
            }
            if (name.equals("toString")) {
                return "MockConnectionFactory";
            }
            Class<?> returnType = method.getReturnType();
            if (returnType.equals(boolean.class)) {
                return false;
            }
            if (returnType.equals(int.class)) {
                return 0;
            }
            if (returnType.equals(long.class)) {
                return 0L;
            }
            if (returnType.equals(double.class)) {
                return 0.0d;
            }
            if (returnType.equals(float.class)) {
                return 0.0f;
            }
            return null;
        };

        return (ConnectionFactory) Proxy.newProxyInstance(
                ConnectionFactory.class.getClassLoader(),
                new Class<?>[] { ConnectionFactory.class },
                handler);
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

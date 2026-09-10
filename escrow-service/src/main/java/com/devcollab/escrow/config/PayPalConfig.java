package com.devcollab.escrow.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Configures the PayPal REST API client.
 *
 * Provides:
 *  - {@code paypalWebClient} bound to the PayPal base URL (sandbox or live based on mode)
 */
@Configuration
@Slf4j
public class PayPalConfig {

    @Value("${paypal.client-id}")
    private String clientId;

    @Value("${paypal.client-secret}")
    private String clientSecret;

    @Value("${paypal.mode:sandbox}")
    private String mode;

    @Bean("paypalAuthToken")
    public String paypalAuthToken() {
        return java.util.Base64.getEncoder()
                .encodeToString((clientId + ":" + clientSecret).getBytes());
    }

    @Bean("paypalBaseUrl")
    public String paypalBaseUrl() {
        String base = "sandbox".equalsIgnoreCase(mode)
                ? "https://api-m.sandbox.paypal.com"
                : "https://api-m.paypal.com";
        log.info("PayPal mode: {}, base URL: {}", mode, base);
        return base;
    }

    @Bean("paypalWebClient")
    public WebClient paypalWebClient(
            @Value("${paypal.base-url:}") String configuredBaseUrl) {
        String baseUrl = configuredBaseUrl.isBlank() ? paypalBaseUrl() : configuredBaseUrl;
        return WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}

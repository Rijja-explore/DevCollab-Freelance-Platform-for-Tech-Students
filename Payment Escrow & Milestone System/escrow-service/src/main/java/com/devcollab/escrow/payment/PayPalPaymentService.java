package com.devcollab.escrow.payment;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Real PayPal Checkout Orders REST API integration.
 *
 * Activated when {@code payment.provider=paypal}.
 *
 * Order flow:
 * 1. createOrder() â†’  POST /v2/checkout/orders (intent CAPTURE)
 *                     Returns order id + approve URL for the JS SDK.
 * 2. Frontend loads the PayPal JS SDK with the client id and renders the button.
 * 3. Payer approves on PayPal â†’ frontend captures via POST /v2/checkout/orders/{id}/capture
 *    (or PayPal notifies via a PAYMENT.CAPTURE.COMPLETED webhook).
 * 4. verifyWebhookSignature() validates the PayPal webhook transmission headers.
 *
 * Authentication:
 *  - Access token obtained from POST /v1/oauth2/token using client-id:client-secret
 *    basic auth (see {@code paypalAuthToken} bean in PayPalConfig).
 */
@Service
@Slf4j
@RequiredArgsConstructor
@ConditionalOnProperty(name = "payment.provider", havingValue = "paypal")
public class PayPalPaymentService implements PaymentService {

    private static final String PROVIDER_NAME = "PAYPAL";

    @Qualifier("paypalWebClient")
    private final WebClient paypalWebClient;

    @Qualifier("paypalAuthToken")
    private final String paypalAuthToken;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${paypal.currency}")
    private String defaultCurrency;

    @Value("${paypal.webhook-id:}")
    private String webhookId;

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public PaymentResult createOrder(PaymentRequest request) {
        try {
            String accessToken = getAccessToken();

            ObjectNode body = objectMapper.createObjectNode();
            body.put("intent", "CAPTURE");

            // purchase_units
            ArrayNode purchaseUnits = body.putArray("purchase_units");
            ObjectNode unit = purchaseUnits.addObject();
            unit.put("reference_id", request.getIdempotencyKey());
            unit.put("custom_id", request.getMilestoneId().toString());
            unit.put("description", request.getDescription());

            // amount
            ObjectNode amountNode = unit.putObject("amount");
            amountNode.put("currency_code", request.getCurrency() != null
                    ? request.getCurrency() : defaultCurrency);
            amountNode.put("value", request.getAmount().setScale(2, RoundingMode.HALF_UP).toPlainString());

            ObjectNode applicationContext = body.putObject("application_context");
            applicationContext.put("brand_name", "DevCollab Platform");
            applicationContext.put("shipping_preference", "NO_SHIPPING");
            applicationContext.put("user_action", "PAY_NOW");

            
        // PayPal browser redirect URLs
        applicationContext.put("return_url", "http://localhost:3000/payment/success");
        applicationContext.put("cancel_url", "http://localhost:3000/payment/cancel");
log.info("Creating PayPal order for milestone: {}, custom_id: {}",
                    request.getMilestoneId(), request.getMilestoneId());

            JsonNode response = paypalWebClient.post()
                    .uri("/v2/checkout/orders")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .body(BodyInserters.fromValue(body.toString()))
                    .retrieve()
                    .onStatus(status -> !status.is2xxSuccessful(),
                            clientResponse -> clientResponse.bodyToMono(String.class)
                                    .map(msg -> new RuntimeException("PayPal create order failed: " + msg)))
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response == null) {
                return PaymentResult.failure("PayPal returned an empty response");
            }

            String orderId = response.path("id").asText();
            String status = response.path("status").asText();
            String approveUrl = "";

            // Extract approve link
            for (JsonNode link : response.path("links")) {
                if ("approve".equals(link.path("rel").asText())) {
                    approveUrl = link.path("href").asText();
                    break;
                }
            }

            // Extract amount back
            BigDecimal amount = request.getAmount();
            String currency = request.getCurrency() != null ? request.getCurrency() : defaultCurrency;

            log.info("PayPal order created: {} (status {})", orderId, status);

            return PaymentResult.builder()
                    .success(true)
                    .orderId(orderId)
                    .approveUrl(approveUrl)
                    .approvedLinks(List.of(approveUrl))
                    .amount(amount)
                    .currency(currency)
                    .status(status)
                    .build();

        } catch (Exception e) {
            log.error("PayPal order creation failed for milestone {}: {}",
                    request.getMilestoneId(), e.getMessage(), e);
            return PaymentResult.failure("PayPal error: " + e.getMessage());
        }
    }

    @Override
    public PaymentResult captureOrder(String orderId) {
        try {
            String accessToken = getAccessToken();

            log.info("Capturing PayPal order: {}", orderId);

            JsonNode response = paypalWebClient.post()
                    .uri("/v2/checkout/orders/{orderId}/capture", orderId)
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .retrieve()
                    .onStatus(status -> !status.is2xxSuccessful(),
                            clientResponse -> clientResponse.bodyToMono(String.class)
                                    .map(msg -> new RuntimeException("PayPal capture failed: " + msg)))
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response == null) {
                return PaymentResult.failure("PayPal capture returned an empty response");
            }

            String status = response.path("status").asText();
            String captureId = "";
            BigDecimal amount = BigDecimal.ZERO;
            String currencyCode = "";

            JsonNode purchaseUnits = response.path("purchase_units");
            if (purchaseUnits.isArray() && purchaseUnits.size() > 0) {
                JsonNode payments = purchaseUnits.get(0).path("payments").path("captures");
                if (payments.isArray() && payments.size() > 0) {
                    JsonNode capture = payments.get(0);
                    captureId = capture.path("id").asText();
                    amount = new BigDecimal(capture.path("amount").path("value").asText("0"));
                    currencyCode = capture.path("amount").path("currency_code").asText();
                }
            }

            log.info("PayPal order {} captured. Capture id: {}, status: {}",
                    orderId, captureId, status);

            return PaymentResult.builder()
                    .success(true)
                    .orderId(orderId)
                    .paymentId(captureId)
                    .amount(amount)
                    .currency(currencyCode)
                    .status(status)
                    .build();

        } catch (Exception e) {
            log.error("PayPal capture failed for order {}: {}", orderId, e.getMessage(), e);
            return PaymentResult.failure("PayPal capture error: " + e.getMessage());
        }
    }

    @Override
    public boolean verifyWebhookSignature(String payload, String transmissionId, String transmissionTime,
                                          String certUrl, String authAlgo, String transmissionSig,
                                          String webhookId) {
        try {
            if (webhookId == null || webhookId.isBlank()) {
                webhookId = this.webhookId;
            }
            if (webhookId == null || webhookId.isBlank()) {
                log.warn("PayPal webhook-id not configured â€” cannot verify signature");
                return false;
            }

            String accessToken = getAccessToken();

            ObjectNode body = objectMapper.createObjectNode();
            body.put("auth_algo", authAlgo);
            body.put("cert_url", certUrl);
            body.put("transmission_id", transmissionId);
            body.put("transmission_sig", transmissionSig);
            body.put("transmission_time", transmissionTime);
            body.put("webhook_id", webhookId);
            body.put("webhook_event", parsingSafePayload(payload));

            JsonNode response = paypalWebClient.post()
                    .uri("/v1/notifications/verify-webhook-signature")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .body(BodyInserters.fromValue(body.toString()))
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response == null) {
                log.warn("PayPal webhook verification returned null response");
                return false;
            }

            boolean success = "SUCCESS".equals(response.path("verification_status").asText());
            log.debug("PayPal webhook verification status: {}", response.path("verification_status").asText());
            return success;

        } catch (Exception e) {
            log.warn("PayPal webhook verification failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Fetches a short-lived OAuth access token from PayPal.
     */
    private String getAccessToken() {
        try {
            JsonNode response = paypalWebClient.post()
                    .uri("/v1/oauth2/token")
                    .header("Authorization", "Basic " + paypalAuthToken)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .header("Accept", "application/json")
                    .body(BodyInserters.fromFormData("grant_type", "client_credentials"))
                    .retrieve()
                    .onStatus(status -> !status.is2xxSuccessful(),
                            clientResponse -> clientResponse.bodyToMono(String.class)
                                    .map(msg -> new RuntimeException("PayPal token failed: " + msg)))
                    .bodyToMono(JsonNode.class)
                    .block();

            if (response == null) {
                throw new RuntimeException("PayPal token response is null");
            }
            return response.path("access_token").asText();
        } catch (Exception e) {
            throw new IllegalStateException("Could not obtain PayPal access token", e);
        }
    }

    private JsonNode parsingSafePayload(String payload) {
        try {
            return objectMapper.readTree(payload);
        } catch (Exception e) {
            log.warn("Could not parse webhook payload, wrapping as string: {}", e.getMessage());
            return objectMapper.getNodeFactory().textNode(payload);
        }
    }
}





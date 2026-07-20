package com.devcollab.escrow.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("DevCollab Escrow Service API")
                        .description("""
                                Production-grade Escrow, Contracts, Milestones, and Payments API.
                                
                                This service is part of the DevCollab microservices platform.
                                Authentication is handled via RS256 JWT tokens issued by Service A.
                                
                                **Roles:**
                                - `STUDENT` — Can view contracts, submit milestones
                                - `STARTUP` — Can create contracts, approve milestones, release payments
                                - `ADMIN` — Full access including audit logs
                                
                                **Webhook:** POST /api/payments/webhook — Razorpay only (HMAC verified)
                                """)
                        .version("1.0.0")
                        .contact(new Contact()
                                .name("DevCollab Engineering")
                                .email("engineering@devcollab.io"))
                        .license(new License()
                                .name("Proprietary")
                                .url("https://devcollab.io")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local Development"),
                        new Server().url("https://api.devcollab.io").description("Production")))
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth"))
                .components(new Components()
                        .addSecuritySchemes("BearerAuth",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("RS256 JWT issued by DevCollab Auth Service (Service A)")));
    }
}

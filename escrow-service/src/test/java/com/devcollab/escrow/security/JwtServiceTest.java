package com.devcollab.escrow.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.impl.DefaultClaims;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("JwtService Claims & Role Extraction Tests")
class JwtServiceTest {

    @Test
    @DisplayName("Should extract single 'role' claim as issued by Service A")
    void extractRoles_ShouldExtractSingleRoleClaim() {
        // Service A emits: .withClaim("role", "STARTUP")
        Claims claims = new DefaultClaims(Map.of("role", "STARTUP", "email", "startup@test.com"));

        JwtService jwtService = new JwtService("classpath:keys/test-public.pem", "devcollab-auth");
        List<String> roles = jwtService.extractRoles(claims);

        assertThat(roles).containsExactly("STARTUP");
    }

    @Test
    @DisplayName("Should extract 'roles' list claim if provided as list")
    void extractRoles_ShouldExtractRolesListClaim() {
        Claims claims = new DefaultClaims(Map.of("roles", List.of("STARTUP", "ADMIN")));

        JwtService jwtService = new JwtService("classpath:keys/test-public.pem", "devcollab-auth");
        List<String> roles = jwtService.extractRoles(claims);

        assertThat(roles).containsExactly("STARTUP", "ADMIN");
    }

    @Test
    @DisplayName("Should return empty list when no role or roles claim is present")
    void extractRoles_ShouldReturnEmpty_WhenNoRoleClaims() {
        Claims claims = new DefaultClaims(Map.of("email", "user@test.com"));

        JwtService jwtService = new JwtService("classpath:keys/test-public.pem", "devcollab-auth");
        List<String> roles = jwtService.extractRoles(claims);

        assertThat(roles).isEmpty();
    }
}

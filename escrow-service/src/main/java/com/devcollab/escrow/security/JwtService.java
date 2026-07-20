package com.devcollab.escrow.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.List;

/**
 * Validates JWT tokens using RS256 (RSA + SHA-256) public key.
 * This service does NOT issue tokens — it only verifies tokens issued by Service A.
 */
@Service
@Slf4j
public class JwtService {

    private final PublicKey publicKey;
    private final String expectedIssuer;

    public JwtService(
            @Value("${jwt.public-key}") String publicKeyPath,
            @Value("${jwt.issuer}") String expectedIssuer) {
        this.expectedIssuer = expectedIssuer;
        this.publicKey = loadPublicKey(publicKeyPath);
    }

    private PublicKey loadPublicKey(String path) {
        try {
            String keyContent;
            if (path.startsWith("classpath:")) {
                String resourcePath = path.substring("classpath:".length());
                try (InputStream is = getClass().getClassLoader().getResourceAsStream(resourcePath)) {
                    if (is == null) {
                        log.warn("Public key file not found at: {}. JWT validation will fail.", resourcePath);
                        return null;
                    }
                    keyContent = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                }
            } else {
                keyContent = java.nio.file.Files.readString(java.nio.file.Path.of(path));
            }

            keyContent = keyContent
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s", "");

            byte[] decoded = Base64.getDecoder().decode(keyContent);
            X509EncodedKeySpec spec = new X509EncodedKeySpec(decoded);
            KeyFactory kf = KeyFactory.getInstance("RSA");
            return kf.generatePublic(spec);
        } catch (Exception e) {
            log.error("Failed to load JWT public key: {}", e.getMessage());
            return null;
        }
    }

    public Claims validateAndExtractClaims(String token) {
        if (publicKey == null) {
            throw new JwtException("JWT public key not configured. Cannot validate tokens.");
        }
        return Jwts.parser()
                .verifyWith(publicKey)
                .requireIssuer(expectedIssuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractSubject(Claims claims) {
        return claims.getSubject();
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(Claims claims) {
        Object roles = claims.get("roles");
        if (roles instanceof List<?> list) {
            return list.stream()
                    .filter(String.class::isInstance)
                    .map(String.class::cast)
                    .toList();
        }
        return List.of();
    }

    public String extractEmail(Claims claims) {
        return claims.get("email", String.class);
    }
}

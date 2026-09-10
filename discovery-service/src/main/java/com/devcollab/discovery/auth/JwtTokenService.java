package com.devcollab.discovery.auth;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.*;

@Service
@Slf4j
public class JwtTokenService {

    @Value("${jwt.private-key-path:classpath:keys/private.pem}")
    private Resource privateKeyResource;

    @Value("${jwt.public-key-path:classpath:keys/public.pem}")
    private Resource publicKeyResource;

    @Value("${jwt.issuer:devcollab-auth}")
    private String issuer;

    @Value("${jwt.access-token-expiration-ms:86400000}")
    private long expirationMs;

    private Algorithm algorithm;
    private RSAPublicKey publicKey;

    @PostConstruct
    public void init() {
        try {
            String privateKeyContent = new String(privateKeyResource.getInputStream().readAllBytes(), StandardCharsets.UTF_8)
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");

            String publicKeyContent = new String(publicKeyResource.getInputStream().readAllBytes(), StandardCharsets.UTF_8)
                    .replace("-----BEGIN PUBLIC KEY-----", "")
                    .replace("-----END PUBLIC KEY-----", "")
                    .replaceAll("\\s+", "");

            KeyFactory kf = KeyFactory.getInstance("RSA");
            PKCS8EncodedKeySpec privSpec = new PKCS8EncodedKeySpec(Base64.getDecoder().decode(privateKeyContent));
            RSAPrivateKey privateKey = (RSAPrivateKey) kf.generatePrivate(privSpec);

            X509EncodedKeySpec pubSpec = new X509EncodedKeySpec(Base64.getDecoder().decode(publicKeyContent));
            this.publicKey = (RSAPublicKey) kf.generatePublic(pubSpec);

            this.algorithm = Algorithm.RSA256(this.publicKey, privateKey);
            log.info("Initialized RS256 JWT Token Service with 2048-bit RSA keys");
        } catch (Exception e) {
            log.error("Failed to initialize RS256 keys: {}", e.getMessage(), e);
            throw new IllegalStateException("RSA keys could not be loaded", e);
        }
    }

    public String generateToken(String userId, String email, String role, String name) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return JWT.create()
                .withIssuer(issuer)
                .withSubject(userId)
                .withClaim("email", email)
                .withClaim("roles", List.of(role))
                .withClaim("role", role)
                .withClaim("name", name)
                .withIssuedAt(now)
                .withExpiresAt(expiry)
                .sign(algorithm);
    }

    public com.auth0.jwt.interfaces.DecodedJWT verifyToken(String token) {
        return JWT.require(algorithm).withIssuer(issuer).build().verify(token);
    }

    public Map<String, Object> getJwks() {
        if (publicKey == null) return Map.of("keys", List.of());

        Map<String, Object> jwk = new LinkedHashMap<>();
        jwk.put("kty", "RSA");
        jwk.put("use", "sig");
        jwk.put("alg", "RS256");
        jwk.put("kid", "devcollab-key-1");
        jwk.put("n", Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey.getModulus().toByteArray()));
        jwk.put("e", Base64.getUrlEncoder().withoutPadding().encodeToString(publicKey.getPublicExponent().toByteArray()));

        return Map.of("keys", List.of(jwk));
    }
}

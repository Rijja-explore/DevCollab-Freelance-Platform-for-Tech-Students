package com.devcollab.auth.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.devcollab.auth.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;

@Service
public class JwtService {
    private final Algorithm algorithm;
    private final String issuer;
    private final long accessTokenMs;

    public JwtService(@Value("${jwt.issuer:devcollab-auth}") String issuer,
                      @Value("${jwt.access-token-expiration-ms:3600000}") long accessTokenMs) {
        this.issuer = issuer;
        this.accessTokenMs = accessTokenMs;
        try {
            KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
            kpg.initialize(2048);
            var kp = kpg.generateKeyPair();
            this.algorithm = Algorithm.RSA256((RSAPublicKey) kp.getPublic(), (RSAPrivateKey) kp.getPrivate());
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    public String generateAccessToken(User user) {
        Instant now = Instant.now();
        return JWT.create().withIssuer(issuer).withSubject(user.getId()).withClaim("email", user.getEmail()).withClaim("role", user.getRole().name()).withIssuedAt(Date.from(now)).withExpiresAt(Date.from(now.plusMillis(accessTokenMs))).sign(algorithm);
    }
}

package com.devcollab.discovery.auth;

import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AuthController {

    private final JwtTokenService jwtTokenService;

    @GetMapping("/.well-known/jwks.json")
    public ResponseEntity<Map<String, Object>> getJwks() {
        return ResponseEntity.ok(jwtTokenService.getJwks());
    }

    @PostMapping("/api/auth/token")
    public ResponseEntity<Map<String, Object>> getToken(@RequestBody TokenRequest request) {
        String role = request.getRole() != null ? request.getRole().toUpperCase() : "STARTUP";
        String userId = request.getUserId() != null && !request.getUserId().isBlank()
                ? request.getUserId()
                : UUID.randomUUID().toString();
        String email = request.getEmail() != null && !request.getEmail().isBlank()
                ? request.getEmail()
                : role.toLowerCase() + "@devcollab.local";
        String name = request.getName() != null && !request.getName().isBlank()
                ? request.getName()
                : role.charAt(0) + role.substring(1).toLowerCase() + " User";

        String token = jwtTokenService.generateToken(userId, email, role, name);

        return ResponseEntity.ok(Map.of(
                "token", token,
                "accessToken", token,
                "userId", userId,
                "email", email,
                "role", role,
                "name", name
        ));
    }

    @PostMapping("/api/auth/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        String role = request.getEmail() != null && request.getEmail().contains("student") ? "STUDENT" : "STARTUP";
        String userId = UUID.nameUUIDFromBytes(request.getEmail().getBytes()).toString();
        String token = jwtTokenService.generateToken(userId, request.getEmail(), role, "DevCollab Member");

        return ResponseEntity.ok(Map.of(
                "token", token,
                "accessToken", token,
                "userId", userId,
                "email", request.getEmail(),
                "role", role
        ));
    }

    @Data
    public static class TokenRequest {
        private String role;
        private String userId;
        private String email;
        private String name;
    }

    @Data
    public static class LoginRequest {
        private String email;
        private String password;
    }
}

package com.devcollab.discovery.auth;

import com.auth0.jwt.interfaces.DecodedJWT;
import com.devcollab.discovery.entity.StudentProfile;
import com.devcollab.discovery.repository.StudentProfileRepository;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final JwtTokenService jwtTokenService;
    private final StudentProfileRepository studentProfileRepository;

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
        String email = request.getEmail() != null ? request.getEmail().trim() : "";
        String role = "STARTUP";
        if (email.toLowerCase().contains("student") || email.toLowerCase().contains("alex") || email.toLowerCase().contains("riya")) {
            role = "STUDENT";
        } else if (email.toLowerCase().contains("admin")) {
            role = "ADMIN";
        }

        String name = "DevCollab Member";
        if (role.equals("STUDENT")) name = "Alex Chen";
        else if (role.equals("STARTUP")) name = "Apex Innovators";
        else if (role.equals("ADMIN")) name = "System Administrator";

        String userId = UUID.nameUUIDFromBytes(email.getBytes()).toString();
        String token = jwtTokenService.generateToken(userId, email, role, name);

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("accessToken", token);
        response.put("userId", userId);
        response.put("email", email);
        response.put("role", role);
        response.put("name", name);

        if ("STUDENT".equals(role)) {
            studentProfileRepository.findByUserId(userId).ifPresent(p -> {
                response.put("profileId", p.getId());
                response.put("skills", p.getSkills());
                response.put("headline", p.getHeadline());
                response.put("hourlyRate", p.getHourlyRate());
                response.put("rating", p.getRating());
            });
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/auth/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim() : "user@devcollab.local";
        String role = request.getRole() != null ? request.getRole().toUpperCase().trim() : "STUDENT";
        String name = request.getName() != null && !request.getName().isBlank() ? request.getName().trim() : "New User";
        String userId = UUID.nameUUIDFromBytes(email.getBytes()).toString();

        String token = jwtTokenService.generateToken(userId, email, role, name);

        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("accessToken", token);
        response.put("userId", userId);
        response.put("email", email);
        response.put("role", role);
        response.put("name", name);

        if ("STUDENT".equals(role)) {
            StudentProfile profile = studentProfileRepository.findByUserId(userId).orElseGet(() -> {
                StudentProfile p = new StudentProfile();
                p.setId(UUID.randomUUID().toString());
                p.setUserId(userId);
                p.setFullName(name);
                p.setHeadline(request.getHeadline() != null ? request.getHeadline() : "Computer Science Student & Full Stack Developer");
                p.setBio(request.getBio() != null ? request.getBio() : "Passionate about building scalable web apps and collaborative software.");
                p.setHourlyRate(request.getHourlyRate() != null ? request.getHourlyRate() : BigDecimal.valueOf(35.00));
                p.setRating(4.9);
                if (request.getSkills() != null && !request.getSkills().isEmpty()) {
                    p.setSkills(new HashSet<>(request.getSkills()));
                } else {
                    p.setSkills(new HashSet<>(List.of("React", "TypeScript", "Node.js", "Java", "PostgreSQL")));
                }
                return studentProfileRepository.save(p);
            });
            response.put("profileId", profile.getId());
            response.put("skills", profile.getSkills());
            response.put("headline", profile.getHeadline());
            response.put("hourlyRate", profile.getHourlyRate());
            response.put("rating", profile.getRating());
        }

        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/auth/me")
    public ResponseEntity<Map<String, Object>> getMe(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("error", "Missing or invalid authorization header"));
        }

        try {
            String token = authHeader.substring(7);
            DecodedJWT jwt = jwtTokenService.verifyToken(token);
            String userId = jwt.getSubject();
            String email = jwt.getClaim("email").asString();
            String role = jwt.getClaim("role").asString();
            String name = jwt.getClaim("name").asString();

            Map<String, Object> response = new HashMap<>();
            response.put("userId", userId);
            response.put("email", email);
            response.put("role", role);
            response.put("name", name);

            if ("STUDENT".equalsIgnoreCase(role)) {
                studentProfileRepository.findByUserId(userId).ifPresent(p -> {
                    response.put("profileId", p.getId());
                    response.put("skills", p.getSkills());
                    response.put("headline", p.getHeadline());
                    response.put("bio", p.getBio());
                    response.put("hourlyRate", p.getHourlyRate());
                    response.put("rating", p.getRating());
                });
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.warn("Failed to verify token for /api/auth/me: {}", e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error", "Invalid or expired token"));
        }
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

    @Data
    public static class RegisterRequest {
        private String email;
        private String password;
        private String role;
        private String name;
        private String headline;
        private String bio;
        private BigDecimal hourlyRate;
        private List<String> skills;
    }
}


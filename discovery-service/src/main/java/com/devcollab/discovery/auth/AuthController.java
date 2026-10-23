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
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @GetMapping("/.well-known/jwks.json")
    public ResponseEntity<Map<String, Object>> getJwks() {
        return ResponseEntity.ok(jwtTokenService.getJwks());
    }

    @PostMapping("/api/auth/token")
    public ResponseEntity<Map<String, Object>> getToken(@RequestBody TokenRequest request) {
        String role = request.getRole() != null ? request.getRole().toUpperCase() : "STARTUP";
        String email = request.getEmail() != null && !request.getEmail().isBlank()
                ? request.getEmail()
                : role.toLowerCase() + "@devcollab.local";
        String userId = request.getUserId() != null && !request.getUserId().isBlank()
                ? request.getUserId()
                : UUID.nameUUIDFromBytes(email.getBytes()).toString();
        String name = request.getName() != null && !request.getName().isBlank()
                ? request.getName()
                : role.charAt(0) + role.substring(1).toLowerCase() + " User";

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
                p.setId(userId);
                p.setUserId(userId);
                p.setFullName(name);
                p.setHeadline("Computer Science Student & Full Stack Developer");
                p.setBio("Passionate about building scalable web apps and collaborative software.");
                p.setHourlyRate(BigDecimal.valueOf(35.00));
                p.setSkills(new HashSet<>(List.of("React", "TypeScript", "Node.js", "PostgreSQL", "Spring Boot")));
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

    @PostMapping("/api/auth/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest request) {
        String email = request.getEmail() != null ? request.getEmail().trim() : "";
        String userId = UUID.nameUUIDFromBytes(email.getBytes()).toString();
        String role = null;
        String name = null;

        // 1. Try to find user in auth_user table
        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT id, email, first_name, last_name, role FROM auth_user WHERE LOWER(email) = LOWER(?)",
                email
            );
            if (!rows.isEmpty()) {
                Map<String, Object> row = rows.get(0);
                role = (String) row.get("role");
                String fn = (String) row.get("first_name");
                String ln = (String) row.get("last_name");
                name = (fn != null ? fn : "") + (ln != null && !ln.isBlank() ? " " + ln : "");
                name = name.trim();
                if (row.get("id") != null) {
                    userId = row.get("id").toString();
                }
            }
        } catch (Exception e) {
            log.warn("Could not query auth_user: {}", e.getMessage());
        }

        // 2. Check if a student profile exists for this userId
        if (role == null) {
            Optional<StudentProfile> studentOpt = studentProfileRepository.findByUserId(userId);
            if (studentOpt.isPresent()) {
                role = "STUDENT";
                name = studentOpt.get().getFullName();
            }
        }

        // 3. Fallback heuristics if not found in db
        if (role == null) {
            if (email.toLowerCase().contains("student") || email.toLowerCase().contains("alex") || email.toLowerCase().contains("riya")) {
                role = "STUDENT";
            } else if (email.toLowerCase().contains("admin")) {
                role = "ADMIN";
            } else {
                role = "STARTUP";
            }
        }

        if (name == null || name.isBlank()) {
            if ("STUDENT".equals(role)) name = "Alex Chen";
            else if ("STARTUP".equals(role)) name = "Apex Innovators";
            else if ("ADMIN".equals(role)) name = "System Administrator";
            else name = "DevCollab Member";
        }

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

        // Persist to auth_user table so subsequent logins preserve this exact role
        try {
            jdbcTemplate.update(
                "INSERT INTO auth_user (id, email, password, first_name, last_name, role, status) " +
                "VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE') " +
                "ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name",
                userId, email.toLowerCase(), request.getPassword() != null ? request.getPassword() : "nopass",
                name, "", role
            );
        } catch (Exception e) {
            log.warn("Could not save to auth_user table: {}", e.getMessage());
        }

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


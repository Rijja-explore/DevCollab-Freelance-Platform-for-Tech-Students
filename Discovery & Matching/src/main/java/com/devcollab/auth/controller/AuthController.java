package com.devcollab.auth.controller;

import com.devcollab.auth.dto.request.*;
import com.devcollab.auth.dto.response.*;
import com.devcollab.auth.entity.User;
import com.devcollab.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final AuthService authService; private final PasswordEncoder passwordEncoder;
    public AuthController(AuthService authService, PasswordEncoder passwordEncoder){ this.authService=authService; this.passwordEncoder=passwordEncoder; }

    @PostMapping("/register") public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest req){ User u = authService.register(req); return ResponseEntity.status(HttpStatus.CREATED).body(UserResponse.builder().id(u.getId()).email(u.getEmail()).firstName(u.getFirstName()).lastName(u.getLastName()).role(u.getRole().name()).build()); }
    @PostMapping("/login") public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req){ Optional<User> userOpt = authService.findByEmail(req.getEmail()); if(userOpt.isEmpty() || !passwordEncoder.matches(req.getPassword(), userOpt.get().getPassword())) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build(); User user = userOpt.get(); String access = authService.issueAccessToken(user); String refresh = Base64.getUrlEncoder().withoutPadding().encodeToString((user.getId()+":"+Instant.now().toEpochMilli()).getBytes()); authService.createRefreshToken(user, Integer.toHexString(refresh.hashCode()), Instant.now().plusSeconds(30L*24*3600)); return ResponseEntity.ok(AuthResponse.builder().accessToken(access).refreshToken(refresh).expiresIn(3600).user(UserResponse.builder().id(user.getId()).email(user.getEmail()).firstName(user.getFirstName()).lastName(user.getLastName()).role(user.getRole().name()).build()).build()); }
    @GetMapping("/me") public ResponseEntity<UserResponse> me(@RequestHeader(value="X-User-Id", required=false) String userId){ if(userId==null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build(); return authService.findById(userId).map(u->ResponseEntity.ok(UserResponse.builder().id(u.getId()).email(u.getEmail()).firstName(u.getFirstName()).lastName(u.getLastName()).role(u.getRole().name()).build())).orElseGet(()->ResponseEntity.status(HttpStatus.NOT_FOUND).build()); }
}

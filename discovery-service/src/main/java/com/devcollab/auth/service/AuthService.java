package com.devcollab.auth.service;

import com.devcollab.auth.dto.request.RegisterRequest;
import com.devcollab.auth.entity.*;
import com.devcollab.auth.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.Instant;
import java.util.Optional;

@Service
public class AuthService {
    private final UserRepository userRepository; private final RefreshTokenRepository refreshTokenRepository; private final JwtService jwtService; private final PasswordEncoder passwordEncoder;
    public AuthService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository, JwtService jwtService, PasswordEncoder passwordEncoder) { this.userRepository=userRepository; this.refreshTokenRepository=refreshTokenRepository; this.jwtService=jwtService; this.passwordEncoder=passwordEncoder; }
    public User register(RegisterRequest req) { if (userRepository.existsByEmail(req.getEmail())) throw new IllegalArgumentException("Email already exists"); var user = User.builder().email(req.getEmail()).password(passwordEncoder.encode(req.getPassword())).firstName(req.getFirstName()).lastName(req.getLastName()).role(req.getRole()).status(AccountStatus.ACTIVE).build(); return userRepository.save(user); }
    public Optional<User> findByEmail(String email){ return userRepository.findByEmail(email); }
    public Optional<User> findById(String id){ return userRepository.findById(id); }
    public String issueAccessToken(User user){ return jwtService.generateAccessToken(user); }
    public RefreshToken createRefreshToken(User user, String tokenHash, Instant expiresAt){ return refreshTokenRepository.save(RefreshToken.builder().userId(user.getId()).tokenHash(tokenHash).expiresAt(expiresAt).revoked(false).build()); }
}

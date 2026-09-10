package com.devcollab.auth.repository;

import com.devcollab.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> { Optional<RefreshToken> findByTokenHash(String tokenHash); }

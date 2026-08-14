package com.devcollab.auth.repository;

import com.devcollab.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> { Optional<User> findByEmail(String email); boolean existsByEmail(String email); }

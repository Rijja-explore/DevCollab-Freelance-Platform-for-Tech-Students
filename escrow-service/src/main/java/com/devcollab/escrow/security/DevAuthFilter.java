package com.devcollab.escrow.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@Component
@Profile("dev")
@Slf4j
public class DevAuthFilter extends OncePerRequestFilter {

    public static final String DEV_USER_LABEL = "test-startup-001";
    public static final UUID DEV_USER_ID = UUID.nameUUIDFromBytes(DEV_USER_LABEL.getBytes(StandardCharsets.UTF_8));
    public static final String DEV_EMAIL = DEV_USER_LABEL + "@dev.local";
    public static final List<String> DEV_ROLES = List.of("STARTUP", "ADMIN");

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() == null) {
            UserPrincipal principal = new UserPrincipal(DEV_USER_ID, DEV_EMAIL, DEV_ROLES);
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    principal, null, principal.getAuthorities());
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }
}
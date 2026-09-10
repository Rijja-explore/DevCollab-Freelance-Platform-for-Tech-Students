package com.devcollab.escrow.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Simple in-process sliding-window rate limiter.
 *
 * Protects high-value mutation endpoints (release milestone, create contract)
 * against abuse / accidental duplicate submission storms.
 *
 * Counts are reset every minute via a @Scheduled task.
 * For multi-instance deployments, replace with Redis + Bucket4j or similar.
 */
@Component
@Slf4j
public class RateLimiterFilter extends OncePerRequestFilter {

    /** Max requests per IP per window (default: 30). */
    @Value("${rate-limiter.max-requests-per-minute:30}")
    private int maxRequestsPerMinute;

    /** Counter map: IP → request count in current window */
    private final ConcurrentHashMap<String, AtomicInteger> counters = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        // Only rate-limit mutation endpoints on payment/contract paths
        String method = request.getMethod();
        String uri    = request.getRequestURI();

        boolean isMutation = HttpMethod.POST.matches(method) || HttpMethod.PATCH.matches(method);
        boolean isRatedPath = uri.contains("/api/payments/milestones")
                || uri.contains("/api/milestones")
                || uri.contains("/api/contracts")
                || uri.contains("/api/payments/contracts");

        // Exclude webhook — it has HMAC verification as its own guard
        boolean isWebhook = uri.contains("/webhook");

        return !(isMutation && isRatedPath) || isWebhook;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String clientIp = resolveClientIp(request);
        int count = counters
                .computeIfAbsent(clientIp, k -> new AtomicInteger(0))
                .incrementAndGet();

        if (count > maxRequestsPerMinute) {
            log.warn("Rate limit exceeded for IP {} on {} {} (count={})",
                    clientIp, request.getMethod(), request.getRequestURI(), count);
            sendTooManyRequestsResponse(response, clientIp);
            return;
        }

        filterChain.doFilter(request, response);
    }

    /** Resets all counters every minute. */
    @Scheduled(fixedDelay = 60_000)
    public void resetCounters() {
        int buckets = counters.size();
        counters.clear();
        if (buckets > 0) {
            log.debug("Rate-limiter counters reset. {} IP buckets cleared.", buckets);
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        // Honour reverse-proxy forwarded header when present
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private void sendTooManyRequestsResponse(HttpServletResponse response, String ip) throws IOException {
        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                "{\"success\":false,\"error\":{\"code\":\"RATE_LIMIT_EXCEEDED\"," +
                "\"message\":\"Too many requests. Please slow down and try again in a minute.\"}}");
    }
}

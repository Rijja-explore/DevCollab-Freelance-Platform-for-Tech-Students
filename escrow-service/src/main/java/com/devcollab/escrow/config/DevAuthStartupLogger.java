package com.devcollab.escrow.config;

import com.devcollab.escrow.security.DevAuthFilter;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
@Slf4j
public class DevAuthStartupLogger {

    @PostConstruct
    public void logEnabled() {
        log.warn("DEVELOPMENT MOCK AUTH ENABLED");
        log.warn("Development user label={}, email={}, roles={}",
                DevAuthFilter.DEV_USER_LABEL,
                DevAuthFilter.DEV_EMAIL,
                DevAuthFilter.DEV_ROLES);
    }
}
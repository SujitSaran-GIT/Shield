package com.guardian.config;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

@Component
@RequiredArgsConstructor
public class StartupValidator {
    private final JwtConfig jwt;
    @Value("${cors.allowed-origins:http://localhost:5173}") private String origins;
    @Value("${rate-limit.mode:redis}") private String rateMode;
    @Value("${rate-limit.outage-policy:fail-closed}") private String outage;

    @PostConstruct
    public void validateConfiguration() {
        if (!jwt.isSecretValid() || jwt.getSecret().contains("change-in-production")
                || jwt.getSecret().contains("replace-with") || jwt.getSecret().getBytes(StandardCharsets.UTF_8).length < 32)
            throw new IllegalStateException("JWT_SECRET must be an operator-provided random secret of at least 32 bytes");
        if (!java.util.Set.of("redis", "local").contains(rateMode)
                || !java.util.Set.of("fail-closed", "local").contains(outage))
            throw new IllegalStateException("Invalid rate limiting mode or outage policy");
        if (Arrays.stream(origins.split(",")).anyMatch(s -> s.contains("*") || s.isBlank()))
            throw new IllegalStateException("CORS requires explicit origins");
    }
}

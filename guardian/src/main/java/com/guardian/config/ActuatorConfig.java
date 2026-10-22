package com.guardian.config;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.autoconfigure.metrics.MeterRegistryCustomizer;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import javax.sql.DataSource;
import java.sql.Connection;

@Configuration
@RequiredArgsConstructor
public class ActuatorConfig {
    
    /**
     * Customizes the Meter Registry with common tags
     */
    @Bean
    public MeterRegistryCustomizer<MeterRegistry> metricsCommonTags() {
        return registry -> registry.config()
                .commonTags(
                        "application", "guardian-auth-platform",
                        "environment", System.getProperty("spring.profiles.active", "default")
                );
    }
    
    /**
     * Custom Health Indicator for Database
     */
    @Bean
    public HealthIndicator databaseHealthIndicator(DataSource dataSource) {
        return () -> {
            try (Connection connection = dataSource.getConnection()) {
                if (connection.isValid(1)) {
                    return Health.up()
                            .withDetail("database", "PostgreSQL")
                            .withDetail("status", "Available")
                            .build();
                }
            } catch (Exception e) {
                return Health.down()
                        .withDetail("database", "PostgreSQL")
                        .withDetail("status", "Unavailable")
                        .build();
            }
            return Health.down()
                    .withDetail("database", "PostgreSQL")
                    .withDetail("status", "Connection validation failed")
                    .build();
        };
    }
    
    /**
     * Custom Health Indicator for Redis
     */
    @Bean
    public HealthIndicator redisHealthIndicator(RedisConnectionFactory redisConnectionFactory) {
        return () -> {
            try (var connection = redisConnectionFactory.getConnection()) {
                connection.ping();
                return Health.up()
                        .withDetail("cache", "Redis")
                        .withDetail("status", "Available")
                        .build();
            } catch (Exception e) {
                return Health.down()
                        .withDetail("cache", "Redis")
                        .withDetail("status", "Unavailable")
                        .build();
            }
        };
    }

    @Bean
    public HealthIndicator geoIpHealthIndicator(com.guardian.service.GeoIpService geoIp) {
        return () -> geoIp.isAvailable()
                ? Health.up().withDetail("precision", "Approximate IP-derived location").build()
                : Health.unknown().withDetail("status", "Optional lookup unavailable").build();
    }
    
    /**
     * Custom metrics for authentication events
     */
    @Bean
    public Timer loginTimer(MeterRegistry registry) {
        return Timer.builder("auth.login")
                .description("Time taken to process login requests")
                .tag("operation", "login")
                .register(registry);
    }
    
    @Bean
    public Timer registrationTimer(MeterRegistry registry) {
        return Timer.builder("auth.registration")
                .description("Time taken to process registration requests")
                .tag("operation", "registration")
                .register(registry);
    }
    
    @Bean
    public Timer tokenRefreshTimer(MeterRegistry registry) {
        return Timer.builder("auth.token.refresh")
                .description("Time taken to refresh tokens")
                .tag("operation", "token-refresh")
                .register(registry);
    }
}


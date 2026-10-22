package com.guardian.service;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class RateLimitServiceTest {
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final RateLimitService service = new RateLimitService(redis, new SimpleMeterRegistry());

    @Test void localLimitEnforcesBoundaryAndIsolatesIdentifiers() {
        ReflectionTestUtils.setField(service, "mode", "local");
        for (int i = 0; i < 5; i++) assertThat(service.check("login", "ip-a", 5, Duration.ofMinutes(1)).allowed()).isTrue();
        var denied = service.check("login", "ip-a", 5, Duration.ofMinutes(1));
        assertThat(denied.allowed()).isFalse();
        assertThat(denied.retryAfterSeconds()).isBetween(1L, 60L);
        assertThat(service.check("login", "ip-b", 5, Duration.ofMinutes(1)).allowed()).isTrue();
    }

    @Test void concurrentRequestsCannotExceedCapacity() throws Exception {
        ReflectionTestUtils.setField(service, "mode", "local");
        try (ExecutorService pool = Executors.newFixedThreadPool(8)) {
            List<Future<Boolean>> results = new ArrayList<>();
            for (int i = 0; i < 100; i++) results.add(pool.submit(() -> service.check("login", "same-ip", 5, Duration.ofMinutes(1)).allowed()));
            int allowed = 0;
            for (Future<Boolean> result : results) if (result.get(10, TimeUnit.SECONDS)) allowed++;
            assertThat(allowed).isEqualTo(5);
        }
    }

    @Test void localStorageCardinalityIsBounded() {
        ReflectionTestUtils.setField(service, "mode", "local");
        ReflectionTestUtils.setField(service, "maxKeys", 2);
        assertThat(service.check("login", "one", 5, Duration.ofMinutes(1)).allowed()).isTrue();
        assertThat(service.check("login", "two", 5, Duration.ofMinutes(1)).allowed()).isTrue();
        assertThat(service.check("login", "three", 5, Duration.ofMinutes(1)).allowed()).isFalse();
    }

    @Test void redisOutageFailsClosedByDefault() {
        when(redis.execute(any(RedisScript.class), anyList(), anyString())).thenThrow(new RedisConnectionFailureException("offline"));
        assertThatThrownBy(() -> service.check("login", "ip", 5, Duration.ofMinutes(1)))
                .isInstanceOf(ResponseStatusException.class).satisfies(ex ->
                        assertThat(((ResponseStatusException) ex).getStatusCode().value()).isEqualTo(503));
    }

    @Test void explicitOutageFallbackStillEnforcesLimits() {
        ReflectionTestUtils.setField(service, "outagePolicy", "local");
        when(redis.execute(any(RedisScript.class), anyList(), anyString())).thenThrow(new RedisConnectionFailureException("offline"));
        assertThat(service.check("login", "ip", 1, Duration.ofMinutes(1)).allowed()).isTrue();
        assertThat(service.check("login", "ip", 1, Duration.ofMinutes(1)).allowed()).isFalse();
    }

    @Test void sharedRedisDecisionUsesAtomicCounterAndTtl() {
        when(redis.execute(any(RedisScript.class), anyList(), anyString())).thenReturn(List.of(1L, 5000L), List.of(6L, 4000L));
        assertThat(service.check("login", "ip", 5, Duration.ofMinutes(1)).allowed()).isTrue();
        var denied = service.check("login", "ip", 5, Duration.ofMinutes(1));
        assertThat(denied.allowed()).isFalse();
        assertThat(denied.retryAfterSeconds()).isEqualTo(4);
    }

    @Test void localFailedAttemptsBlockAndResetWithoutDisablingTheRequestLimit() {
        ReflectionTestUtils.setField(service, "mode", "local");
        for (int i = 0; i < 5; i++) service.recordFailedLogin("ip-a");
        assertThat(service.getFailedLoginAttempts("ip-a")).isEqualTo(5);
        assertThat(service.isIpBlocked("ip-a")).isTrue();
        assertThat(service.isIpBlocked("ip-b")).isFalse();
        service.resetFailedAttempts("ip-a", "login");
        assertThat(service.getFailedLoginAttempts("ip-a")).isZero();
        assertThat(service.isIpBlocked("ip-a")).isFalse();
        service.recordFailedRegistration("ip-a");
        assertThat(service.getFailedRegistrationAttempts("ip-a")).isEqualTo(1);
    }

    @Test void redisOutageFallbackRetainsFailedAttemptAccounting() {
        ReflectionTestUtils.setField(service, "outagePolicy", "local");
        when(redis.execute(any(RedisScript.class), anyList(), anyString()))
                .thenThrow(new RedisConnectionFailureException("offline"));
        when(redis.opsForValue()).thenThrow(new RedisConnectionFailureException("offline"));
        for (int i = 0; i < 5; i++) service.recordFailedLogin("ip-a");
        assertThat(service.isIpBlocked("ip-a")).isTrue();
        service.resetFailedAttempts("ip-a", "login");
        assertThat(service.isIpBlocked("ip-a")).isFalse();
    }

    @Test void subMillisecondPolicyIsRejectedBeforeUsingRedis() {
        assertThatThrownBy(() -> service.check("login", "ip", 1, Duration.ofNanos(1)))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(redis);
    }
}

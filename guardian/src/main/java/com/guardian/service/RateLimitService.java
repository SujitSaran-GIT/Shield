package com.guardian.service;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/** Atomic shared limits by default. Bucket4j remains available for explicit single-instance operation. */
@Service
@RequiredArgsConstructor
public class RateLimitService {
    private final StringRedisTemplate redis;
    private final MeterRegistry meters;
    private final ConcurrentHashMap<String, LocalLimit> buckets = new ConcurrentHashMap<>();
    private static final DefaultRedisScript<List> WINDOW = new DefaultRedisScript<>("""
        local n = redis.call('INCR', KEYS[1])
        if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
        local ttl = redis.call('PTTL', KEYS[1])
        if ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end
        return {n, ttl}
        """, List.class);
    @Value("${rate-limit.mode:redis}") private String mode = "redis";
    @Value("${rate-limit.outage-policy:fail-closed}") private String outagePolicy = "fail-closed";
    @Value("${rate-limit.local-max-keys:10000}") private int maxKeys = 10000;
    @Value("${rate-limit.login.max-attempts:5}") private int loginMaxAttempts = 5;
    @Value("${rate-limit.login.duration-minutes:5}") private int loginMinutes = 5;
    @Value("${rate-limit.registration.success-per-minutes:5}") private int registrationMinutes = 5;
    @Value("${rate-limit.registration.max-failed-attempts:5}") private int registrationAttempts = 5;

    public record Decision(boolean allowed, long retryAfterSeconds) {}
    private record LocalLimit(Bucket bucket, long expiresAt, int capacity) {}

    public Decision check(String operation, String identifier, int capacity, Duration window) {
        if (capacity < 1 || window.isZero() || window.isNegative() || window.toMillis() < 1)
            throw new IllegalArgumentException("Invalid rate policy");
        String key = "shield:rate:" + operation + ":" + digest(identifier == null ? "unknown" : identifier);
        Decision decision;
        if ("local".equals(mode)) decision = local(key, capacity, window);
        else {
            try {
                List<?> values = redis.execute(WINDOW, List.of(key), Long.toString(window.toMillis()));
                if (values == null || values.size() != 2) throw new IllegalStateException("Rate storage unavailable");
                decision = new Decision(((Number) values.get(0)).longValue() <= capacity,
                        Math.max(1, (((Number) values.get(1)).longValue() + 999) / 1000));
            } catch (Exception e) {
                meters.counter("security.rate_limit.storage_errors").increment();
                if (!"local".equals(outagePolicy)) throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Security protection temporarily unavailable; retry later");
                decision = local(key, capacity, window);
            }
        }
        meters.counter("security.rate_limit.requests", "operation", operation,
                "outcome", decision.allowed() ? "allowed" : "denied").increment();
        return decision;
    }

    private Decision local(String key, int capacity, Duration window) {
        long now = System.currentTimeMillis();
        // Bound attacker-controlled cardinality. Reject new keys when capacity is exhausted.
        synchronized (buckets) {
            LocalLimit entry = buckets.get(key);
            if (entry != null && entry.expiresAt() <= now) { buckets.remove(key); entry = null; }
            if (entry == null) {
                if (buckets.size() >= maxKeys) removeExpiredBuckets();
                if (buckets.size() >= maxKeys) return new Decision(false, 60);
                Bucket bucket = Bucket.builder().addLimit(Bandwidth.classic(capacity,
                        Refill.intervally(capacity, window))).build();
                entry = new LocalLimit(bucket, now + window.toMillis(), capacity);
                buckets.put(key, entry);
            }
            return new Decision(entry.bucket().tryConsume(1), Math.max(1, (entry.expiresAt() - now + 999) / 1000));
        }
    }

    @Scheduled(fixedDelay = 60000)
    public void removeExpiredBuckets() {
        long now = System.currentTimeMillis();
        buckets.entrySet().removeIf(e -> e.getValue().expiresAt() <= now);
    }

    public boolean allowAccountAttempt(String operation, String account, int capacity, int windowMinutes) {
        return check(operation, account == null ? null : account.trim().toLowerCase(java.util.Locale.ROOT),
                capacity, Duration.ofMinutes(windowMinutes)).allowed();
    }
    public boolean allowLoginAttempt(String ip) { return check("login", ip, loginMaxAttempts, Duration.ofMinutes(loginMinutes)).allowed(); }
    public boolean allowRegistrationAttempt(String ip, boolean success) {
        return check(success ? "registration-success" : "registration", ip, success ? 1 : registrationAttempts,
                Duration.ofMinutes(success ? registrationMinutes : 15)).allowed();
    }
    // Compatibility counters also use atomic expiring storage; failures never silently disable protection.
    public void recordFailedLogin(String ip) { check("failed-login", ip, Integer.MAX_VALUE, Duration.ofMinutes(30)); }
    public void recordFailedRegistration(String ip) { check("failed-registration", ip, Integer.MAX_VALUE, Duration.ofMinutes(15)); }
    public int getFailedLoginAttempts(String ip) { return counter("failed-login", ip); }
    public int getFailedRegistrationAttempts(String ip) { return counter("failed-registration", ip); }
    private int counter(String operation, String ip) {
        if ("local".equals(mode)) return localCounter(operation, ip);
        try {
            String value = redis.opsForValue().get("shield:rate:" + operation + ":" + digest(ip));
            return value == null ? 0 : Integer.parseInt(value);
        } catch (Exception e) {
            if ("local".equals(outagePolicy)) return localCounter(operation, ip);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Security protection temporarily unavailable");
        }
    }
    private int localCounter(String operation, String identifier) {
        synchronized (buckets) {
            String key = "shield:rate:" + operation + ":" + digest(identifier);
            LocalLimit entry = buckets.get(key);
            if (entry == null) return 0;
            if (entry.expiresAt() <= System.currentTimeMillis()) {
                buckets.remove(key);
                return 0;
            }
            return (int) (entry.capacity() - entry.bucket().getAvailableTokens());
        }
    }
    public void resetFailedAttempts(String ip, String type) {
        buckets.remove("shield:rate:failed-" + type + ":" + digest(ip));
        if ("local".equals(mode)) return;
        try { redis.delete("shield:rate:failed-" + type + ":" + digest(ip)); }
        catch (Exception e) { meters.counter("security.rate_limit.storage_errors").increment(); }
    }
    public boolean isIpBlocked(String ip) { return getFailedLoginAttempts(ip) >= loginMaxAttempts; }
    private static String digest(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest((value == null ? "unknown" : value).getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}

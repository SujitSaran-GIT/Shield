package com.guardian.security;

import com.guardian.entity.enums.EventType;
import com.guardian.service.AuditService;
import com.guardian.service.RateLimitService;
import com.guardian.util.IpUtil;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;
import java.io.IOException;
import java.time.Duration;
import java.util.Set;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {
    private final RateLimitService limits;
    private final AuditService audits;
    @Value("${rate-limit.endpoint.auth-capacity:30}") private int authCapacity = 30;
    @Value("${rate-limit.endpoint.write-capacity:60}") private int writeCapacity = 60;
    @Value("${rate-limit.endpoint.privileged-capacity:10}") private int privilegedCapacity = 10;
    @Value("${rate-limit.endpoint.window-seconds:60}") private int windowSeconds = 60;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/") || !Set.of("POST", "PUT", "PATCH", "DELETE").contains(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String operation = path.contains("bootstrap") || path.contains("invitations") || path.contains("credentials")
                || path.contains("rotate") ? "privileged-write" : path.startsWith("/api/auth/") ? "auth-write" : "api-write";
        int capacity = operation.equals("privileged-write") ? privilegedCapacity : operation.equals("auth-write") ? authCapacity : writeCapacity;
        String ip = IpUtil.getClientIpAddress(request);
        try {
            RateLimitService.Decision decision = limits.check(operation, ip, capacity, Duration.ofSeconds(windowSeconds));
            if (!decision.allowed()) {
                // Do not persist request bodies, query strings, or authorization headers.
                try { audits.logEvent(EventType.RATE_LIMIT_EXCEEDED, null, null, null, null, ip,
                        IpUtil.getUserAgent(request), 429, "Request limit exceeded: " + operation); }
                catch (Exception ignored) { /* limiter response must survive an audit dependency outage */ }
                response.setHeader("Retry-After", Long.toString(decision.retryAfterSeconds()));
                respond(response, 429, "Too many requests; retry later");
                return;
            }
        } catch (ResponseStatusException unavailable) {
            response.setHeader("Retry-After", "60");
            respond(response, 503, "Security protection temporarily unavailable; retry later");
            return;
        }
        chain.doFilter(request, response);
    }

    private void respond(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.getWriter().write("{\"status\":" + status + ",\"message\":\"" + message + "\"}");
    }
}

package com.guardian.security;

import com.guardian.service.ClientService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ClientAuthenticationFilter extends OncePerRequestFilter {
    
    private final ClientService clientService;
    
    private static final List<String> PUBLIC_ENDPOINTS = Arrays.asList(
        "/api/auth/login",
        "/api/auth/register",
        "/api/auth/refresh",
        "/actuator",
        "/ws"
    );
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        
        // Skip client validation for public endpoints
        if (PUBLIC_ENDPOINTS.stream().anyMatch(path::startsWith)) {
            filterChain.doFilter(request, response);
            return;
        }
        
        try {
            String clientId = request.getHeader("X-Client-ID");
            String clientKey = request.getHeader("X-Client-Key");
            
            if (clientId != null && clientKey != null) {
                clientService.validateClient(clientId, clientKey);
            }
        } catch (Exception e) {
            log.error("Client authentication failed: {}", e.getMessage());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("{\"error\": \"Invalid client credentials\"}");
            return;
        }
        
        filterChain.doFilter(request, response);
    }
}

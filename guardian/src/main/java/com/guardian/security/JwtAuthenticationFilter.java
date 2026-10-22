package com.guardian.security;

import com.guardian.service.JwtService;
import com.guardian.service.AuthService;
import com.guardian.entity.User;
import org.springframework.beans.factory.ObjectProvider;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.Collections;
import java.util.ArrayList;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final ObjectProvider<AuthService> authService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request, 
                                   HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        try {
            String authHeader = request.getHeader("Authorization");
            
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                
                User user = authService.getObject().authenticateAccessToken(token);
                {
                    String role = AuthService.canonicalRole(user);
                    var authorities = new ArrayList<SimpleGrantedAuthority>();
                    authorities.add(new SimpleGrantedAuthority(role));
                    authorities.add(new SimpleGrantedAuthority("ROLE_" + role));
                    if ("SUPER_ADMIN".equals(role)) authorities.add(new SimpleGrantedAuthority("GUARDIAN_ADMIN"));
                    
                    UsernamePasswordAuthenticationToken authentication = 
                        new UsernamePasswordAuthenticationToken(
                            user.getId().toString(),
                            null, 
                            authorities
                        );
                    
                    authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            }
        } catch (Exception e) {
            SecurityContextHolder.clearContext();
            log.debug("Bearer authentication rejected");
        }
        
        filterChain.doFilter(request, response);
    }
}

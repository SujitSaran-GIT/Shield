package com.guardian.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.simp.config.ChannelRegistration;
import com.guardian.security.WebSocketAuthorization;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    private final ObjectProvider<WebSocketAuthorization> authorization;
    @Value("${cors.allowed-origins:http://localhost:5173}") private String origins;

    public WebSocketConfig(ObjectProvider<WebSocketAuthorization> authorization) { this.authorization = authorization; }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) { registration.interceptors(authorization.getObject().inbound()); }

    @Override
    public void configureClientOutboundChannel(ChannelRegistration registration) { registration.interceptors(authorization.getObject().outbound()); }
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins(java.util.Arrays.stream(origins.split(",")).map(String::trim).toArray(String[]::new))
                .withSockJS();
    }
}


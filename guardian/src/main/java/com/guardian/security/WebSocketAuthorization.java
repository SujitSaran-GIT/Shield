package com.guardian.security;

import com.guardian.entity.User;
import com.guardian.repository.UserRepository;
import com.guardian.repository.UserSessionRepository;
import com.guardian.service.AuthService;
import com.guardian.util.TokenFingerprint;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;
import java.security.Principal;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** Global streams are reserved for active platform administrators. No token is kept in socket state. */
@Component
@RequiredArgsConstructor
public class WebSocketAuthorization {
    private final ObjectProvider<AuthService> auth;
    private final UserRepository users;
    private final UserSessionRepository sessions;
    private final Map<String, SocketIdentity> identities = new ConcurrentHashMap<>();
    private static final Set<String> TOPICS = Set.of("/topic/health", "/topic/dashboard", "/topic/sessions", "/topic/alerts", "/topic/audit");
    record SocketIdentity(UUID userId, String tokenFingerprint) implements Principal {
        @Override public String getName() { return userId.toString(); }
    }

    public ChannelInterceptor inbound() {
        return new ChannelInterceptor() {
            @Override public Message<?> preSend(Message<?> message, MessageChannel channel) { return authorizeInbound(message); }
        };
    }
    public ChannelInterceptor outbound() {
        return new ChannelInterceptor() {
            @Override public Message<?> preSend(Message<?> message, MessageChannel channel) {
                if (SimpMessageHeaderAccessor.getMessageType(message.getHeaders()) != org.springframework.messaging.simp.SimpMessageType.MESSAGE) return message;
                String id = SimpMessageHeaderAccessor.getSessionId(message.getHeaders());
                SocketIdentity identity = id == null ? null : identities.get(id);
                if (!valid(identity)) { if (id != null) identities.remove(id); return null; }
                return message;
            }
        };
    }

    private Message<?> authorizeInbound(Message<?> message) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) return message;
        String id = accessor.getSessionId();
        if (id == null) throw denied();
        if (accessor.getCommand() == StompCommand.DISCONNECT) { identities.remove(id); return message; }
        if (accessor.getCommand() == StompCommand.CONNECT || accessor.getCommand() == StompCommand.STOMP) {
            String header = accessor.getFirstNativeHeader("Authorization");
            if (header == null || !header.startsWith("Bearer ") || identities.size() >= 10000) throw denied();
            String token = header.substring(7);
            User user;
            try { user = auth.getObject().authenticateAccessToken(token); }
            catch (RuntimeException ex) { throw denied(); }
            SocketIdentity identity = new SocketIdentity(user.getId(), TokenFingerprint.of(token));
            if (!valid(identity)) throw denied();
            accessor.setUser(identity);
            accessor.removeNativeHeader("Authorization");
            identities.put(id, identity);
            return message;
        }
        SocketIdentity identity = identities.get(id);
        if (!valid(identity)) { identities.remove(id); throw denied(); }
        if (accessor.getCommand() == StompCommand.SEND) throw denied();
        if (accessor.getCommand() == StompCommand.SUBSCRIBE && !TOPICS.contains(accessor.getDestination())) throw denied();
        return message;
    }

    private boolean valid(SocketIdentity identity) {
        if (identity == null) return false;
        try {
            User user = users.findById(identity.userId()).orElse(null);
            if (user == null || user.getStatus() != User.UserStatus.ACTIVE
                    || !(user.getRole() == User.UserRole.SUPER_ADMIN || user.getRole() == User.UserRole.GUARDIAN_ADMIN)) return false;
            return sessions.findBySessionToken(identity.tokenFingerprint())
                    .filter(s -> Boolean.TRUE.equals(s.getActive()) && !s.isExpired() && s.getUserId().equals(user.getId())).isPresent();
        } catch (RuntimeException ex) { return false; }
    }

    @org.springframework.context.event.EventListener
    public void disconnected(org.springframework.web.socket.messaging.SessionDisconnectEvent event) { identities.remove(event.getSessionId()); }
    private AccessDeniedException denied() { return new AccessDeniedException("WebSocket access denied"); }
}

package com.guardian.security;

import com.guardian.entity.*;
import com.guardian.repository.*;
import com.guardian.service.AuthService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.*;
import org.springframework.messaging.simp.*;
import org.springframework.messaging.simp.stomp.*;
import org.springframework.messaging.support.*;
import org.springframework.security.access.AccessDeniedException;
import java.time.LocalDateTime;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class WebSocketAuthorizationTest {
    private final AuthService auth = mock(AuthService.class);
    private final UserRepository users = mock(UserRepository.class);
    private final UserSessionRepository sessions = mock(UserSessionRepository.class);
    private WebSocketAuthorization sockets;
    private User admin;
    private UserSession session;
    @BeforeEach void setup() {
        ObjectProvider<AuthService> provider = mock(ObjectProvider.class);
        when(provider.getObject()).thenReturn(auth);
        sockets = new WebSocketAuthorization(provider, users, sessions);
        admin = User.builder().id(UUID.randomUUID()).role(User.UserRole.SUPER_ADMIN).status(User.UserStatus.ACTIVE).build();
        session = UserSession.builder().userId(admin.getId()).active(true).expiresAt(LocalDateTime.now().plusMinutes(5)).build();
        when(auth.authenticateAccessToken("test-token")).thenReturn(admin);
        when(users.findById(admin.getId())).thenReturn(Optional.of(admin));
        when(sessions.findBySessionToken(anyString())).thenReturn(Optional.of(session));
    }
    private Message<byte[]> frame(StompCommand command, String token, String destination) {
        StompHeaderAccessor h = StompHeaderAccessor.create(command);
        h.setSessionId("socket-1"); h.setLeaveMutable(true);
        if (token != null) h.setNativeHeader("Authorization", "Bearer " + token);
        if (destination != null) h.setDestination(destination);
        return MessageBuilder.createMessage(new byte[0], h.getMessageHeaders());
    }
    @Test void anonymousAndOrdinaryMembersCannotJoinGlobalStreams() {
        assertThatThrownBy(() -> sockets.inbound().preSend(frame(StompCommand.CONNECT, null, null), null)).isInstanceOf(AccessDeniedException.class);
        admin.setRole(User.UserRole.USER);
        assertThatThrownBy(() -> sockets.inbound().preSend(frame(StompCommand.CONNECT, "test-token", null), null)).isInstanceOf(AccessDeniedException.class);
    }
    @Test void activeAdministratorCanSubscribeOnlyToKnownReadOnlyTopics() {
        Message<byte[]> connect = frame(StompCommand.CONNECT, "test-token", null);
        assertThat(sockets.inbound().preSend(connect, null)).isNotNull();
        StompHeaderAccessor headers = MessageHeaderAccessor.getAccessor(connect, StompHeaderAccessor.class);
        assertThat(headers.getUser().getName()).isEqualTo(admin.getId().toString());
        assertThat(headers.getFirstNativeHeader("Authorization")).isNull();
        assertThat(sockets.inbound().preSend(frame(StompCommand.SUBSCRIBE, null, "/topic/audit"), null)).isNotNull();
        assertThatThrownBy(() -> sockets.inbound().preSend(frame(StompCommand.SUBSCRIBE, null, "/topic/**"), null)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> sockets.inbound().preSend(frame(StompCommand.SEND, null, "/topic/audit"), null)).isInstanceOf(AccessDeniedException.class);
    }
    @Test void logoutOrAccountSuspensionStopsExistingOutboundSubscriptions() {
        sockets.inbound().preSend(frame(StompCommand.CONNECT, "test-token", null), null);
        SimpMessageHeaderAccessor h = SimpMessageHeaderAccessor.create(SimpMessageType.MESSAGE);
        h.setSessionId("socket-1");
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], h.getMessageHeaders());
        assertThat(sockets.outbound().preSend(message, null)).isNotNull();
        session.setActive(false);
        assertThat(sockets.outbound().preSend(message, null)).isNull();
    }
    @Test void expiredAccessSessionCannotReceiveMessages() {
        session.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        assertThatThrownBy(() -> sockets.inbound().preSend(frame(StompCommand.CONNECT, "test-token", null), null)).isInstanceOf(AccessDeniedException.class);
    }
}

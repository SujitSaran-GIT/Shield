package com.guardian.service;

import com.guardian.entity.AuditLog;
import com.guardian.entity.enums.EventType;
import com.guardian.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import java.time.LocalDateTime;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class AuditServiceTest {
    private final AuditLogRepository repository = mock(AuditLogRepository.class);
    private final GeoIpService geo = mock(GeoIpService.class);
    private final TenantAccess access = mock(TenantAccess.class);
    private final AuditWriter writer = mock(AuditWriter.class);
    private final AuditService audits = new AuditService(repository, geo, access, writer);

    @Test void persistedEventKeepsMetadataAndRedactsCredentials() {
        when(geo.getLocation("8.8.8.8")).thenReturn("Approximate city");
        UUID user = UUID.randomUUID();
        audits.logEvent(EventType.LOGIN_SUCCESS, "tenant-a", "App A", user, "a@example.com", "8.8.8.8", "browser", 200,
                "Login successful password=secret otp=123456");
        ArgumentCaptor<AuditLog> entry = ArgumentCaptor.forClass(AuditLog.class);
        verify(writer).write(entry.capture());
        assertThat(entry.getValue().getClientId()).isEqualTo("tenant-a");
        assertThat(entry.getValue().getUserId()).isEqualTo(user);
        assertThat(entry.getValue().getLocation()).isEqualTo("Approximate city");
        assertThat(entry.getValue().getDetails()).doesNotContain("secret", "123456");
    }

    @Test void deniedOperationUsesIndependentAuditTransaction() {
        audits.logEvent(EventType.LOGIN_FAILED, null, null, null, null, "bad-host", null, 401, "Invalid credentials");
        verify(writer).writeFailure(any());
        verify(writer, never()).write(any());
    }

    @Test void crossTenantFilterIsDeniedBeforeQuerying() {
        doThrow(new AccessDeniedException("denied")).when(access).requireClientAccess("tenant-b");
        assertThatThrownBy(() -> audits.getAuditsByFilters("tenant-b", null, null,
                LocalDateTime.now().minusDays(1), LocalDateTime.now(), PageRequest.of(0, 20))).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(repository);
    }

    @Test void clientAdminQueriesCarryRepositoryScope() {
        when(access.isSuperAdmin()).thenReturn(false);
        when(access.authorizedClientIds()).thenReturn(List.of("tenant-a"));
        when(repository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(Page.empty());
        audits.getAllAudits(PageRequest.of(0, 20));
        verify(access).requireClientAdmin();
        verify(repository).findAll(any(Specification.class), any(Pageable.class));
        verify(repository, never()).findAll(any(Pageable.class));
    }
}

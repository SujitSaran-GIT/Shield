package com.guardian.service;

import com.maxmind.geoip2.DatabaseReader;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import java.net.InetAddress;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class GeoIpServiceTest {
    @Test void absentDatabaseDoesNotBlockAuthentication() {
        GeoIpService geo = new GeoIpService();
        ReflectionTestUtils.setField(geo, "databasePath", "target-test/no-such-database.mmdb");
        geo.init();
        assertThat(geo.isAvailable()).isFalse();
        assertThat(geo.getLocation("8.8.8.8")).isEqualTo("Unknown");
        assertThat(geo.getCountryCode("8.8.8.8")).isEqualTo("XX");
    }

    @Test void privateReservedAndInvalidIpsAreNotLookedUp() throws Exception {
        DatabaseReader reader = mock(DatabaseReader.class);
        GeoIpService geo = new GeoIpService();
        ReflectionTestUtils.setField(geo, "reader", reader);
        for (String ip : new String[]{"127.0.0.1", "10.0.0.1", "169.254.1.2", "100.64.0.1", "192.0.2.5", "203.0.113.4", "::1", "fc00::1", "2001:db8::1", "2001:2::1", "attacker.example"})
            assertThat(geo.getLocation(ip)).isEqualTo("Unknown");
        verifyNoInteractions(reader);
        assertThat(GeoIpService.isPublic(InetAddress.getByName("8.8.8.8"))).isTrue();
        assertThat(GeoIpService.isPublic(InetAddress.getByName("2001:4860:4860::8888"))).isTrue();
    }

    @Test void providerFailureReturnsUnknownAndReaderCloses() throws Exception {
        DatabaseReader reader = mock(DatabaseReader.class);
        when(reader.city(any())).thenThrow(new java.io.IOException("provider unavailable"));
        GeoIpService geo = new GeoIpService();
        ReflectionTestUtils.setField(geo, "reader", reader);
        assertThat(geo.getLocation("8.8.8.8")).isEqualTo("Unknown");
        assertThat(geo.getCountryCode("8.8.8.8")).isEqualTo("XX");
        geo.close();
        verify(reader).close();
    }
}

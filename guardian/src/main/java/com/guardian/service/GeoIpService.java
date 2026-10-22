package com.guardian.service;

import com.guardian.util.IpUtil;
import com.maxmind.geoip2.DatabaseReader;
import com.maxmind.geoip2.model.CityResponse;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.File;
import java.io.IOException;
import java.net.InetAddress;

@Service
@Slf4j
public class GeoIpService {
    @Value("${geoip.database-path:geoip/GeoLite2-City.mmdb}")
    private String databasePath;
    private DatabaseReader reader;

    @PostConstruct
    public void init() {
        try {
            File database = new File(databasePath);
            if (database.isFile()) {
                reader = new DatabaseReader.Builder(database).build();
                log.info("Approximate GeoIP lookup available");
            } else log.warn("GeoIP database unavailable; authentication remains available");
        } catch (IOException e) {
            log.warn("GeoIP database could not be loaded; authentication remains available");
        }
    }

    public boolean isAvailable() { return reader != null; }

    public String getLocation(String ipAddress) {
        CityResponse response = lookup(ipAddress);
        if (response == null) return "Unknown";
        String city = response.getCity().getName();
        String country = response.getCountry().getName();
        return country == null ? "Unknown" : city == null ? country : city + ", " + country;
    }

    public String getCountryCode(String ipAddress) {
        CityResponse response = lookup(ipAddress);
        if (response == null || response.getCountry().getIsoCode() == null) return "XX";
        return response.getCountry().getIsoCode();
    }

    private CityResponse lookup(String ipAddress) {
        String literal = IpUtil.normalize(ipAddress);
        if (reader == null || literal == null) return null;
        try {
            InetAddress address = InetAddress.getByName(literal);
            if (!isPublic(address)) return null;
            return reader.city(address);
        } catch (Exception e) {
            log.debug("GeoIP lookup unavailable for an authentication event");
            return null;
        }
    }

    static boolean isPublic(InetAddress address) {
        if (address.isAnyLocalAddress() || address.isLoopbackAddress() || address.isLinkLocalAddress()
                || address.isSiteLocalAddress() || address.isMulticastAddress()) return false;
        byte[] b = address.getAddress();
        if (b.length == 16) {
            // Global unicast alone is insufficient: documentation and benchmark
            // networks also lie inside 2000::/3 and must not produce a location.
            boolean documentation = (b[0] & 255) == 0x20 && (b[1] & 255) == 0x01
                    && (b[2] & 255) == 0x0d && (b[3] & 255) == 0xb8;
            boolean benchmark = (b[0] & 255) == 0x20 && (b[1] & 255) == 0x01
                    && b[2] == 0 && b[3] == 2 && b[4] == 0 && b[5] == 0;
            return (b[0] & 0xe0) == 0x20 && !documentation && !benchmark;
        }
        int a = b[0] & 255, c = b[1] & 255, d = b[2] & 255;
        return !(a == 0 || a >= 224 || (a == 100 && c >= 64 && c <= 127)
                || (a == 192 && (c == 0 || c == 168)) || (a == 198 && (c == 18 || c == 19))
                || (a == 198 && c == 51 && d == 100) || (a == 203 && c == 0 && d == 113));
    }

    @PreDestroy
    public void close() throws IOException { if (reader != null) reader.close(); }
}

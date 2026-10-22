package com.guardian.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.util.matcher.IpAddressMatcher;
import org.springframework.stereotype.Component;
import java.net.InetAddress;
import java.util.Arrays;
import java.util.List;

@Component
public class IpUtil {
    private static volatile List<IpAddressMatcher> trustedProxies = List.of();

    public IpUtil(@Value("${security.trusted-proxies:}") String proxies) {
        trustedProxies = Arrays.stream(proxies.split(",")).map(String::trim)
                .filter(s -> !s.isBlank()).map(IpAddressMatcher::new).toList();
    }

    public static String getClientIpAddress(HttpServletRequest request) {
        String peer = normalize(request.getRemoteAddr());
        if (peer == null) return "Unknown";
        if (!isTrusted(peer)) return peer;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded == null || forwarded.length() > 2048) return peer;
        String[] chain = forwarded.split(",", -1);
        if (chain.length > 32) return peer;
        String candidate = peer;
        for (int i = chain.length - 1; i >= 0 && isTrusted(candidate); i--) {
            String next = normalize(chain[i].trim());
            if (next == null) return peer;
            candidate = next;
        }
        return candidate;
    }

    private static boolean isTrusted(String address) {
        return trustedProxies.stream().anyMatch(proxy -> proxy.matches(address));
    }

    /** IP literals only: never resolve caller-controlled hostnames through DNS. */
    public static String normalize(String address) {
        if (address == null || address.isBlank() || address.length() > 45) return null;
        if (address.indexOf(':') < 0) {
            if (!address.matches("[0-9]{1,3}(\\.[0-9]{1,3}){3}")) return null;
            for (String part : address.split("\\.")) {
                if (Integer.parseInt(part) > 255 || (part.length() > 1 && part.startsWith("0"))) return null;
            }
        } else if (!address.matches("[0-9a-fA-F:.]+")) return null;
        try {
            return InetAddress.getByName(address).getHostAddress();
        } catch (Exception ignored) { return null; }
    }

    public static String getUserAgent(HttpServletRequest request) {
        String value = request.getHeader("User-Agent");
        if (value == null) return "Unknown";
        value = value.replaceAll("[\\r\\n\\p{Cntrl}]", " ");
        return value.substring(0, Math.min(value.length(), 1000));
    }
}

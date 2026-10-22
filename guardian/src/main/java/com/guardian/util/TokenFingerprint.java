package com.guardian.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Non-reversible identifier for high entropy tokens, never a password hash. */
public final class TokenFingerprint {
    private TokenFingerprint() {}

    public static String of(String token) {
        if (token == null || token.isBlank()) throw new IllegalArgumentException("Token is required");
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}

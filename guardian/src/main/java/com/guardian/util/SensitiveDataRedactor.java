package com.guardian.util;

import java.util.regex.Pattern;

public final class SensitiveDataRedactor {
    private SensitiveDataRedactor() {}
    private static final Pattern ASSIGNMENT = Pattern.compile(
            "(?i)([\\\"']?(?:(?:(?:new|old|current|confirm)[_-]?)?password(?:[_-]?(?:hash|confirmation))?"
                    + "|otp|code|secret|(?:client|bootstrap|api)[_-]?(?:key|secret)|(?:access|refresh|id)[_-]?token|token|authorization)"
                    + "[\\\"']?\\s*[:=]\\s*)(?:\"(?:\\\\.|[^\"\\\\])*\"|'(?:\\\\.|[^'\\\\])*'|[^\\s,;}]+)");
    private static final Pattern JWT = Pattern.compile("eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+");
    private static final Pattern CLIENT_SECRET = Pattern.compile("CLIENT_KEY_[A-Za-z0-9_-]+");
    private static final Pattern BEARER = Pattern.compile("(?i)Bearer\\s+[A-Za-z0-9._~+/-]+=*");

    public static String clean(String input, int limit) {
        if (input == null) return null;
        String text = input.replaceAll("[\\p{Cntrl}]", " ");
        text = BEARER.matcher(text).replaceAll("Bearer [REDACTED]");
        text = ASSIGNMENT.matcher(text).replaceAll("$1[REDACTED]");
        text = JWT.matcher(text).replaceAll("[REDACTED]");
        text = CLIENT_SECRET.matcher(text).replaceAll("[REDACTED]");
        return text.substring(0, Math.min(text.length(), limit));
    }
}

package com.guardian.util;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class SensitiveDataRedactorTest {
    @Test void credentialsAreRedactedWithoutLosingEventDescription() {
        String details = "Password reset: password=secret1 otp:123456 refreshToken=secret2 client_key=CLIENT_KEY_abc123 Authorization=Bearer abc.def.ghi";
        String safe = SensitiveDataRedactor.clean(details, 2000);
        assertThat(safe).contains("Password reset").doesNotContain("secret1", "123456", "secret2", "CLIENT_KEY_abc123", "abc.def.ghi");
    }
    @Test void jsonQuotedSecretsAndControlCharactersAreHandled() {
        String safe = SensitiveDataRedactor.clean("{\"password\":\"two word secret\",\"otp\":\"123456\"}\nnext", 2000);
        assertThat(safe).doesNotContain("two word secret", "123456", "\n").contains("next");
    }
    @Test void lengthIsBoundedAndNullIsSafe() {
        assertThat(SensitiveDataRedactor.clean("a".repeat(3000), 2000)).hasSize(2000);
        assertThat(SensitiveDataRedactor.clean(null, 50)).isNull();
    }

    @Test void escapedQuotesCannotExposeTheRemainderOfAJsonSecret() {
        String safe = SensitiveDataRedactor.clean("{\"newPassword\":\"prefix\\\"suffix secret\",\"bootstrapSecret\":\"bootstrap-value\",\"api_key\":\"api-value\",\"token\":\"opaque-value\"}", 2000);
        assertThat(safe).doesNotContain("prefix", "suffix", "bootstrap-value", "api-value", "opaque-value")
                .contains("[REDACTED]");
    }
}

package com.guardian.service;

import com.guardian.entity.Client;
import com.guardian.repository.ClientRepository;
import com.guardian.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Converts recoverable legacy credentials before readiness; never accepts ciphertext as a secret. */
@Component @Order(0) @RequiredArgsConstructor
public class LegacyClientCredentialMigrator implements ApplicationRunner {
    private final ClientRepository repository;
    private final EncryptionUtil encryption;
    private final PasswordEncoder encoder;
    @Value("${security.legacy-encryption-key:}") private String legacyKey;

    @Override @Transactional
    public void run(ApplicationArguments arguments) {
        for (Client client : repository.findAll()) {
            String verifier = client.getClientKey();
            if (verifier != null && verifier.startsWith("$2")) continue;
            String secret;
            if (isKnownPlaintext(verifier)) secret = verifier;
            else {
                if (legacyKey == null || legacyKey.isBlank()) throw new IllegalStateException("Legacy client credentials require LEGACY_ENCRYPTION_KEY for one-time secure conversion");
                try { secret = encryption.decrypt(verifier); }
                catch (RuntimeException ex) { throw new IllegalStateException("Legacy client credential conversion failed; verify LEGACY_ENCRYPTION_KEY before retrying"); }
                if (!isKnownPlaintext(secret)) throw new IllegalStateException("Unrecognized legacy client credential format; operator review required");
            }
            client.setClientKey(encoder.encode(secret));
            repository.save(client);
        }
    }

    private static boolean isKnownPlaintext(String value) {
        return value != null && (value.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")
            || value.matches("CLIENT_KEY_[A-Za-z0-9_-]{32,128}"));
    }
}

package com.guardian.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
@Slf4j
public class EncryptionUtil {
    
    @Value("${security.legacy-encryption-key:${jwt.secret}}")
    private String encryptionKey;
    
    private static final String ALGORITHM = "AES";
    
    public String encrypt(String plainText) {
        try {
            SecretKeySpec keySpec = createKeySpec();
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, keySpec);
            
            byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().encodeToString(encrypted);
        } catch (Exception e) {
            log.error("Encryption failed: {}", e.getMessage());
            throw new RuntimeException("Encryption failed", e);
        }
    }
    
    public String decrypt(String encryptedText) {
        try {
            SecretKeySpec keySpec = createKeySpec();
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, keySpec);
            
            byte[] decoded = Base64.getUrlDecoder().decode(encryptedText);
            byte[] decrypted = cipher.doFinal(decoded);
            return new String(decrypted, StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("Decryption failed: {}", e.getMessage());
            throw new RuntimeException("Decryption failed", e);
        }
    }
    
    private SecretKeySpec createKeySpec() {
        // Use first 16 bytes of the key for AES-128
        byte[] keyBytes = encryptionKey.getBytes(StandardCharsets.UTF_8);
        byte[] keyBytesShort = new byte[16];
        System.arraycopy(keyBytes, 0, keyBytesShort, 0, Math.min(keyBytes.length, 16));
        return new SecretKeySpec(keyBytesShort, ALGORITHM);
    }
}

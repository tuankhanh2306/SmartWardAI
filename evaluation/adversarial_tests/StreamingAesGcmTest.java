package evaluation.adversarial_tests;

import javax.crypto.Cipher;
import javax.crypto.CipherInputStream;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.security.SecureRandom;
import java.util.Arrays;

public class StreamingAesGcmTest {

    public static void main(String[] args) throws Exception {
        System.out.println("======================================================================");
        System.out.println("JAVA 21 ADVERSARIAL TEST: Streaming AES/GCM/NoPadding Verification");
        System.out.println("======================================================================");

        // 1. Generate AES-256 key
        KeyGenerator keyGen = KeyGenerator.getInstance("AES");
        keyGen.init(256);
        SecretKey key = keyGen.generateKey();

        byte[] iv = new byte[12];
        new SecureRandom().nextBytes(iv);
        GCMParameterSpec spec = new GCMParameterSpec(128, iv);

        // 2. Sensitive citizen payload (simulating 100KB citizen record)
        byte[] sensitivePayload = "SO_CCCD:089098001234;HO_TEN:NGUYEN_VAN_AN;QUE_QUAN:AN_GIANG;".repeat(1500).getBytes();
        System.out.println("Plaintext size: " + sensitivePayload.length + " bytes (" + (sensitivePayload.length / 1024) + " KB)");

        // 3. Encrypt with AES/GCM/NoPadding
        Cipher encryptCipher = Cipher.getInstance("AES/GCM/NoPadding");
        encryptCipher.init(Cipher.ENCRYPT_MODE, key, spec);
        byte[] ciphertext = encryptCipher.doFinal(sensitivePayload);
        System.out.println("Ciphertext size: " + ciphertext.length + " bytes (includes 16-byte GCM Tag at end)");

        // 4. Adversarial scenario: Attacker tampers with the ciphertext in transit (flipping byte 1000)
        byte[] tamperedCiphertext = Arrays.copyOf(ciphertext, ciphertext.length);
        tamperedCiphertext[1000] ^= 0xFF;

        // 5. Test streaming decryption using CipherInputStream (as proposed in the report)
        Cipher decryptCipher = Cipher.getInstance("AES/GCM/NoPadding");
        decryptCipher.init(Cipher.DECRYPT_MODE, key, spec);

        ByteArrayInputStream bais = new ByteArrayInputStream(tamperedCiphertext);
        CipherInputStream cis = new CipherInputStream(bais, decryptCipher);

        ByteArrayOutputStream streamedToClient = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int bytesRead;
        int totalStreamedBeforeError = 0;
        boolean exceptionThrown = false;

        try {
            while ((bytesRead = cis.read(buffer)) != -1) {
                streamedToClient.write(buffer, 0, bytesRead);
                totalStreamedBeforeError += bytesRead;
            }
        } catch (Exception ex) {
            exceptionThrown = true;
            System.out.println("\n[!] Exception caught during stream read: " + ex.getClass().getName() + " - " + ex.getMessage());
        } finally {
            cis.close();
        }

        System.out.println("Total plaintext bytes leaked/streamed to client before exception: " 
                + totalStreamedBeforeError + " / " + sensitivePayload.length + " bytes ("
                + String.format("%.2f", (totalStreamedBeforeError * 100.0 / sensitivePayload.length)) + "%)");

        if (totalStreamedBeforeError > 0) {
            System.out.println("[CRITICAL VULNERABILITY CONFIRMED]:");
            System.out.println("In streaming HTTP responses, the client (or an attacker) receives " 
                    + totalStreamedBeforeError + " bytes of unverified/tampered plaintext before the MAC tag is verified at EOF!");
            System.out.println("HTTP response status 200 OK and headers were ALREADY flushed.");
            System.out.println("This violates authenticated encryption principles (AEAD).");
        } else {
            System.out.println("[INFO]: No plaintext leaked prior to tag validation.");
        }
    }
}

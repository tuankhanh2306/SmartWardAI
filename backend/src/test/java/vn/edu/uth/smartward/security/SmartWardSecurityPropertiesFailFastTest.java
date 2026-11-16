package vn.edu.uth.smartward.security;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.edu.uth.smartward.vault.SmartWardVaultProperties;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("SEC-01 Fail-Fast Configuration & Secret Rotation Tests")
class SmartWardSecurityPropertiesFailFastTest {

    @Test
    @DisplayName("SmartWardSecurityProperties: Fail-fast when jwtSecret is blank or null")
    void securityProperties_blankSecret_shouldFailFast() {
        SmartWardSecurityProperties props = new SmartWardSecurityProperties();
        props.setJwtSecret("");
        IllegalStateException ex = assertThrows(IllegalStateException.class, props::validateSecurityRequirements);
        assertTrue(ex.getMessage().contains("required and cannot be blank"));
    }

    @Test
    @DisplayName("SmartWardSecurityProperties: Fail-fast when jwtSecret is shorter than 32 bytes")
    void securityProperties_shortSecret_shouldFailFast() {
        SmartWardSecurityProperties props = new SmartWardSecurityProperties();
        props.setJwtSecret("short_key_under_32_bytes!");
        IllegalStateException ex = assertThrows(IllegalStateException.class, props::validateSecurityRequirements);
        assertTrue(ex.getMessage().contains("at least 32 bytes"));
    }

    @Test
    @DisplayName("SmartWardSecurityProperties: Fail-fast when jwtSecret contains ChangeMe, DevTest, or Fallback")
    void securityProperties_placeholderSecret_shouldFailFast() {
        SmartWardSecurityProperties props = new SmartWardSecurityProperties();
        props.setJwtSecret("SmartWardAI_ChangeMe_In_Prod_Secret_Key_32B!");
        IllegalStateException ex1 = assertThrows(IllegalStateException.class, props::validateSecurityRequirements);
        assertTrue(ex1.getMessage().contains("forbidden placeholder keyword"));

        props.setJwtSecret("SmartWardAI_DevTest_SecretKey_Minimum_32Bytes!");
        IllegalStateException ex2 = assertThrows(IllegalStateException.class, props::validateSecurityRequirements);
        assertTrue(ex2.getMessage().contains("forbidden placeholder keyword"));

        props.setJwtSecret("SmartWardAI_Fallback_SecretKey_Minimum_32Bytes!");
        IllegalStateException ex3 = assertThrows(IllegalStateException.class, props::validateSecurityRequirements);
        assertTrue(ex3.getMessage().contains("forbidden placeholder keyword"));
    }

    @Test
    @DisplayName("SmartWardSecurityProperties: Valid 256-bit secret succeeds validation")
    void securityProperties_validSecret_shouldPass() {
        SmartWardSecurityProperties props = new SmartWardSecurityProperties();
        props.setJwtSecret("sw_sec_8f9b4c2e1a7d6e3f5b0c9a8d7e6f5a4b_prod_2026_auth");
        assertDoesNotThrow(props::validateSecurityRequirements);
    }

    @Test
    @DisplayName("SmartWardVaultProperties: Fail-fast when encryptionKey is blank or null")
    void vaultProperties_blankKey_shouldFailFast() {
        SmartWardVaultProperties props = new SmartWardVaultProperties();
        props.setEncryptionKey("");
        IllegalStateException ex = assertThrows(IllegalStateException.class, props::validateVaultRequirements);
        assertTrue(ex.getMessage().contains("required and cannot be blank"));
    }

    @Test
    @DisplayName("SmartWardVaultProperties: Fail-fast when encryptionKey is shorter than 32 bytes")
    void vaultProperties_shortKey_shouldFailFast() {
        SmartWardVaultProperties props = new SmartWardVaultProperties();
        props.setEncryptionKey("short_vault_key_16b!");
        IllegalStateException ex = assertThrows(IllegalStateException.class, props::validateVaultRequirements);
        assertTrue(ex.getMessage().contains("at least 32 bytes"));
    }

    @Test
    @DisplayName("SmartWardVaultProperties: Fail-fast when encryptionKey contains placeholder keywords")
    void vaultProperties_placeholderKey_shouldFailFast() {
        SmartWardVaultProperties props = new SmartWardVaultProperties();
        props.setEncryptionKey("SmartWardAI_ChangeMe_32BytesKey!");
        IllegalStateException ex = assertThrows(IllegalStateException.class, props::validateVaultRequirements);
        assertTrue(ex.getMessage().contains("forbidden placeholder keyword"));
    }

    @Test
    @DisplayName("SmartWardVaultProperties: Valid 256-bit encryption key succeeds validation")
    void vaultProperties_validKey_shouldPass() {
        SmartWardVaultProperties props = new SmartWardVaultProperties();
        props.setEncryptionKey("sw_vlt_3a7e9c1f5b8d2a6e0c4f7b9e1d3a5c7f_prod_2026_enc");
        assertDoesNotThrow(props::validateVaultRequirements);
    }
}

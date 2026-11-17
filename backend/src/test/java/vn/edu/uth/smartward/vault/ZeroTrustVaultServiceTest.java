package vn.edu.uth.smartward.vault;

import io.minio.MinioClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ZeroTrustVaultServiceTest {

    @Mock
    private MinioClient minioClient;

    @Mock
    private ImageWatermarkService watermarkService;

    @Mock
    private StringRedisTemplate stringRedisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private VaultDocumentRepository documentRepository;

    private ZeroTrustVaultService vaultService;

    @BeforeEach
    void setUp() {
        vaultService = new ZeroTrustVaultService(
                minioClient,
                watermarkService,
                stringRedisTemplate,
                documentRepository
        );
        ReflectionTestUtils.setField(vaultService, "bucketName", "smartward-vault");
        ReflectionTestUtils.setField(vaultService, "tokenTtlHours", 24);
        ReflectionTestUtils.setField(vaultService, "rawEncryptionKey", "SmartWardAI_UnitTest_VaultKey_32B_Key!");
        ReflectionTestUtils.setField(vaultService, "failClosed", true);
    }

    @Test
    void testAesGcm_whenEncryptionKeyMissing_shouldFailClosed() {
        ReflectionTestUtils.setField(vaultService, "rawEncryptionKey", "");
        BusinessException ex = assertThrows(BusinessException.class, () ->
                vaultService.encryptAesGcm("secret".getBytes(StandardCharsets.UTF_8))
        );
        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex.getErrorCode());
    }

    @Test
    void testAesGcm_whenEncryptionKeyWrongLength_shouldFailClosed() {
        ReflectionTestUtils.setField(vaultService, "rawEncryptionKey", "too_short_key");
        BusinessException ex = assertThrows(BusinessException.class, () ->
                vaultService.encryptAesGcm("secret".getBytes(StandardCharsets.UTF_8))
        );
        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, ex.getErrorCode());
    }

    @Test
    void testConsumeOneTimeDocument_whenRedisDownAndFailClosed_shouldThrowStorageUnavailable() {
        when(stringRedisTemplate.opsForValue()).thenThrow(new RuntimeException("Redis connection refused"));
        BusinessException ex = assertThrows(BusinessException.class, () ->
                vaultService.consumeOneTimeDocument("OTT_token_123")
        );
        assertEquals(ErrorCode.STORAGE_UNAVAILABLE, ex.getErrorCode());
    }

    @Test
    void testAesGcm_encryptAndDecryptRoundtrip() {
        String secretData = "Họ và tên: NGUYỄN VĂN AN - Số CCCD: 079095012345";
        byte[] plaintext = secretData.getBytes(StandardCharsets.UTF_8);

        // Encrypt
        byte[] ciphertext = vaultService.encryptAesGcm(plaintext);
        assertNotNull(ciphertext);
        assertNotEquals(new String(plaintext), new String(ciphertext));
        assertTrue(ciphertext.length > plaintext.length + 12); // IV (12) + Tag (16)

        // Decrypt
        byte[] decrypted = vaultService.decryptAesGcm(ciphertext);
        assertEquals(secretData, new String(decrypted, StandardCharsets.UTF_8));
    }

    @Test
    void testAesGcm_tamperedCiphertext_shouldFailDecryption() {
        String secretData = "Dữ liệu nhạy cảm cần bảo vệ";
        byte[] ciphertext = vaultService.encryptAesGcm(secretData.getBytes(StandardCharsets.UTF_8));

        // Tamper with a single byte in ciphertext
        ciphertext[ciphertext.length - 1] ^= 0x55;

        // Decryption should fail due to AEAD GCM authentication tag mismatch
        assertThrows(BusinessException.class, () -> vaultService.decryptAesGcm(ciphertext));
    }

    @Test
    void testConsumeOneTimeDocument_whenAlreadyViewed_shouldThrowHttp410Gone() {
        String token = "OTT_already_used_token";
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.getAndDelete("smartward:vault:token:" + token)).thenReturn(null); // Already deleted by GETDEL

        VaultDocument viewedDoc = VaultDocument.builder()
                .documentCode("DOC_123")
                .oneTimeToken(ZeroTrustVaultService.sha256Hex(token))
                .isViewed(true) // Marked as viewed
                .expiresAt(OffsetDateTime.now().plusHours(10))
                .build();

        when(documentRepository.findByOneTimeToken(ZeroTrustVaultService.sha256Hex(token))).thenReturn(Optional.of(viewedDoc));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                vaultService.consumeOneTimeDocument(token)
        );

        assertEquals(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("đã được sử dụng một lần"));
    }

    @Test
    void testSha256Hex_validInput_returns64CharHex() {
        String token = "OTT_test_token_12345";
        String hash = ZeroTrustVaultService.sha256Hex(token);
        assertNotNull(hash);
        assertEquals(64, hash.length());
        assertEquals(hash, ZeroTrustVaultService.sha256Hex(token));
    }
}

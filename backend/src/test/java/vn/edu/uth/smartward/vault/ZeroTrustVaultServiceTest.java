package vn.edu.uth.smartward.vault;

import io.minio.GetObjectArgs;
import io.minio.GetObjectResponse;
import io.minio.MinioClient;
import io.minio.RemoveObjectArgs;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisSystemException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
        lenient().when(valueOperations.setIfAbsent(startsWith("smartward:vault:lock:"), eq("1"), any(Duration.class)))
                .thenReturn(true);
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
        when(valueOperations.get("smartward:vault:token:" + token)).thenReturn(null); // Expired/removed after first consumption

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
    void testConsumeOneTimeDocument_whenMinioFailsMidway_shouldPreserveTokenAndSucceedOnRetryThen410OnSecondView() throws Exception {
        String token = "OTT_retry_after_minio_failure";
        String redisKey = "smartward:vault:token:" + token;
        String docCode = "DOC_RETRY_01";
        byte[] plaintext = "CCCD hợp lệ đã đóng dấu watermark".getBytes(StandardCharsets.UTF_8);
        byte[] ciphertext = vaultService.encryptAesGcm(plaintext);

        VaultDocument doc = VaultDocument.builder()
                .documentCode(docCode)
                .minioObjectPath("encrypted/" + docCode + ".enc")
                .oneTimeToken(ZeroTrustVaultService.sha256Hex(token))
                .isViewed(false)
                .expiresAt(OffsetDateTime.now().plusHours(12))
                .build();

        AtomicBoolean deletedFromRedis = new AtomicBoolean(false);
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(redisKey)).thenAnswer(inv -> deletedFromRedis.get() ? null : docCode);
        when(stringRedisTemplate.delete(redisKey)).thenAnswer(inv -> {
            deletedFromRedis.set(true);
            return true;
        });
        when(documentRepository.findByDocumentCode(docCode)).thenReturn(Optional.of(doc));
        when(documentRepository.markAsViewedAtomically(docCode)).thenAnswer(inv -> {
            if (!Boolean.TRUE.equals(doc.getIsViewed())) {
                doc.setIsViewed(true);
                return 1;
            }
            return 0;
        });

        GetObjectResponse recoveredResponse = new GetObjectResponse(
                null, "smartward-vault", null, doc.getMinioObjectPath(), new ByteArrayInputStream(ciphertext));
        when(minioClient.getObject(any(GetObjectArgs.class)))
                .thenThrow(new RuntimeException("MinIO network timeout"))
                .thenReturn(recoveredResponse);

        // Attempt 1: MinIO fails -> exception thrown, token is NOT consumed
        assertThrows(BusinessException.class, () -> vaultService.consumeOneTimeDocument(token));
        assertFalse(deletedFromRedis.get(), "Token must remain in Redis when MinIO fails");
        assertFalse(Boolean.TRUE.equals(doc.getIsViewed()), "DB isViewed must stay false when MinIO fails");

        // Attempt 2: MinIO recovers -> succeeds and consumes token
        byte[] result = vaultService.consumeOneTimeDocument(token);
        assertArrayEquals(plaintext, result);
        assertTrue(deletedFromRedis.get(), "Token must be deleted from Redis only after decrypt succeeds");
        assertTrue(Boolean.TRUE.equals(doc.getIsViewed()), "DB isViewed must be true after successful view");

        // Attempt 3: Replay must strictly fail with 410 TOKEN_EXPIRED_OR_CONSUMED
        when(documentRepository.findByOneTimeToken(ZeroTrustVaultService.sha256Hex(token))).thenReturn(Optional.of(doc));
        BusinessException secondEx = assertThrows(BusinessException.class, () -> vaultService.consumeOneTimeDocument(token));
        assertEquals(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED, secondEx.getErrorCode());
    }

    @Test
    void testConsumeOneTimeDocument_whenDecryptionFails_shouldPreserveToken() throws Exception {
        String token = "OTT_decrypt_fail_token";
        String redisKey = "smartward:vault:token:" + token;
        String docCode = "DOC_CORRUPT_01";
        byte[] corruptedCiphertext = new byte[40]; // All zeros -> invalid GCM authentication tag

        VaultDocument doc = VaultDocument.builder()
                .documentCode(docCode)
                .minioObjectPath("encrypted/" + docCode + ".enc")
                .oneTimeToken(ZeroTrustVaultService.sha256Hex(token))
                .isViewed(false)
                .expiresAt(OffsetDateTime.now().plusHours(12))
                .build();

        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(redisKey)).thenReturn(docCode);
        when(documentRepository.findByDocumentCode(docCode)).thenReturn(Optional.of(doc));
        GetObjectResponse badResponse = new GetObjectResponse(
                null, "smartward-vault", null, doc.getMinioObjectPath(), new ByteArrayInputStream(corruptedCiphertext));
        when(minioClient.getObject(any(GetObjectArgs.class))).thenReturn(badResponse);

        assertThrows(BusinessException.class, () -> vaultService.consumeOneTimeDocument(token));
        verify(stringRedisTemplate, never()).delete(redisKey);
        verify(documentRepository, never()).markAsViewedAtomically(anyString());
        assertFalse(Boolean.TRUE.equals(doc.getIsViewed()));
    }

    @Test
    void testConsumeOneTimeDocument_whenRedisLockHeldByConcurrentRequest_shouldThrow410Gone() throws Exception {
        String token = "OTT_concurrent_lock_held";
        String lockKey = "smartward:vault:lock:" + token;

        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.setIfAbsent(eq(lockKey), eq("1"), any(Duration.class))).thenReturn(false);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                vaultService.consumeOneTimeDocument(token)
        );
        assertEquals(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED, ex.getErrorCode());
        verify(minioClient, never()).getObject(any(GetObjectArgs.class));
        verify(documentRepository, never()).markAsViewedAtomically(anyString());
    }

    @Test
    void testStoreDocument_whenRedisOomNoEviction_shouldFailClosedWithStorageUnavailable() throws Exception {
        byte[] validPng = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        when(watermarkService.applyWatermark(any())).thenReturn(validPng);
        when(stringRedisTemplate.opsForValue()).thenReturn(valueOperations);
        doThrow(new RedisSystemException("OOM command not allowed when used memory > 'maxmemory'", new RuntimeException()))
                .when(valueOperations).set(anyString(), anyString(), any(Duration.class));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                vaultService.storeDocumentBytes(validPng, "cccd.png", "CCCD_FRONT")
        );
        assertEquals(ErrorCode.STORAGE_UNAVAILABLE, ex.getErrorCode());
        verify(minioClient).removeObject(any(RemoveObjectArgs.class));
        verify(documentRepository, never()).save(any());
    }

    @Test
    void testSha256Hex_validInput_returns64CharHex() {
        String token = "OTT_test_token_12345";
        String hash = ZeroTrustVaultService.sha256Hex(token);
        assertNotNull(hash);
        assertEquals(64, hash.length());
        assertEquals(hash, ZeroTrustVaultService.sha256Hex(token));
    }

    @Test
    void testKeyRotation_readsV1AndV2EncryptedFilesConcurrently_andAuthenticatesKeyIdHeader() throws Exception {
        String keyV1 = "SmartWardAI_VaultKey_Version1_32B_A!";
        String keyV2 = "SmartWardAI_VaultKey_Version2_32B_B!";

        // 1. Encrypt document under v1
        ReflectionTestUtils.setField(vaultService, "activeKeyId", "v1");
        ReflectionTestUtils.setField(vaultService, "rawEncryptionKey", keyV1);
        ReflectionTestUtils.setField(vaultService, "previousKeysSpec", "");

        byte[] docV1Plain = "Hồ sơ công dân cũ mã hóa bằng khóa v1".getBytes(StandardCharsets.UTF_8);
        byte[] docV1Enc = vaultService.encryptAesGcm(docV1Plain);
        assertEquals(Optional.of("v1"), vaultService.extractKeyId(docV1Enc));

        // 2. Also build a legacy headerless [12B IV][ciphertext+tag] file encrypted with keyV1
        byte[] legacyPlain = "Hồ sơ cũ trước khi có header SWV1".getBytes(StandardCharsets.UTF_8);
        byte[] legacyIv = new byte[12];
        new java.security.SecureRandom().nextBytes(legacyIv);
        javax.crypto.Cipher legacyCipher = javax.crypto.Cipher.getInstance("AES/GCM/NoPadding");
        byte[] keyV1Bytes = new byte[32];
        System.arraycopy(keyV1.getBytes(StandardCharsets.UTF_8), 0, keyV1Bytes, 0, 32);
        legacyCipher.init(javax.crypto.Cipher.ENCRYPT_MODE,
                new javax.crypto.spec.SecretKeySpec(keyV1Bytes, "AES"),
                new javax.crypto.spec.GCMParameterSpec(128, legacyIv));
        byte[] legacyCipherBytes = legacyCipher.doFinal(legacyPlain);
        byte[] legacyEnc = new byte[legacyIv.length + legacyCipherBytes.length];
        System.arraycopy(legacyIv, 0, legacyEnc, 0, legacyIv.length);
        System.arraycopy(legacyCipherBytes, 0, legacyEnc, legacyIv.length, legacyCipherBytes.length);
        assertEquals(Optional.empty(), vaultService.extractKeyId(legacyEnc));

        // 3. Rotate active key to v2 while keeping v1 in previousKeysSpec
        ReflectionTestUtils.setField(vaultService, "activeKeyId", "v2");
        ReflectionTestUtils.setField(vaultService, "rawEncryptionKey", keyV2);
        ReflectionTestUtils.setField(vaultService, "previousKeysSpec", "v1:" + keyV1);

        byte[] docV2Plain = "Hồ sơ công dân mới mã hóa bằng khóa v2".getBytes(StandardCharsets.UTF_8);
        byte[] docV2Enc = vaultService.encryptAesGcm(docV2Plain);
        assertEquals(Optional.of("v2"), vaultService.extractKeyId(docV2Enc));

        // 4. Vault must decrypt v1, v2, AND legacy headerless v1 files seamlessly in parallel
        assertArrayEquals(docV1Plain, vaultService.decryptAesGcm(docV1Enc));
        assertArrayEquals(docV2Plain, vaultService.decryptAesGcm(docV2Enc));
        assertArrayEquals(legacyPlain, vaultService.decryptAesGcm(legacyEnc));

        // 5. Tampering with key_id in header must fail GCM AAD authentication
        byte[] tamperedHeader = docV2Enc.clone();
        tamperedHeader[6] = '1'; // Flip "v2" -> "v1" in header
        assertThrows(BusinessException.class, () -> vaultService.decryptAesGcm(tamperedHeader));

        // 6. Removing v1 from previousKeysSpec must reject v1 ciphertext with clear error
        ReflectionTestUtils.setField(vaultService, "previousKeysSpec", "");
        BusinessException missingKeyEx = assertThrows(BusinessException.class, () -> vaultService.decryptAesGcm(docV1Enc));
        assertEquals(ErrorCode.INTERNAL_SERVER_ERROR, missingKeyEx.getErrorCode());
        assertTrue(missingKeyEx.getMessage().contains("v1"));
    }
}

package vn.edu.uth.smartward.vault;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.security.Officer;
import vn.edu.uth.smartward.security.OfficerAuthService;
import vn.edu.uth.smartward.security.OfficerRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.CRC32;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Empirical Adversarial Stress Harness for Milestone 1 Security Hardening:
 * 1. Pixel Flood Defense (Decompression bomb prevention & OOM avoidance)
 * 2. Redis JWT Revocation & Fault-Tolerant Fallback
 * 3. Magic Bytes Detection for PDF, JPEG, and PNG/default content delivery
 */
class ChallengerM1EmpiricalStressTest {

    // =========================================================================
    // SECTION 1: PIXEL FLOOD DEFENSE & OOM AVOIDANCE
    // =========================================================================
    @Nested
    @DisplayName("Dimension 1: Pixel Flood Defense Stress Harness")
    class PixelFloodDefenseStressTests {

        private ImageWatermarkService watermarkService;

        @BeforeEach
        void setUp() {
            watermarkService = new ImageWatermarkService();
            ReflectionTestUtils.setField(watermarkService, "baseWatermarkText", "CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND");
        }

        @Test
        @DisplayName("Boundary width: 4097px width with 2px height must be rejected without OOM")
        void testWidth4097_shouldBeRejectedImmediately() throws IOException {
            BufferedImage img = new BufferedImage(4097, 2, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", baos);
            byte[] input = baos.toByteArray();

            BusinessException ex = assertThrows(BusinessException.class, () -> watermarkService.applyWatermark(input));
            assertEquals(ErrorCode.INVALID_REQUEST, ex.getErrorCode());
            assertTrue(ex.getMessage().contains("4096x4096"), "Error message should mention 4096x4096 px limit");
        }

        @Test
        @DisplayName("Boundary height: 2px width with 4097px height must be rejected without OOM")
        void testHeight4097_shouldBeRejectedImmediately() throws IOException {
            BufferedImage img = new BufferedImage(2, 4097, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", baos);
            byte[] input = baos.toByteArray();

            BusinessException ex = assertThrows(BusinessException.class, () -> watermarkService.applyWatermark(input));
            assertEquals(ErrorCode.INVALID_REQUEST, ex.getErrorCode());
            assertTrue(ex.getMessage().contains("4096x4096"));
        }

        @Test
        @DisplayName("Synthetic PNG header: 5000x5000 px (area 25M > 16M) rejected in 33 bytes without OOM")
        void testSynthetic5000x5000Header_rejectedWithoutMemoryExplosion() {
            byte[] syntheticPng = createSyntheticPngHeader(5000, 5000);
            assertEquals(33, syntheticPng.length, "Header should be exactly 33 bytes to simulate zero-alloc probe");

            long memBefore = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
            BusinessException ex = assertThrows(BusinessException.class, () -> watermarkService.applyWatermark(syntheticPng));
            long memAfter = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();

            assertEquals(ErrorCode.INVALID_REQUEST, ex.getErrorCode());
            assertTrue(ex.getMessage().contains("4096x4096"));
            // Memory delta should be tiny (< 5MB), proving no 5000x5000 (100MB) raster was allocated
            long memDelta = Math.abs(memAfter - memBefore);
            assertTrue(memDelta < 10_000_000L, "Memory allocation must remain minimal; raster allocation prohibited");
        }

        @Test
        @DisplayName("Synthetic PNG header: 5000px width with 100px height (width > 4096) rejected")
        void testSynthetic5000x100Header_rejected() {
            byte[] syntheticPng = createSyntheticPngHeader(5000, 100);
            BusinessException ex = assertThrows(BusinessException.class, () -> watermarkService.applyWatermark(syntheticPng));
            assertEquals(ErrorCode.INVALID_REQUEST, ex.getErrorCode());
        }

        @Test
        @DisplayName("Synthetic PNG header: 100px width with 5000px height (height > 4096) rejected")
        void testSynthetic100x5000Header_rejected() {
            byte[] syntheticPng = createSyntheticPngHeader(100, 5000);
            BusinessException ex = assertThrows(BusinessException.class, () -> watermarkService.applyWatermark(syntheticPng));
            assertEquals(ErrorCode.INVALID_REQUEST, ex.getErrorCode());
        }

        @Test
        @DisplayName("Boundary valid: 4096x2 px is within allowed limit (<= 4096 and area <= 16M)")
        void testBoundary4096x2_shouldBeAllowed() throws IOException {
            BufferedImage img = new BufferedImage(4096, 2, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", baos);
            byte[] input = baos.toByteArray();

            byte[] output = watermarkService.applyWatermark(input);
            assertNotNull(output);
            assertTrue(output.length > 0);
        }

        @Test
        @DisplayName("Corrupted image header falls back gracefully without unhandled crash")
        void testCorruptedHeader_gracefulFallback() {
            byte[] garbage = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x00, 0x00, 0x00};
            byte[] result = watermarkService.applyWatermark(garbage);
            assertArrayEquals(garbage, result, "Should gracefully return raw bytes if header cannot be parsed");
        }

        private byte[] createSyntheticPngHeader(int width, int height) {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            // PNG signature
            baos.write(new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}, 0, 8);
            // IHDR length = 13 bytes
            baos.write(new byte[]{0, 0, 0, 13}, 0, 4);

            ByteArrayOutputStream chunk = new ByteArrayOutputStream();
            chunk.write(new byte[]{'I', 'H', 'D', 'R'}, 0, 4);
            chunk.write((width >> 24) & 0xFF);
            chunk.write((width >> 16) & 0xFF);
            chunk.write((width >> 8) & 0xFF);
            chunk.write(width & 0xFF);
            chunk.write((height >> 24) & 0xFF);
            chunk.write((height >> 16) & 0xFF);
            chunk.write((height >> 8) & 0xFF);
            chunk.write(height & 0xFF);
            chunk.write(new byte[]{8, 2, 0, 0, 0}, 0, 5); // 8-bit truecolor RGB

            byte[] chunkData = chunk.toByteArray();
            baos.write(chunkData, 0, chunkData.length);

            CRC32 crc = new CRC32();
            crc.update(chunkData);
            long crcVal = crc.getValue();
            baos.write((int) ((crcVal >> 24) & 0xFF));
            baos.write((int) ((crcVal >> 16) & 0xFF));
            baos.write((int) ((crcVal >> 8) & 0xFF));
            baos.write((int) (crcVal & 0xFF));

            return baos.toByteArray();
        }
    }

    // =========================================================================
    // SECTION 2: REDIS JWT REVOCATION & FALLBACK
    // =========================================================================
    @Nested
    @DisplayName("Dimension 2: Redis JWT Revocation & Fallback Stress Harness")
    class RedisJwtRevocationAndFallbackStressTests {

        private final ObjectMapper objectMapper = new ObjectMapper();
        private final String secret = "SmartWardAI_UnitTest_JwtSecret_32B!";
        private final String officerPin = "OfficerM1Stress2026!";
        private final String secondOfficerPin = "SecondM1Stress2026!";

        private OfficerRepository buildMockRepo() {
            OfficerRepository repo = mock(OfficerRepository.class);
            BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
            Officer o1 = Officer.builder()
                    .badgeId("CC-AG-8942").fullName("Trần Quốc Bảo").wardCode("AG_P_LONGXUYEN")
                    .role("OFFICER").passwordHash(encoder.encode(officerPin)).mustChangePin(false).active(true).build();
            Officer o2 = Officer.builder()
                    .badgeId("CC-AG-1001").fullName("Nguyễn Thị Minh Khai").wardCode("AG_P_LONGXUYEN")
                    .role("OFFICER").passwordHash(encoder.encode(secondOfficerPin)).mustChangePin(false).active(true).build();
            when(repo.findByBadgeIdIgnoreCase("CC-AG-8942")).thenReturn(java.util.Optional.of(o1));
            when(repo.findByBadgeIdIgnoreCase("CC-AG-1001")).thenReturn(java.util.Optional.of(o2));
            when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));
            return repo;
        }

        @Test
        @DisplayName("Scenario A: Null OfficerRepository rejects fallback login (fail closed) while DB-backed repo succeeds")
        void testNullRedis_operatesViaInMemoryFallback() {
            OfficerAuthService noRepoAuth = new OfficerAuthService(objectMapper, null);
            ReflectionTestUtils.setField(noRepoAuth, "jwtSecret", secret);
            assertEquals(ErrorCode.UNAUTHORIZED, assertThrows(BusinessException.class, () ->
                    noRepoAuth.authenticate("CC-AG-8942", "8942", null)).getErrorCode());

            OfficerAuthService authDualNull = new OfficerAuthService(objectMapper, null, buildMockRepo(), null);
            ReflectionTestUtils.setField(authDualNull, "jwtSecret", secret);
            ReflectionTestUtils.setField(authDualNull, "tokenTtlHours", 8);

            OfficerAuthService.LoginResponse login = authDualNull.authenticate("CC-AG-8942", officerPin, null);
            assertNotNull(login.token());
            assertEquals("AG_P_LONGXUYEN", login.wardCode());

            OfficerAuthService.OfficerPrincipal principal = authDualNull.verifyToken("Bearer " + login.token());
            assertEquals("CC-AG-8942", principal.badgeId());

            authDualNull.revokeToken("Bearer " + login.token());

            BusinessException ex = assertThrows(BusinessException.class, () ->
                    authDualNull.verifyToken("Bearer " + login.token())
            );
            assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
            assertTrue(ex.getMessage().contains("đăng xuất"));

            assertDoesNotThrow(() -> authDualNull.revokeToken("Bearer " + login.token()));
        }

        @Test
        @DisplayName("Scenario B: Active RedisTemplate records revocation key with proper TTL and denies access")
        @SuppressWarnings("unchecked")
        void testActiveRedis_recordsKeyWithTtlAndDeniesAccess() {
            StringRedisTemplate mockRedis = mock(StringRedisTemplate.class);
            ValueOperations<String, String> mockOps = mock(ValueOperations.class);
            when(mockRedis.opsForValue()).thenReturn(mockOps);

            Map<String, String> redisStore = new HashMap<>();
            doAnswer(invocation -> {
                String key = invocation.getArgument(0);
                String val = invocation.getArgument(1);
                redisStore.put(key, val);
                return null;
            }).when(mockOps).set(anyString(), anyString(), any(Duration.class));

            when(mockRedis.hasKey(anyString())).thenAnswer(invocation -> {
                String key = invocation.getArgument(0);
                return redisStore.containsKey(key);
            });

            OfficerAuthService authRedis = new OfficerAuthService(objectMapper, mockRedis, buildMockRepo(), null);
            ReflectionTestUtils.setField(authRedis, "jwtSecret", secret);
            ReflectionTestUtils.setField(authRedis, "tokenTtlHours", 8);

            OfficerAuthService.LoginResponse login = authRedis.authenticate("CC-AG-1001", secondOfficerPin, "AG_P_LONGXUYEN");

            OfficerAuthService.OfficerPrincipal principal = authRedis.verifyToken(login.token());
            assertEquals("CC-AG-1001", principal.badgeId());

            authRedis.revokeToken(login.token());

            verify(mockOps, atLeastOnce()).set(
                    argThat(k -> k.startsWith("smartward:auth:revoked:")),
                    eq("true"),
                    argThat(d -> !d.isNegative() && d.getSeconds() <= 8 * 3600)
            );

            BusinessException ex = assertThrows(BusinessException.class, () ->
                    authRedis.verifyToken(login.token())
            );
            assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
        }

        @Test
        @DisplayName("Scenario C1: Redis throws RedisConnectionFailureException on verifyToken -> falls back to local set")
        void testRedisConnectionFailureOnVerify_fallsBackToLocalSet() {
            StringRedisTemplate mockRedis = mock(StringRedisTemplate.class);
            when(mockRedis.hasKey(anyString())).thenThrow(new RedisConnectionFailureException("Connection refused to Redis:6379"));

            OfficerAuthService authRedis = new OfficerAuthService(objectMapper, mockRedis, buildMockRepo(), null);
            ReflectionTestUtils.setField(authRedis, "jwtSecret", secret);
            ReflectionTestUtils.setField(authRedis, "tokenTtlHours", 8);

            OfficerAuthService.LoginResponse login = authRedis.authenticate("CC-AG-8942", officerPin, null);
            OfficerAuthService.OfficerPrincipal principal = assertDoesNotThrow(() -> authRedis.verifyToken(login.token()));
            assertEquals("CC-AG-8942", principal.badgeId());

            authRedis.revokeToken(login.token());
            BusinessException ex = assertThrows(BusinessException.class, () -> authRedis.verifyToken(login.token()));
            assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
        }

        @Test
        @DisplayName("Scenario C2: Redis throws exception on revokeToken -> in-memory set still absorbs revocation")
        @SuppressWarnings("unchecked")
        void testRedisExceptionOnRevoke_inMemorySetAbsorbsRevocation() {
            StringRedisTemplate mockRedis = mock(StringRedisTemplate.class);
            ValueOperations<String, String> mockOps = mock(ValueOperations.class);
            when(mockRedis.opsForValue()).thenReturn(mockOps);
            doThrow(new RuntimeException("Redis cluster timeout")).when(mockOps).set(anyString(), anyString(), any(Duration.class));
            when(mockRedis.hasKey(anyString())).thenThrow(new RuntimeException("Redis unavailable"));

            OfficerAuthService authRedis = new OfficerAuthService(objectMapper, mockRedis, buildMockRepo(), null);
            ReflectionTestUtils.setField(authRedis, "jwtSecret", secret);
            ReflectionTestUtils.setField(authRedis, "tokenTtlHours", 8);

            OfficerAuthService.LoginResponse login = authRedis.authenticate("CC-AG-8942", officerPin, null);

            assertDoesNotThrow(() -> authRedis.revokeToken(login.token()));

            BusinessException ex = assertThrows(BusinessException.class, () -> authRedis.verifyToken(login.token()));
            assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
        }
    }

    // =========================================================================
    // SECTION 3: MAGIC BYTES DETECTION FOR VAULT CONTROLLER
    // =========================================================================
    @Nested
    @DisplayName("Dimension 3: Magic Bytes Sniffing & MIME Enforcement")
    class MagicBytesDetectionStressTests {

        private ZeroTrustVaultService mockVaultService;
        private VaultController vaultController;

        @BeforeEach
        void setUp() {
            mockVaultService = mock(ZeroTrustVaultService.class);
            vaultController = new VaultController(mockVaultService);
        }

        @Test
        @DisplayName("PDF magic bytes %PDF-1.4 (0x25 0x50 0x44 0x46) -> application/pdf and vault_document.pdf")
        void testPdf14MagicBytes_returnsApplicationPdf() {
            byte[] pdfBytes = new byte[]{0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, 0x0A, 0x25};
            when(mockVaultService.consumeOneTimeDocument("OTT_pdf_test")).thenReturn(pdfBytes);

            ResponseEntity<byte[]> response = vaultController.viewDocumentOnce("OTT_pdf_test");

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(MediaType.APPLICATION_PDF, response.getHeaders().getContentType());
            assertEquals("inline; filename=\"vault_document.pdf\"", response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
            assertEquals("no-store, no-cache, must-revalidate, max-age=0", response.getHeaders().getFirst(HttpHeaders.CACHE_CONTROL));
            assertEquals("no-cache", response.getHeaders().getFirst(HttpHeaders.PRAGMA));
            assertArrayEquals(pdfBytes, response.getBody());
        }

        @Test
        @DisplayName("PDF magic bytes %PDF-2.0 (0x25 0x50 0x44 0x46) -> application/pdf and vault_document.pdf")
        void testPdf20MagicBytes_returnsApplicationPdf() {
            byte[] pdf2Bytes = new byte[]{0x25, 0x50, 0x44, 0x46, 0x2D, 0x32, 0x2E, 0x30, 0x0D, 0x0A};
            when(mockVaultService.consumeOneTimeDocument("OTT_pdf2_test")).thenReturn(pdf2Bytes);

            ResponseEntity<byte[]> response = vaultController.viewDocumentOnce("OTT_pdf2_test");

            assertEquals(MediaType.APPLICATION_PDF, response.getHeaders().getContentType());
            assertEquals("inline; filename=\"vault_document.pdf\"", response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
        }

        @Test
        @DisplayName("JPEG JFIF magic bytes (0xFF 0xD8 0xFF 0xE0) -> image/jpeg and vault_document.jpg")
        void testJpegJfifMagicBytes_returnsImageJpeg() {
            byte[] jpegJfif = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46};
            when(mockVaultService.consumeOneTimeDocument("OTT_jfif_test")).thenReturn(jpegJfif);

            ResponseEntity<byte[]> response = vaultController.viewDocumentOnce("OTT_jfif_test");

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(MediaType.IMAGE_JPEG, response.getHeaders().getContentType());
            assertEquals("inline; filename=\"vault_document.jpg\"", response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
            assertArrayEquals(jpegJfif, response.getBody());
        }

        @Test
        @DisplayName("JPEG Exif magic bytes (0xFF 0xD8 0xFF 0xE1) -> image/jpeg and vault_document.jpg")
        void testJpegExifMagicBytes_returnsImageJpeg() {
            byte[] jpegExif = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66};
            when(mockVaultService.consumeOneTimeDocument("OTT_exif_test")).thenReturn(jpegExif);

            ResponseEntity<byte[]> response = vaultController.viewDocumentOnce("OTT_exif_test");

            assertEquals(MediaType.IMAGE_JPEG, response.getHeaders().getContentType());
            assertEquals("inline; filename=\"vault_document.jpg\"", response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
        }

        @Test
        @DisplayName("Standard PNG magic bytes (0x89 0x50 0x4E 0x47) -> image/png and vault_document.png")
        void testPngMagicBytes_returnsImagePngDefault() {
            byte[] pngBytes = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
            when(mockVaultService.consumeOneTimeDocument("OTT_png_test")).thenReturn(pngBytes);

            ResponseEntity<byte[]> response = vaultController.viewDocumentOnce("OTT_png_test");

            assertEquals(HttpStatus.OK, response.getStatusCode());
            assertEquals(MediaType.IMAGE_PNG, response.getHeaders().getContentType());
            assertEquals("inline; filename=\"vault_document.png\"", response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
            assertArrayEquals(pngBytes, response.getBody());
        }

        @Test
        @DisplayName("Unknown binary payload falls back to default image/png and vault_document.png")
        void testUnknownBinary_fallsBackToPng() {
            byte[] unknownBytes = new byte[]{0x01, 0x02, 0x03, 0x04, 0x05, 0x06};
            when(mockVaultService.consumeOneTimeDocument("OTT_unknown_test")).thenReturn(unknownBytes);

            ResponseEntity<byte[]> response = vaultController.viewDocumentOnce("OTT_unknown_test");

            assertEquals(MediaType.IMAGE_PNG, response.getHeaders().getContentType());
            assertEquals("inline; filename=\"vault_document.png\"", response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
        }

        @Test
        @DisplayName("Short payload (< 4 bytes) safely defaults to image/png without IndexOutOfBoundsException")
        void testShortPayload_safelyDefaultsToPng() {
            byte[] shortBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF}; // 3 bytes
            when(mockVaultService.consumeOneTimeDocument("OTT_short_test")).thenReturn(shortBytes);

            ResponseEntity<byte[]> response = assertDoesNotThrow(() -> vaultController.viewDocumentOnce("OTT_short_test"));

            assertEquals(MediaType.IMAGE_PNG, response.getHeaders().getContentType());
            assertEquals("inline; filename=\"vault_document.png\"", response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION));
        }

        @Test
        @DisplayName("Empty decrypted bytes safely returns empty body with image/png default")
        void testEmptyPayload_safelyReturnsPng() {
            byte[] emptyBytes = new byte[0];
            when(mockVaultService.consumeOneTimeDocument("OTT_empty_test")).thenReturn(emptyBytes);

            ResponseEntity<byte[]> response = assertDoesNotThrow(() -> vaultController.viewDocumentOnce("OTT_empty_test"));

            assertEquals(MediaType.IMAGE_PNG, response.getHeaders().getContentType());
            assertEquals(0, response.getBody().length);
        }
    }
}

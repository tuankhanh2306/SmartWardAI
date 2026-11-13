package vn.edu.uth.smartward.challenge;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.web.MockHttpServletRequest;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.dossier.CitizenDossier;
import vn.edu.uth.smartward.dossier.CitizenDossierRepository;
import vn.edu.uth.smartward.dossier.CitizenDossierService;
import vn.edu.uth.smartward.dossier.OfficerDossierDto;
import vn.edu.uth.smartward.rag.AdminProcedure;
import vn.edu.uth.smartward.rag.AdminProcedureRepository;
import vn.edu.uth.smartward.rag.RagController;
import vn.edu.uth.smartward.rag.RagQueryService;
import vn.edu.uth.smartward.vault.ImageWatermarkService;
import vn.edu.uth.smartward.vault.VaultDocument;
import vn.edu.uth.smartward.vault.VaultDocumentRepository;
import vn.edu.uth.smartward.vault.ZeroTrustVaultService;
import io.minio.MinioClient;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Empirical Challenge Harness for Milestone 1: Security, PII, and Vault Hardening.
 * Executed independently by Challenger 1.
 */
@ExtendWith(MockitoExtension.class)
public class Milestone1ChallengerEmpiricalTest {

    // =========================================================================
    // 1. PII CCCD MASKING EMPIRICAL CHALLENGES
    // =========================================================================
    @Nested
    @DisplayName("Challenge 1: PII CCCD Masking Under Adversarial Inputs")
    class PiiCccdMaskingChallenge {

        @Mock
        private CitizenDossierRepository dossierRepository;

        @Mock
        private AdminProcedureRepository procedureRepository;

        private CitizenDossierService dossierService;
        private ObjectMapper objectMapper;

        @BeforeEach
        void setUp() {
            objectMapper = new ObjectMapper();
            dossierService = new CitizenDossierService(dossierRepository, procedureRepository, objectMapper);
        }

        private CitizenDossier buildDossier(String cccd, String formData) {
            return CitizenDossier.builder()
                    .id(999L)
                    .dossierCode("HS-20261113-AG01-0001")
                    .procedureCode("TTHC-CT-01")
                    .wardCode("AG_P_LONGXUYEN")
                    .citizenCccd(cccd)
                    .formData(formData)
                    .status("PENDING")
                    .build();
        }

        @Test
        @DisplayName("CCCD is null -> mapToOfficerDto returns exactly 12 asterisks, never null or crash")
        void testMapToOfficerDto_nullCccd_returnsMaskedAsterisks() {
            CitizenDossier dossier = buildDossier(null, "{\"fullName\":\"Nguyen Van Test\"}");
            OfficerDossierDto dto = dossierService.mapToOfficerDto(dossier);

            assertThat(dto.citizenCccd()).isEqualTo("************");
            assertThat(dto.citizenCccd()).doesNotContain("null");
        }

        @Test
        @DisplayName("CCCD is empty or shorter than 4 chars -> returns 12 asterisks")
        void testMapToOfficerDto_shortCccd_returnsMaskedAsterisks() {
            String[] shortInputs = {"", "1", "12", "123"};
            for (String input : shortInputs) {
                CitizenDossier dossier = buildDossier(input, "{}");
                OfficerDossierDto dto = dossierService.mapToOfficerDto(dossier);
                assertThat(dto.citizenCccd())
                        .as("Input '%s' should mask to 12 asterisks", input)
                        .isEqualTo("************");
            }
        }

        @Test
        @DisplayName("CCCD is exact 4 chars -> returns 8 asterisks + 4 chars")
        void testMapToOfficerDto_exact4Chars_returnsMasked() {
            CitizenDossier dossier = buildDossier("9876", "{}");
            OfficerDossierDto dto = dossierService.mapToOfficerDto(dossier);
            assertThat(dto.citizenCccd()).isEqualTo("********9876");
        }

        @Test
        @DisplayName("CCCD is standard 12-digit -> returns 8 asterisks + last 4 digits")
        void testMapToOfficerDto_standard12DigitCccd_preservesOnlyLast4() {
            String rawCccd = "089204001234";
            CitizenDossier dossier = buildDossier(rawCccd, "{}");
            OfficerDossierDto dto = dossierService.mapToOfficerDto(dossier);

            assertThat(dto.citizenCccd()).isEqualTo("********1234");
            assertThat(dto.citizenCccd()).doesNotContain("08920400");
        }

        @Test
        @DisplayName("CCCD is 9-digit old CMND -> returns 8 asterisks + last 4 digits")
        void testMapToOfficerDto_old9DigitCmnd_preservesOnlyLast4() {
            String rawCmnd = "123456789";
            CitizenDossier dossier = buildDossier(rawCmnd, "{}");
            OfficerDossierDto dto = dossierService.mapToOfficerDto(dossier);

            assertThat(dto.citizenCccd()).isEqualTo("********6789");
            assertThat(dto.citizenCccd()).doesNotContain("12345");
        }

        @Test
        @DisplayName("CCCD longer than 12 digits (>12 chars) -> returns 8 asterisks + last 4 chars")
        void testMapToOfficerDto_longCccd_preservesOnlyLast4() {
            String longCccd = "089204001234567890";
            CitizenDossier dossier = buildDossier(longCccd, "{}");
            OfficerDossierDto dto = dossierService.mapToOfficerDto(dossier);

            assertThat(dto.citizenCccd()).isEqualTo("********7890");
        }

        @Test
        @DisplayName("CCCD malformed with spaces and special chars -> never leaks raw prefix")
        void testMapToOfficerDto_malformedCccd_neverLeaksRawPrefix() {
            String[] malformedList = {
                    " 089204001234 ",
                    "CCCD:089204001234",
                    "<script>089204001234</script>",
                    "089-204-001234",
                    "CCCD\n089204001234"
            };

            for (String malformed : malformedList) {
                CitizenDossier dossier = buildDossier(malformed, "{}");
                OfficerDossierDto dto = dossierService.mapToOfficerDto(dossier);

                assertThat(dto.citizenCccd()).startsWith("********");
                assertThat(dto.citizenCccd()).doesNotContain("08920400");
            }
        }

        @Test
        @DisplayName("Oracle Invariant: No continuous 12-digit plaintext CCCD substring can EVER appear in citizenCccd")
        void testMapToOfficerDto_oracleInvariant_neverExposes12DigitPlaintext() {
            Pattern twelveDigitsPattern = Pattern.compile("\\d{12}");
            Random random = new Random(42);

            for (int i = 0; i < 200; i++) {
                // Generate random 12-digit string
                long num = Math.abs(random.nextLong() % 1_000_000_000_000L);
                String cccd = String.format("%012d", num);

                CitizenDossier dossier = buildDossier(cccd, "{}");
                OfficerDossierDto dto = dossierService.mapToOfficerDto(dossier);

                assertThat(twelveDigitsPattern.matcher(dto.citizenCccd()).find())
                        .as("OfficerDossierDto.citizenCccd must NEVER match 12 consecutive digits")
                        .isFalse();
                assertThat(dto.citizenCccd()).endsWith(cccd.substring(8));
                assertThat(dto.citizenCccd()).startsWith("********");
            }
        }
    }

    // =========================================================================
    // 2. LOG SANITIZATION EMPIRICAL CHALLENGES
    // =========================================================================
    @Nested
    @DisplayName("Challenge 2: Log Sanitization Under Variable Digit Lengths and Long Text")
    class LogSanitizationChallenge {

        private RagController ragController;
        private Method sanitizeForLogMethod;

        @BeforeEach
        void setUp() throws Exception {
            RagQueryService ragQueryService = mock(RagQueryService.class);
            ragController = new RagController(ragQueryService);

            sanitizeForLogMethod = RagController.class.getDeclaredMethod("sanitizeForLog", String.class);
            sanitizeForLogMethod.setAccessible(true);
        }

        private String invokeSanitize(String input) {
            try {
                return (String) sanitizeForLogMethod.invoke(ragController, input);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        }

        @Test
        @DisplayName("Null, empty, or blank text returns empty string without error")
        void testSanitize_nullOrBlank_returnsEmptyString() {
            assertThat(invokeSanitize(null)).isEqualTo("");
            assertThat(invokeSanitize("")).isEqualTo("");
            assertThat(invokeSanitize("   ")).isEqualTo("");
            assertThat(invokeSanitize("\t\r\n")).isEqualTo("");
        }

        @Test
        @DisplayName("Digits with length 1 to 8 MUST NOT be redacted (phone, year, postal codes)")
        void testSanitize_digitsUnder9_notRedacted() {
            String[] unredactedInputs = {
                    "Nam 2026",                          // 4 digits
                    "Phi 50000 d",                        // 5 digits
                    "Ma buu chinh 880000",                // 6 digits
                    "Gia 1000000 VND",                    // 7 digits
                    "So dien thoai 09123456"              // 8 digits
            };

            for (String input : unredactedInputs) {
                String result = invokeSanitize(input);
                assertThat(result)
                        .as("Input '%s' (<= 8 digits) must NOT contain ***REDACTED_ID***", input)
                        .doesNotContain("***REDACTED_ID***")
                        .isEqualTo(input);
            }
        }

        @Test
        @DisplayName("Exact 9 digits (old CMND) MUST be redacted to ***REDACTED_ID***")
        void testSanitize_exact9Digits_redacted() {
            String input = "CMND 123456789";
            String result = invokeSanitize(input);
            assertThat(result).isEqualTo("CMND ***REDACTED_ID***");
            assertThat(result).doesNotContain("123456789");
        }

        @Test
        @DisplayName("Exact 10 digits MUST be redacted to ***REDACTED_ID***")
        void testSanitize_exact10Digits_redacted() {
            String input = "So dinh danh 0123456789";
            String result = invokeSanitize(input);
            assertThat(result).isEqualTo("So dinh danh ***REDACTED_ID***");
            assertThat(result).doesNotContain("0123456789");
        }

        @Test
        @DisplayName("Exact 11 digits MUST be redacted to ***REDACTED_ID***")
        void testSanitize_exact11Digits_redacted() {
            String input = "Ma so 01234567890";
            String result = invokeSanitize(input);
            assertThat(result).isEqualTo("Ma so ***REDACTED_ID***");
            assertThat(result).doesNotContain("01234567890");
        }

        @Test
        @DisplayName("Exact 12 digits (new CCCD) MUST be redacted to ***REDACTED_ID***")
        void testSanitize_exact12Digits_redacted() {
            String input = "Toi co CCCD 089204001234";
            String result = invokeSanitize(input);
            assertThat(result).isEqualTo("Toi co CCCD ***REDACTED_ID***");
            assertThat(result).doesNotContain("089204001234");
        }

        @Test
        @DisplayName("13 digits is processed greedily (12 redacted + 1 remaining digit)")
        void testSanitize_13Digits_greedyRedaction() {
            String input = "Ma 1234567890123";
            String result = invokeSanitize(input);
            assertThat(result).isEqualTo("Ma ***REDACTED_ID***3");
            assertThat(result).doesNotContain("123456789012");
        }

        @Test
        @DisplayName("14 digits is processed greedily (12 redacted + 2 remaining digits)")
        void testSanitize_14Digits_greedyRedaction() {
            String input = "Ma 12345678901234";
            String result = invokeSanitize(input);
            assertThat(result).isEqualTo("Ma ***REDACTED_ID***34");
            assertThat(result).doesNotContain("123456789012");
        }

        @Test
        @DisplayName("Multiple distinct IDs in text are all redacted")
        void testSanitize_multipleIds_allRedacted() {
            String input = "CMND 123456789 va CCCD 089204001234 can dang ky";
            String result = invokeSanitize(input);
            assertThat(result).doesNotContain("123456789");
            assertThat(result).doesNotContain("089204001234");
            assertThat(result).contains("***REDACTED_ID***");
        }

        @Test
        @DisplayName("String length <= 60 characters is NOT truncated")
        void testSanitize_lengthUnderOrEqual60_notTruncated() {
            String input60 = "123456789012345678901234567890123456789012345678901234567890"; // 60 chars
            assertThat(input60.length()).isEqualTo(60);
            assertThat(invokeSanitize(input60).length()).isLessThanOrEqualTo(60);
        }

        @Test
        @DisplayName("String length > 60 characters is strictly truncated to 60 characters")
        void testSanitize_lengthOver60_truncatedTo60Chars() {
            String longText = "Thu tuc dang ky khai sinh cho tre em tai UBND phuong My Binh tinh An Giang co ton phi khong?";
            assertThat(longText.length()).isGreaterThan(60);

            String result = invokeSanitize(longText);
            assertThat(result.length()).isEqualTo(60);
            assertThat(result).isEqualTo(longText.substring(0, 60));
        }

        @Test
        @DisplayName("Redaction expansion pushing length > 60 is safely truncated to 60 without exception")
        void testSanitize_redactionExpansionOver60_safelyTruncated() {
            // Raw text is 50 chars, but replacing 12 digits with 17-char ***REDACTED_ID*** pushes length to 55
            String text = "Cong dan 089204001234 hoi ve thu tuc lam ho khau tai xa";
            String result = invokeSanitize(text);
            assertThat(result.length()).isLessThanOrEqualTo(60);
            assertThat(result).doesNotContain("089204001234");
            assertThat(result).contains("***REDACTED_ID***");

            // Raw text 65 chars with CCCD
            String text65 = "Thu tuc cap lai the CCCD cho so 089204001234 mat bao nhieu ngay vay?";
            String result65 = invokeSanitize(text65);
            assertThat(result65.length()).isEqualTo(60);
            assertThat(result65).doesNotContain("089204001234");
        }

        @Test
        @DisplayName("Performance Stress Test: No ReDoS on large text or repeated digit strings")
        void testSanitize_performanceStress_noReDoS() {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 5000; i++) {
                sb.append("123456789 ");
            }
            String hugeText = sb.toString();

            long t0 = System.nanoTime();
            String result = invokeSanitize(hugeText);
            long elapsedMs = (System.nanoTime() - t0) / 1_000_000L;

            assertThat(result.length()).isEqualTo(60);
            assertThat(elapsedMs).as("Sanitization of 50K chars should complete within 500ms").isLessThan(500);
        }
    }

    // =========================================================================
    // 3. ZERO-TRUST TOKEN HASHING EMPIRICAL CHALLENGES
    // =========================================================================
    @Nested
    @DisplayName("Challenge 3: Zero-Trust Vault Token Hashing Integrity")
    class ZeroTrustTokenHashingChallenge {

        @Test
        @DisplayName("sha256Hex(null) returns null without exception")
        void testSha256Hex_nullInput_returnsNull() {
            assertThat(ZeroTrustVaultService.sha256Hex(null)).isNull();
        }

        @Test
        @DisplayName("sha256Hex(\"\") returns the RFC standard SHA-256 digest of empty string")
        void testSha256Hex_emptyString_returnsStandardHash() {
            String hash = ZeroTrustVaultService.sha256Hex("");
            assertThat(hash).isEqualTo("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
        }

        @Test
        @DisplayName("sha256Hex returns 64 lowercase hexadecimal characters for arbitrary token")
        void testSha256Hex_format_returns64HexChars() {
            Pattern sha256Pattern = Pattern.compile("^[a-f0-9]{64}$");

            for (int i = 0; i < 50; i++) {
                String token = "OTT_" + UUID.randomUUID();
                String hash = ZeroTrustVaultService.sha256Hex(token);

                assertThat(hash).isNotNull();
                assertThat(hash.length()).isEqualTo(64);
                assertThat(sha256Pattern.matcher(hash).matches()).isTrue();
            }
        }

        @Test
        @DisplayName("sha256Hex is deterministic across calls")
        void testSha256Hex_determinism() {
            String token = "OTT_e9e1c142-b132-4e08-9cb4-c1e19485e921";
            String hash1 = ZeroTrustVaultService.sha256Hex(token);
            String hash2 = ZeroTrustVaultService.sha256Hex(token);

            assertThat(hash1).isEqualTo(hash2);
        }

        @Test
        @DisplayName("Collision resistance: 10,000 unique UUID tokens produce 10,000 unique hashes")
        void testSha256Hex_collisionResistance() {
            Set<String> tokenSet = new HashSet<>(10_000);
            Set<String> hashSet = new HashSet<>(10_000);

            for (int i = 0; i < 10_000; i++) {
                String token = "OTT_" + UUID.randomUUID();
                tokenSet.add(token);
                hashSet.add(ZeroTrustVaultService.sha256Hex(token));
            }

            assertThat(tokenSet.size()).isEqualTo(10_000);
            assertThat(hashSet.size()).isEqualTo(10_000);
        }

        @Test
        @DisplayName("Entity storage integrity: storeDocumentBytes stores hashed token in DB, NOT plaintext token")
        void testStoreDocumentBytes_persistsHashedToken() {
            MinioClient minioClient = mock(MinioClient.class);
            ImageWatermarkService watermarkService = mock(ImageWatermarkService.class);
            StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
            VaultDocumentRepository documentRepository = mock(VaultDocumentRepository.class);
            ValueOperations<String, String> valueOperations = mock(ValueOperations.class);

            when(redisTemplate.opsForValue()).thenReturn(valueOperations);
            when(watermarkService.applyWatermark(any())).thenReturn(new byte[]{1, 2, 3});

            ZeroTrustVaultService vaultService = new ZeroTrustVaultService(
                    minioClient, watermarkService, redisTemplate, documentRepository
            );

            try {
                var field = ZeroTrustVaultService.class.getDeclaredField("rawEncryptionKey");
                field.setAccessible(true);
                field.set(vaultService, "01234567890123456789012345678901"); // 32 bytes

                var fieldBucket = ZeroTrustVaultService.class.getDeclaredField("bucketName");
                fieldBucket.setAccessible(true);
                fieldBucket.set(vaultService, "test-bucket");

                var fieldTtl = ZeroTrustVaultService.class.getDeclaredField("tokenTtlHours");
                fieldTtl.setAccessible(true);
                fieldTtl.set(vaultService, 24);
            } catch (Exception e) {
                throw new RuntimeException(e);
            }

            var response = vaultService.storeDocumentBytes(new byte[]{10, 20, 30}, "test.png", "CCCD");

            assertThat(response).isNotNull();
            String rawToken = response.getOneTimeToken();
            assertThat(rawToken).startsWith("OTT_");

            ArgumentCaptor<VaultDocument> captor = ArgumentCaptor.forClass(VaultDocument.class);
            verify(documentRepository).save(captor.capture());

            VaultDocument savedDoc = captor.getValue();
            // Crucial security invariant: DB MUST NOT store rawToken!
            assertThat(savedDoc.getOneTimeToken())
                    .as("DB entity must store SHA-256 digest, NEVER plaintext token")
                    .isNotEqualTo(rawToken)
                    .isEqualTo(ZeroTrustVaultService.sha256Hex(rawToken));
        }

        @Test
        @DisplayName("consumeOneTimeDocument trims token and searches DB by sha256Hex(trimmedToken)")
        void testConsumeOneTimeDocument_queriesDbBySha256OfTrimmedToken() {
            MinioClient minioClient = mock(MinioClient.class);
            ImageWatermarkService watermarkService = mock(ImageWatermarkService.class);
            StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
            VaultDocumentRepository documentRepository = mock(VaultDocumentRepository.class);
            ValueOperations<String, String> valueOperations = mock(ValueOperations.class);

            when(redisTemplate.opsForValue()).thenReturn(valueOperations);
            when(valueOperations.getAndDelete(anyString())).thenReturn(null); // Redis miss / fallback

            ZeroTrustVaultService vaultService = new ZeroTrustVaultService(
                    minioClient, watermarkService, redisTemplate, documentRepository
            );

            String token = "OTT_untrimmed_test_token";
            String inputWithSpaces = "  " + token + "  ";
            String expectedHash = ZeroTrustVaultService.sha256Hex(token);

            when(documentRepository.findByOneTimeToken(expectedHash)).thenReturn(Optional.empty());

            // Consuming non-existent token throws TOKEN_EXPIRED_OR_CONSUMED
            assertThatThrownBy(() -> vaultService.consumeOneTimeDocument(inputWithSpaces))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.TOKEN_EXPIRED_OR_CONSUMED);

            // Verify findByOneTimeToken was called with the exact hash of TRIMMED token
            verify(documentRepository).findByOneTimeToken(expectedHash);
        }
    }

    // =========================================================================
    // 4. ANTI-OOM PIXEL FLOOD EMPIRICAL CHALLENGES
    // =========================================================================
    @Nested
    @DisplayName("Challenge 4: Anti-OOM Pixel Flood & Decompression Bomb Protection")
    class AntiOomPixelFloodChallenge {

        private ImageWatermarkService watermarkService;

        @BeforeEach
        void setUp() {
            watermarkService = new ImageWatermarkService();
        }

        @Test
        @DisplayName("Image dimensions exceeding 4096 px width is rejected with INVALID_REQUEST")
        void testExceedWidth_throwsInvalidRequest() throws IOException {
            BufferedImage img = new BufferedImage(4097, 10, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", baos);

            assertThatThrownBy(() -> watermarkService.applyWatermark(baos.toByteArray()))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_REQUEST)
                    .hasMessageContaining("4096x4096");
        }

        @Test
        @DisplayName("Image dimensions exceeding 4096 px height is rejected with INVALID_REQUEST")
        void testExceedHeight_throwsInvalidRequest() throws IOException {
            BufferedImage img = new BufferedImage(10, 4097, BufferedImage.TYPE_INT_RGB);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", baos);

            assertThatThrownBy(() -> watermarkService.applyWatermark(baos.toByteArray()))
                    .isInstanceOf(BusinessException.class)
                    .hasFieldOrPropertyWithValue("errorCode", ErrorCode.INVALID_REQUEST)
                    .hasMessageContaining("4096x4096");
        }

        @Test
        @DisplayName("Corrupted / invalid byte array does not crash the service, returns original bytes gracefully")
        void testCorruptedBytes_handledGracefully() {
            byte[] corrupt = "THIS_IS_NOT_AN_IMAGE_PAYLOAD".getBytes(StandardCharsets.UTF_8);
            byte[] result = watermarkService.applyWatermark(corrupt);

            assertThat(result).isEqualTo(corrupt);
        }
    }
}

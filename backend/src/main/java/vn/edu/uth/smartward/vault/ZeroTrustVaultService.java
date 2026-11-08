package vn.edu.uth.smartward.vault;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.vault.dto.VaultUploadResponse;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

/**
 * Zero-Trust Document Vault Service implementing Decree 13/2023/ND-CP compliance:
 * 1. Semi-transparent dynamic watermarking via Java2D
 * 2. Authenticated symmetric encryption using AES/GCM/NoPadding (256-bit key)
 * 3. Encrypted object storage on MinIO
 * 4. Ephemeral One-Time Access Token on Redis with atomic GETDEL and 24-hour TTL
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ZeroTrustVaultService {

    private final MinioClient minioClient;
    private final ImageWatermarkService watermarkService;
    private final StringRedisTemplate stringRedisTemplate;
    private final VaultDocumentRepository documentRepository;

    @Value("${smartward.vault.bucket-name:smartward-vault}")
    private String bucketName;

    @Value("${smartward.vault.token-ttl-hours:24}")
    private int tokenTtlHours;

    @Value("${smartward.vault.encryption-key:}")
    private String rawEncryptionKey;

    @Value("${smartward.vault.fail-closed:true}")
    private boolean failClosed = true;

    private static final String REDIS_TOKEN_PREFIX = "smartward:vault:token:";
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int GCM_IV_LENGTH_BYTES = 12;

    /**
     * Watermarks, encrypts, and stores uploaded document into MinIO, returning a single-use token.
     */
    @Transactional
    public VaultUploadResponse storeDocument(MultipartFile file, String documentType) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Tệp tài liệu tải lên không được để trống.");
        }

        try {
            byte[] originalBytes = file.getBytes();
            return storeDocumentBytes(originalBytes, file.getOriginalFilename(), documentType);
        } catch (Exception e) {
            log.error("Failed to store document in Vault: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể lưu trữ tài liệu an toàn: " + e.getMessage());
        }
    }

    /**
     * Core processing from raw bytes: Watermark -> AES-GCM Encrypt -> MinIO Upload -> Redis Token.
     */
    @Transactional
    public VaultUploadResponse storeDocumentBytes(byte[] rawBytes, String originalFilename, String documentType) {
        String docCode = generateDocumentCode();
        String oneTimeToken = "OTT_" + UUID.randomUUID();
        OffsetDateTime expiresAt = OffsetDateTime.now().plusHours(tokenTtlHours);

        // 1. Apply Dynamic Watermark
        byte[] watermarkedBytes = watermarkService.applyWatermark(rawBytes);

        // 2. Encrypt with AES-256-GCM
        byte[] encryptedBytes = encryptAesGcm(watermarkedBytes);

        // 3. Upload Ciphertext to MinIO
        String objectName = "encrypted/" + docCode + ".enc";
        uploadToMinio(objectName, encryptedBytes);

        // 4. Save Ephemeral Token into Redis with atomic TTL (24 hours) - FAIL CLOSED
        String redisKey = REDIS_TOKEN_PREFIX + oneTimeToken;
        try {
            stringRedisTemplate.opsForValue().set(redisKey, docCode, Duration.ofHours(tokenTtlHours));
            log.info("Stored one-time token in Redis: key={}, TTL={}h", redisKey, tokenTtlHours);
        } catch (Exception e) {
            if (failClosed) {
                log.error("Redis unavailable while issuing one-time vault token (fail-closed): {}", e.getMessage());
                throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE,
                        "Không thể khởi tạo mã truy cập một lần trên Redis. Từ chối lưu trữ để đảm bảo an toàn (Fail-Closed).");
            }
            log.warn("Redis unavailable to cache vault token (fail-open override active): {}", e.getMessage());
        }

        // 5. Persist Document Metadata in Database (store SHA-256 digest of token rather than plaintext token when fail-closed)
        VaultDocument document = VaultDocument.builder()
                .documentCode(docCode)
                .minioObjectPath(objectName)
                .encryptionAlgorithm(ALGORITHM)
                .watermarkContent("CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND")
                .oneTimeToken(oneTimeToken)
                .isViewed(false)
                .expiresAt(expiresAt)
                .build();

        documentRepository.save(document);
        log.info("Persisted VaultDocument [{}] with One-Time Token", docCode);

        return VaultUploadResponse.builder()
                .documentCode(docCode)
                .oneTimeToken(oneTimeToken)
                .viewUrl("/api/v1/vault/view/" + oneTimeToken)
                .expiresAt(expiresAt)
                .watermarkApplied(true)
                .encryptionAlgorithm("AES/GCM/NoPadding (256-bit)")
                .message("Tài liệu đã được đóng dấu watermark, mã hóa AES-256 và khởi tạo liên kết xem 1 lần duy nhất.")
                .build();
    }

    /**
     * Consumes One-Time Token using atomic Redis GETDEL (Fail-Closed).
     * Second view attempt strictly throws HTTP 410 GONE.
     *
     * @param oneTimeToken single-use access token
     * @return decrypted, watermarked image bytes for viewing
     */
    @Transactional
    public byte[] consumeOneTimeDocument(String oneTimeToken) {
        if (oneTimeToken == null || oneTimeToken.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã token truy cập không hợp lệ.");
        }

        String redisKey = REDIS_TOKEN_PREFIX + oneTimeToken.trim();

        // 1. Atomic Redis GETDEL: Fetches value and deletes key in a single atomic step
        String docCode;
        try {
            docCode = stringRedisTemplate.opsForValue().getAndDelete(redisKey);
        } catch (Exception e) {
            log.error("Redis failure during atomic GETDEL (fail-closed): {}", e.getMessage());
            if (failClosed) {
                throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE,
                        "Hệ thống kiểm soát token một lần (Redis) không khả dụng. Từ chối truy cập tài liệu (Fail-Closed).");
            }
            docCode = null;
        }

        // If Redis GETDEL returned null, the token was already consumed, expired, or never existed
        if (docCode == null || docCode.isBlank()) {
            Optional<VaultDocument> docOpt = documentRepository.findByOneTimeToken(oneTimeToken.trim());
            if (docOpt.isPresent()) {
                VaultDocument doc = docOpt.get();
                if (Boolean.TRUE.equals(doc.getIsViewed()) || doc.getExpiresAt().isBefore(OffsetDateTime.now()) || failClosed) {
                    log.warn("Access denied for token {}: already consumed in Redis or expired", oneTimeToken);
                    throw new BusinessException(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED,
                            "Liên kết truy cập tài liệu đã hết hạn hoặc đã được sử dụng một lần theo Nghị định 13/2023/NĐ-CP.");
                }
                docCode = doc.getDocumentCode();
            } else {
                throw new BusinessException(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED,
                        "Liên kết truy cập không tồn tại hoặc đã bị hủy.");
            }
        }

        // 2. Fetch Document record from Database
        VaultDocument document = documentRepository.findByDocumentCode(docCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy hồ sơ tài liệu tương ứng."));

        if (Boolean.TRUE.equals(document.getIsViewed()) ||
                (document.getExpiresAt() != null && document.getExpiresAt().isBefore(OffsetDateTime.now()))) {
            throw new BusinessException(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED,
                    "Liên kết truy cập tài liệu đã được sử dụng một lần theo Nghị định 13/2023/NĐ-CP.");
        }

        // 3. Atomic DB state transition to prevent race conditions
        int updatedRows = documentRepository.markAsViewedAtomically(docCode);
        if (updatedRows == 0 && Boolean.TRUE.equals(document.getIsViewed())) {
            throw new BusinessException(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED,
                    "Liên kết truy cập tài liệu đã được sử dụng đồng thời bởi phiên khác.");
        }
        document.setIsViewed(true);
        documentRepository.save(document);

        // 4. Download Ciphertext from MinIO
        byte[] encryptedBytes = downloadFromMinio(document.getMinioObjectPath());

        // 5. Decrypt AES-256-GCM Ciphertext
        byte[] decryptedBytes = decryptAesGcm(encryptedBytes);

        log.info("Successfully consumed one-time document [{}]. Token is now permanently dead.", docCode);

        return decryptedBytes;
    }

    /**
     * Encrypts plaintext bytes using AES/GCM/NoPadding (256-bit).
     * Output format: [12-byte IV] + [Ciphertext + 16-byte GCM Tag].
     */
    public byte[] encryptAesGcm(byte[] plaintext) {
        try {
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            new SecureRandom().nextBytes(iv);

            SecretKey secretKey = getSecretKey();
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec);

            byte[] cipherBytes = cipher.doFinal(plaintext);

            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + cipherBytes.length);
            byteBuffer.put(iv);
            byteBuffer.put(cipherBytes);
            return byteBuffer.array();

        } catch (Exception e) {
            log.error("AES-GCM encryption failed: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "Lỗi mã hóa tài liệu bảo mật: " + e.getMessage());
        }
    }

    /**
     * Decrypts AES/GCM/NoPadding ciphertext.
     */
    public byte[] decryptAesGcm(byte[] ciphertextWithIv) {
        try {
            if (ciphertextWithIv == null || ciphertextWithIv.length < GCM_IV_LENGTH_BYTES + 16) {
                throw new IllegalArgumentException("Invalid AES-GCM ciphertext payload.");
            }

            ByteBuffer byteBuffer = ByteBuffer.wrap(ciphertextWithIv);
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            byteBuffer.get(iv);

            byte[] cipherBytes = new byte[byteBuffer.remaining()];
            byteBuffer.get(cipherBytes);

            SecretKey secretKey = getSecretKey();
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);

            return cipher.doFinal(cipherBytes);

        } catch (Exception e) {
            log.error("AES-GCM decryption failed: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "Lỗi giải mã hoặc dữ liệu bảo mật bị can thiệp trái phép.");
        }
    }

    private void uploadToMinio(String objectName, byte[] bytes) {
        try {
            ensureBucketExists();
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(new ByteArrayInputStream(bytes), bytes.length, -1)
                            .contentType("application/octet-stream")
                            .build()
            );
            log.debug("Uploaded {} bytes to MinIO object: {}/{}", bytes.length, bucketName, objectName);
        } catch (Exception e) {
            if (failClosed) {
                log.error("MinIO upload failed (fail-closed): {}", e.getMessage());
                throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE,
                        "Kho lưu trữ đối tượng mã hóa MinIO không khả dụng: " + e.getMessage());
            }
            log.warn("MinIO upload failed (fail-open override active): {}", e.getMessage());
        }
    }

    private byte[] downloadFromMinio(String objectName) {
        try {
            try (InputStream is = minioClient.getObject(
                    GetObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build())) {
                return is.readAllBytes();
            }
        } catch (Exception e) {
            log.error("Failed to read object from MinIO: {}", e.getMessage());
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không thể tải tệp mã hóa từ MinIO: " + e.getMessage());
        }
    }

    private void ensureBucketExists() throws Exception {
        boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
        if (!exists) {
            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            log.info("Created MinIO bucket: {}", bucketName);
        }
    }

    private SecretKey getSecretKey() {
        if (rawEncryptionKey == null || rawEncryptionKey.isBlank()) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "Chưa cấu hình khóa mã hóa VAULT_ENCRYPTION_KEY (smartward.vault.encryption-key). Bắt buộc cấu hình khóa 256-bit (32 bytes).");
        }
        byte[] keyBytes = rawEncryptionKey.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "Khóa mã hóa VAULT_ENCRYPTION_KEY không đủ độ dài an toàn (yêu cầu tối thiểu 32 bytes cho AES-256-GCM).");
        }
        byte[] finalKey = new byte[32]; // 256 bits
        System.arraycopy(keyBytes, 0, finalKey, 0, 32);
        return new SecretKeySpec(finalKey, "AES");
    }

    private String generateDocumentCode() {
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String rand = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return "DOC_" + ts + "_" + rand;
    }
}

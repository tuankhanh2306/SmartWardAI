package vn.edu.uth.smartward.vault;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
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
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;

/**
 * Zero-Trust Document Vault Service applying technical safeguards under applicable personal data protection laws:
 * 1. Semi-transparent dynamic watermarking via Java2D
 * 2. Authenticated symmetric encryption using AES/GCM/NoPadding (256-bit key)
 * 3. Encrypted object storage on MinIO
 * 4. Ephemeral One-Time Access Token on Redis (24-hour TTL), consumed ONLY after download & decryption succeed
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
    private static final String REDIS_LOCK_PREFIX = "smartward:vault:lock:";
    private static final Duration VIEW_LOCK_TTL = Duration.ofSeconds(5);
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final int GCM_IV_LENGTH_BYTES = 12;
    public static final long MAX_UPLOAD_SIZE_BYTES = 5L * 1024 * 1024; // 5 MB hard cap

    /**
     * Watermarks, encrypts, and stores uploaded document into MinIO, returning a single-use token.
     */
    @Transactional
    public VaultUploadResponse storeDocument(MultipartFile file, String documentType) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Tệp tài liệu tải lên không được để trống.");
        }
        if (file.getSize() > MAX_UPLOAD_SIZE_BYTES) {
            throw new BusinessException(ErrorCode.PAYLOAD_TOO_LARGE,
                    "Kích thước tệp vượt quá giới hạn tối đa 5 MB.");
        }

        try {
            byte[] originalBytes = file.getBytes();
            if (originalBytes.length > MAX_UPLOAD_SIZE_BYTES) {
                throw new BusinessException(ErrorCode.PAYLOAD_TOO_LARGE,
                        "Kích thước tệp vượt quá giới hạn tối đa 5 MB.");
            }
            validateMagicBytes(originalBytes);
            return storeDocumentBytes(originalBytes, file.getOriginalFilename(), documentType);
        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.error("Failed to store document in Vault: {}", e.getMessage(), e);
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể lưu trữ tài liệu an toàn: " + e.getMessage());
        }
    }

    /**
     * Validates magic bytes for PNG, JPEG, and PDF documents (6.5).
     */
    public static void validateMagicBytes(byte[] bytes) {
        if (bytes == null || bytes.length < 4) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Tệp tài liệu không hợp lệ hoặc kích thước quá nhỏ.");
        }
        // PNG: 89 50 4E 47
        boolean isPng = (bytes[0] == (byte) 0x89 && bytes[1] == (byte) 0x50 && bytes[2] == (byte) 0x4E && bytes[3] == (byte) 0x47);
        // JPEG: FF D8 FF
        boolean isJpeg = (bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF);
        // PDF: 25 50 44 46 (%PDF)
        boolean isPdf = (bytes[0] == (byte) 0x25 && bytes[1] == (byte) 0x50 && bytes[2] == (byte) 0x44 && bytes[3] == (byte) 0x46);

        if (!isPng && !isJpeg && !isPdf) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                    "Định dạng tệp không được hỗ trợ. Hệ thống chỉ tiếp nhận tệp ảnh hợp lệ (PNG, JPEG) hoặc tài liệu PDF.");
        }
    }

    /**
     * Core processing from raw bytes: Validate Magic Bytes -> Watermark -> AES-GCM Encrypt -> MinIO Upload -> Redis Token.
     */
    @Transactional
    public VaultUploadResponse storeDocumentBytes(byte[] rawBytes, String originalFilename, String documentType) {
        if (rawBytes != null && rawBytes.length >= 4) {
            validateMagicBytes(rawBytes);
        }

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
            log.info("Stored one-time vault token in Redis for docCode={}, TTL={}h", docCode, tokenTtlHours);
        } catch (Exception e) {
            if (failClosed) {
                log.error("Redis unavailable while issuing one-time vault token (fail-closed): {}", e.getMessage());
                removeFromMinioBestEffort(objectName);
                throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE,
                        "Không thể khởi tạo mã truy cập một lần trên Redis. Từ chối lưu trữ để đảm bảo an toàn (Fail-Closed).");
            }
            log.warn("Redis unavailable to cache vault token (fail-open override active): {}", e.getMessage());
        }

        // 5. Persist Document Metadata in Database (store SHA-256 digest of token rather than plaintext token)
        VaultDocument document = VaultDocument.builder()
                .documentCode(docCode)
                .minioObjectPath(objectName)
                .encryptionAlgorithm(ALGORITHM)
                .watermarkContent("CHỈ DÙNG ĐỂ SƠ DUYỆT HỒ SƠ TẠI UBND")
                .oneTimeToken(sha256Hex(oneTimeToken))
                .isViewed(false)
                .expiresAt(expiresAt)
                .build();

        try {
            documentRepository.save(document);
        } catch (Exception e) {
            removeFromMinioBestEffort(objectName);
            try {
                stringRedisTemplate.delete(redisKey);
            } catch (Exception redisEx) {
                log.warn("Failed to rollback Redis token {} after DB error: {}", redisKey, redisEx.getMessage());
            }
            throw e;
        }
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
     * Consumes One-Time Token safely:
     * Verify token -> Download & Decrypt -> Mark viewed & Delete token ONLY AFTER SUCCESS.
     * Intermediate failures (MinIO outage, network drop, decryption error) preserve the token so the officer can retry.
     * Subsequent attempts after a successful view strictly throw HTTP 410 GONE.
     *
     * @param oneTimeToken single-use access token
     * @return decrypted, watermarked image bytes for viewing
     */
    @Transactional
    public byte[] consumeOneTimeDocument(String oneTimeToken) {
        if (oneTimeToken == null || oneTimeToken.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã token truy cập không hợp lệ.");
        }

        String cleanToken = oneTimeToken.trim();
        String redisKey = REDIS_TOKEN_PREFIX + cleanToken;
        String lockKey = REDIS_LOCK_PREFIX + cleanToken;

        boolean lockAcquired = false;
        try {
            Boolean acquired = stringRedisTemplate.opsForValue().setIfAbsent(lockKey, "1", VIEW_LOCK_TTL);
            if (Boolean.FALSE.equals(acquired)) {
                log.warn("Concurrent one-time view rejected by Redis lock for token {}",
                        vn.edu.uth.smartward.common.FilenameUtils.maskToken(cleanToken));
                throw new BusinessException(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED,
                        "Liên kết truy cập tài liệu đang được xử lý hoặc đã được sử dụng một lần.");
            }
            lockAcquired = Boolean.TRUE.equals(acquired);
        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.warn("Redis lock failure for vault token: {}", e.getMessage());
            if (failClosed) {
                throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE,
                        "Hệ thống kiểm soát token một lần (Redis) không khả dụng. Từ chối truy cập tài liệu (Fail-Closed).");
            }
        }

        try {
            // 1. Inspect Redis Token without prematurely destroying it
            String docCode = null;
            try {
                docCode = stringRedisTemplate.opsForValue().get(redisKey);
            } catch (Exception e) {
                log.warn("Redis read failure for vault token: {}", e.getMessage());
                if (failClosed) {
                    throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE,
                            "Hệ thống kiểm soát token một lần (Redis) không khả dụng. Từ chối truy cập tài liệu (Fail-Closed).");
                }
            }

            // If not in Redis, check DB record
            if (docCode == null || docCode.isBlank()) {
                Optional<VaultDocument> docOpt = documentRepository.findByOneTimeToken(sha256Hex(cleanToken));
                if (docOpt.isPresent()) {
                    VaultDocument doc = docOpt.get();
                    if (Boolean.TRUE.equals(doc.getIsViewed()) || doc.getExpiresAt().isBefore(OffsetDateTime.now())) {
                        log.warn("Access denied for token {}: already consumed or expired", oneTimeToken);
                        throw new BusinessException(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED,
                                "Liên kết truy cập tài liệu đã hết hạn hoặc đã được sử dụng một lần theo quy định bảo vệ dữ liệu cá nhân.");
                    }
                    docCode = doc.getDocumentCode();
                } else {
                    throw new BusinessException(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED,
                            "Liên kết truy cập không tồn tại hoặc đã bị hủy.");
                }
            }

            // 2. Fetch Document record from Database and verify status
            VaultDocument document = documentRepository.findByDocumentCode(docCode)
                    .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy hồ sơ tài liệu tương ứng."));

            if (Boolean.TRUE.equals(document.getIsViewed()) ||
                    (document.getExpiresAt() != null && document.getExpiresAt().isBefore(OffsetDateTime.now()))) {
                throw new BusinessException(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED,
                        "Liên kết truy cập tài liệu đã được sử dụng một lần theo quy định bảo vệ dữ liệu cá nhân.");
            }

            // 3. Download Ciphertext from MinIO (failures here must NOT burn the token)
            byte[] encryptedBytes = downloadFromMinio(document.getMinioObjectPath());

            // 4. Decrypt AES-256-GCM Ciphertext (failures here must NOT burn the token)
            byte[] decryptedBytes = decryptAesGcm(encryptedBytes);

            // 5. SUCCESS: Atomically mark viewed and delete token from Redis ONLY after download + decrypt succeed
            int updatedRows = documentRepository.markAsViewedAtomically(docCode);
            if (updatedRows == 0) {
                throw new BusinessException(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED,
                        "Liên kết truy cập tài liệu đã được sử dụng đồng thời bởi phiên khác.");
            }
            document.setIsViewed(true);

            try {
                stringRedisTemplate.delete(redisKey);
            } catch (Exception e) {
                log.warn("Failed to delete consumed token from Redis: {}", e.getMessage());
            }

            log.info("Successfully consumed one-time document [{}]. Token is now permanently dead.", docCode);
            return decryptedBytes;
        } finally {
            if (lockAcquired) {
                try {
                    stringRedisTemplate.delete(lockKey);
                } catch (Exception ex) {
                    log.warn("Failed to release vault lock: {}", ex.getMessage());
                }
            }
        }
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

    private void removeFromMinioBestEffort(String objectName) {
        if (minioClient == null || objectName == null || objectName.isBlank()) {
            return;
        }
        try {
            minioClient.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build()
            );
            log.info("Compensating delete removed orphan MinIO object: {}/{}", bucketName, objectName);
        } catch (Exception ex) {
            log.warn("Best-effort compensating MinIO delete failed for {}/{}: {}", bucketName, objectName, ex.getMessage());
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
        String effective = rawEncryptionKey.trim();
        byte[] keyBytes = effective.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "Khóa mã hóa VAULT_ENCRYPTION_KEY không đủ độ dài an toàn (yêu cầu tối thiểu 32 bytes cho AES-256-GCM).");
        }
        String lower = effective.toLowerCase();
        if (lower.contains("changeme") || lower.contains("devtest") || lower.contains("fallback")) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "VAULT_ENCRYPTION_KEY không được chứa từ khóa placeholder mẫu (ChangeMe, DevTest, Fallback).");
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

    public static String sha256Hex(String input) {
        if (input == null) return null;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}

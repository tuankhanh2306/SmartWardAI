package vn.edu.uth.smartward.triage;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.security.OfficerAuthService.OfficerPrincipal;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Field Incident Photo storage service (TASK-028):
 * - Validates Magic Bytes (JPEG, PNG, WebP), max 5 MB, max 4096x4096 px.
 * - Strips EXIF GPS/device metadata (ImageIO re-encode for JPEG/PNG; RIFF chunk filter for WebP).
 * - Stores under MinIO prefix incident-photos/<wardCode>/<photoKey>.
 * - Enforces SEC-09 ward isolation on officer viewing without burn-after-reading.
 */
@Slf4j
@Service
public class IncidentPhotoService {

    public static final long MAX_PHOTO_BYTES = 5L * 1024 * 1024;
    public static final int MAX_DIMENSION_PX = 4096;
    public static final String MINIO_PREFIX = "incident-photos/";
    private static final Pattern SAFE_WARD_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{2,50}$");
    private static final Pattern SAFE_KEY_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{2,50}__\\d{8}_[a-f0-9-]{36}\\.(jpg|png|webp)$");

    private final MinioClient minioClient;

    @Value("${smartward.vault.bucket-name:smartward-vault}")
    private String bucketName = "smartward-vault";

    @Autowired
    public IncidentPhotoService(@Autowired(required = false) MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    public record UploadedPhotoResult(String photoKey, String viewUrl, String contentType, long sizeBytes, boolean exifStripped) {}
    public record OfficerPhotoResource(byte[] bytes, String contentType, String photoKey) {}

    public UploadedPhotoResult uploadPhoto(MultipartFile file, String rawWardCode) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Tệp ảnh hiện trường không được để trống.");
        }
        if (file.getSize() > MAX_PHOTO_BYTES) {
            throw new BusinessException(ErrorCode.PAYLOAD_TOO_LARGE, "Kích thước ảnh vượt quá giới hạn tối đa 5 MB.");
        }
        try {
            return uploadPhotoBytes(file.getBytes(), rawWardCode);
        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            log.error("Failed to process incident photo upload: {}", e.getMessage());
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "Không thể xử lý ảnh hiện trường.");
        }
    }

    public UploadedPhotoResult uploadPhotoBytes(byte[] rawBytes, String rawWardCode) {
        if (rawBytes == null || rawBytes.length == 0) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Dữ liệu ảnh hiện trường không được để trống.");
        }
        if (rawBytes.length > MAX_PHOTO_BYTES) {
            throw new BusinessException(ErrorCode.PAYLOAD_TOO_LARGE, "Kích thước ảnh vượt quá giới hạn tối đa 5 MB.");
        }

        String wardCode = normalizeWardCode(rawWardCode);
        String format = detectSupportedFormat(rawBytes);
        byte[] sanitizedBytes;
        String contentType;
        String ext;

        if ("webp".equals(format)) {
            sanitizedBytes = sanitizeWebp(rawBytes);
            contentType = "image/webp";
            ext = "webp";
        } else {
            sanitizedBytes = sanitizeViaImageIo(rawBytes, format);
            contentType = "png".equals(format) ? "image/png" : "image/jpeg";
            ext = "png".equals(format) ? "png" : "jpg";
        }

        String datePart = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        String photoKey = wardCode + "__" + datePart + "_" + UUID.randomUUID() + "." + ext;
        String objectName = MINIO_PREFIX + wardCode + "/" + photoKey;

        storeInMinio(objectName, sanitizedBytes, contentType);
        return new UploadedPhotoResult(
                photoKey,
                "/api/v1/issues/officer/photos/" + photoKey,
                contentType,
                sanitizedBytes.length,
                true
        );
    }

    public OfficerPhotoResource loadPhotoForOfficer(String photoKey, OfficerPrincipal principal) {
        if (principal == null || principal.badgeId() == null || principal.badgeId().isBlank()) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "Yêu cầu xác thực cán bộ.");
        }
        if (!"OFFICER".equalsIgnoreCase(principal.role())) {
            throw new BusinessException(ErrorCode.FORBIDDEN, "Chỉ cán bộ cấp xã (ROLE_OFFICER) được xem ảnh hiện trường sự cố.");
        }
        String cleanKey = validatePhotoKey(photoKey);
        String photoWardCode = extractWardCodeFromKey(cleanKey);

        // SEC-09: Strict ward isolation
        if (principal.wardCode() == null || !principal.wardCode().trim().equalsIgnoreCase(photoWardCode)) {
            log.warn("SEC-09: Officer '{}' of ward '{}' blocked from viewing incident photo '{}' belonging to '{}'",
                    principal.badgeId(), principal.wardCode(), cleanKey, photoWardCode);
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "SEC-09: Cán bộ thuộc đơn vị " + principal.wardCode() + " không có quyền xem ảnh sự cố của đơn vị " + photoWardCode + ".");
        }

        String objectName = MINIO_PREFIX + photoWardCode + "/" + cleanKey;
        byte[] bytes = readFromMinio(objectName);
        String contentType = cleanKey.endsWith(".png") ? "image/png"
                : cleanKey.endsWith(".webp") ? "image/webp"
                : "image/jpeg";
        return new OfficerPhotoResource(bytes, contentType, cleanKey);
    }

    public static String validatePhotoKey(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã ảnh sự cố không hợp lệ.");
        }
        String trimmed = rawKey.trim();
        if (!SAFE_KEY_PATTERN.matcher(trimmed).matches()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã ảnh sự cố không đúng định dạng an toàn.");
        }
        return trimmed;
    }

    public static boolean isValidPhotoKey(String rawKey) {
        return rawKey != null && SAFE_KEY_PATTERN.matcher(rawKey.trim()).matches();
    }

    public static String extractWardCodeFromKey(String validPhotoKey) {
        int sep = validPhotoKey.indexOf("__");
        if (sep <= 0) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã ảnh thiếu định danh xã/phường.");
        }
        return validPhotoKey.substring(0, sep);
    }

    private String normalizeWardCode(String rawWardCode) {
        String candidate = (rawWardCode == null || rawWardCode.isBlank()) ? "AG_P_LONGXUYEN" : rawWardCode.trim().toUpperCase(Locale.ROOT);
        if (!SAFE_WARD_PATTERN.matcher(candidate).matches()) {
            throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Mã xã/phường đính kèm ảnh không hợp lệ.");
        }
        return candidate;
    }

    /**
     * Strict Magic-Byte inspection: JPEG (FF D8 FF), PNG (89 50 4E 47), WebP (RIFF....WEBP).
     */
    static String detectSupportedFormat(byte[] bytes) {
        if (bytes.length >= 3
                && bytes[0] == (byte) 0xFF && bytes[1] == (byte) 0xD8 && bytes[2] == (byte) 0xFF) {
            return "jpg";
        }
        if (bytes.length >= 4
                && bytes[0] == (byte) 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47) {
            return "png";
        }
        if (bytes.length >= 12
                && bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F'
                && bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') {
            return "webp";
        }
        throw new BusinessException(ErrorCode.UNSUPPORTED_MEDIA_TYPE,
                "Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh thật JPEG, PNG hoặc WebP.");
    }

    private byte[] sanitizeViaImageIo(byte[] rawBytes, String format) {
        try {
            BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(rawBytes));
            if (decoded == null) {
                throw new BusinessException(ErrorCode.UNSUPPORTED_MEDIA_TYPE, "Không thể đọc dữ liệu hình ảnh hợp lệ.");
            }
            if (decoded.getWidth() > MAX_DIMENSION_PX || decoded.getHeight() > MAX_DIMENSION_PX) {
                throw new BusinessException(ErrorCode.VALIDATION_FAILED,
                        "Độ phân giải ảnh vượt quá giới hạn tối đa 4096x4096px.");
            }
            // Re-draw onto a fresh BufferedImage to guarantee 100% EXIF/GPS/device metadata removal
            int targetType = "png".equals(format) ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
            BufferedImage clean = new BufferedImage(decoded.getWidth(), decoded.getHeight(), targetType);
            Graphics2D g = clean.createGraphics();
            try {
                if (targetType == BufferedImage.TYPE_INT_RGB) {
                    g.setColor(Color.WHITE);
                    g.fillRect(0, 0, clean.getWidth(), clean.getHeight());
                }
                g.drawImage(decoded, 0, 0, null);
            } finally {
                g.dispose();
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            String writerFormat = "png".equals(format) ? "png" : "jpg";
            if (!ImageIO.write(clean, writerFormat, out)) {
                throw new IllegalStateException("No ImageIO writer for " + writerFormat);
            }
            return out.toByteArray();
        } catch (BusinessException be) {
            throw be;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.UNSUPPORTED_MEDIA_TYPE, "Tệp ảnh bị hỏng hoặc không hợp lệ.");
        }
    }

    /**
     * Validates WebP dimensions (<= 4096x4096) and strips EXIF/XMP RIFF metadata chunks without external native libs.
     */
    static byte[] sanitizeWebp(byte[] rawBytes) {
        if (rawBytes.length < 20) {
            throw new BusinessException(ErrorCode.UNSUPPORTED_MEDIA_TYPE, "Tệp WebP không hợp lệ.");
        }
        ByteArrayOutputStream chunksOut = new ByteArrayOutputStream();
        int offset = 12;
        boolean sawImageChunk = false;

        while (offset + 8 <= rawBytes.length) {
            String fourCC = new String(rawBytes, offset, 4, StandardCharsets.US_ASCII);
            int chunkSize = (rawBytes[offset + 4] & 0xFF)
                    | ((rawBytes[offset + 5] & 0xFF) << 8)
                    | ((rawBytes[offset + 6] & 0xFF) << 16)
                    | ((rawBytes[offset + 7] & 0xFF) << 24);
            if (chunkSize < 0 || offset + 8L + chunkSize > rawBytes.length) {
                throw new BusinessException(ErrorCode.UNSUPPORTED_MEDIA_TYPE, "Cấu trúc tệp WebP bị lỗi.");
            }
            int paddedSize = chunkSize + (chunkSize & 1);
            int dataStart = offset + 8;

            if ("VP8X".equals(fourCC) && chunkSize >= 10) {
                int w = 1 + ((rawBytes[dataStart + 4] & 0xFF) | ((rawBytes[dataStart + 5] & 0xFF) << 8) | ((rawBytes[dataStart + 6] & 0xFF) << 16));
                int h = 1 + ((rawBytes[dataStart + 7] & 0xFF) | ((rawBytes[dataStart + 8] & 0xFF) << 8) | ((rawBytes[dataStart + 9] & 0xFF) << 16));
                if (w > MAX_DIMENSION_PX || h > MAX_DIMENSION_PX) {
                    throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Độ phân giải WebP vượt quá 4096x4096px.");
                }
                // Clear EXIF (bit 3) and XMP (bit 2) flags in VP8X header byte
                byte[] copy = new byte[8 + paddedSize];
                System.arraycopy(rawBytes, offset, copy, 0, Math.min(copy.length, rawBytes.length - offset));
                copy[8] = (byte) (copy[8] & ~0x0C);
                chunksOut.write(copy, 0, copy.length);
            } else if ("VP8 ".equals(fourCC) && chunkSize >= 10) {
                sawImageChunk = true;
                int w = ((rawBytes[dataStart + 6] & 0xFF) | ((rawBytes[dataStart + 7] & 0xFF) << 8)) & 0x3FFF;
                int h = ((rawBytes[dataStart + 8] & 0xFF) | ((rawBytes[dataStart + 9] & 0xFF) << 8)) & 0x3FFF;
                if (w > MAX_DIMENSION_PX || h > MAX_DIMENSION_PX) {
                    throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Độ phân giải WebP vượt quá 4096x4096px.");
                }
                chunksOut.write(rawBytes, offset, Math.min(8 + paddedSize, rawBytes.length - offset));
            } else if ("VP8L".equals(fourCC) && chunkSize >= 5) {
                sawImageChunk = true;
                int b0 = rawBytes[dataStart + 1] & 0xFF;
                int b1 = rawBytes[dataStart + 2] & 0xFF;
                int b2 = rawBytes[dataStart + 3] & 0xFF;
                int b3 = rawBytes[dataStart + 4] & 0xFF;
                int w = 1 + (b0 | ((b1 & 0x3F) << 8));
                int h = 1 + (((b1 & 0xC0) >> 6) | (b2 << 2) | ((b3 & 0x0F) << 10));
                if (w > MAX_DIMENSION_PX || h > MAX_DIMENSION_PX) {
                    throw new BusinessException(ErrorCode.VALIDATION_FAILED, "Độ phân giải WebP vượt quá 4096x4096px.");
                }
                chunksOut.write(rawBytes, offset, Math.min(8 + paddedSize, rawBytes.length - offset));
            } else if ("EXIF".equals(fourCC) || "XMP ".equals(fourCC)) {
                // Drop EXIF and XMP chunks completely
            } else {
                chunksOut.write(rawBytes, offset, Math.min(8 + paddedSize, rawBytes.length - offset));
            }
            offset += 8 + paddedSize;
        }

        if (!sawImageChunk) {
            throw new BusinessException(ErrorCode.UNSUPPORTED_MEDIA_TYPE, "Tệp WebP không chứa dữ liệu ảnh hợp lệ.");
        }

        byte[] body = chunksOut.toByteArray();
        int riffSize = 4 + body.length;
        byte[] result = new byte[12 + body.length];
        result[0] = 'R'; result[1] = 'I'; result[2] = 'F'; result[3] = 'F';
        result[4] = (byte) (riffSize & 0xFF);
        result[5] = (byte) ((riffSize >> 8) & 0xFF);
        result[6] = (byte) ((riffSize >> 16) & 0xFF);
        result[7] = (byte) ((riffSize >> 24) & 0xFF);
        result[8] = 'W'; result[9] = 'E'; result[10] = 'B'; result[11] = 'P';
        System.arraycopy(body, 0, result, 12, body.length);
        return result;
    }

    private void storeInMinio(String objectName, byte[] bytes, String contentType) {
        if (minioClient == null) {
            throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE, "Kho lưu trữ ảnh MinIO chưa được cấu hình.");
        }
        try {
            boolean exists = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build());
            if (!exists) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());
            }
            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .stream(new ByteArrayInputStream(bytes), bytes.length, -1)
                            .contentType(contentType)
                            .build()
            );
        } catch (Exception e) {
            log.error("MinIO store incident photo failed: {}", e.getMessage());
            throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE, "Không thể lưu ảnh hiện trường lên MinIO.");
        }
    }

    private byte[] readFromMinio(String objectName) {
        if (minioClient == null) {
            throw new BusinessException(ErrorCode.STORAGE_UNAVAILABLE, "Kho lưu trữ ảnh MinIO chưa được cấu hình.");
        }
        try (InputStream is = minioClient.getObject(
                GetObjectArgs.builder().bucket(bucketName).object(objectName).build())) {
            return is.readAllBytes();
        } catch (Exception e) {
            log.warn("Incident photo not found in MinIO ({}): {}", objectName, e.getMessage());
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy ảnh hiện trường yêu cầu.");
        }
    }
}

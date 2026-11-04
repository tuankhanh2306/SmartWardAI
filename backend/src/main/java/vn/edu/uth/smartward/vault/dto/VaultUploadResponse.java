package vn.edu.uth.smartward.vault.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.time.OffsetDateTime;

/**
 * Response payload returned after securely watermarking, encrypting, and storing document in Vault.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Thông tin tài liệu đã mã hóa và liên kết truy cập 1 lần")
public class VaultUploadResponse {

    @Schema(description = "Mã định danh tài liệu trong kho", example = "DOC_20261104_123456_A1B2")
    private String documentCode;

    @Schema(description = "Mã token truy cập một lần (One-Time Access Token)", example = "OTT_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")
    private String oneTimeToken;

    @Schema(description = "Đường dẫn xem tài liệu một lần (Tự động hủy sau lần xem đầu tiên)", example = "/api/v1/vault/view/OTT_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d")
    private String viewUrl;

    @Schema(description = "Thời điểm hết hạn token (sau 24 giờ)")
    private OffsetDateTime expiresAt;

    @Schema(description = "Đã đóng dấu watermark chống lạm dụng hồ sơ hay chưa", example = "true")
    private boolean watermarkApplied;

    @Schema(description = "Thuật toán mã hóa đối xứng áp dụng", example = "AES/GCM/NoPadding (256-bit)")
    private String encryptionAlgorithm;

    @Schema(description = "Thông báo xác nhận bảo mật Nghị định 13/2023/NĐ-CP")
    private String message;
}

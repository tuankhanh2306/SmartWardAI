package vn.edu.uth.smartward.vault;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ClientIpResolver;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.common.RedisRateLimiter;
import vn.edu.uth.smartward.vault.dto.VaultUploadResponse;

/**
 * REST Controller for Zero-Trust Citizen Document Vault.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/vault")
@Tag(name = "Document Vault", description = "Kho Hồ sơ Không Tin Cậy (Zero-Trust Document Vault) - Áp dụng các biện pháp kỹ thuật bảo vệ dữ liệu cá nhân theo quy định pháp luật hiện hành")
public class VaultController {

    private final ZeroTrustVaultService vaultService;
    private final RedisRateLimiter rateLimiter;
    private final ClientIpResolver clientIpResolver;

    @Autowired
    public VaultController(ZeroTrustVaultService vaultService,
                           @Autowired(required = false) RedisRateLimiter rateLimiter,
                           @Autowired(required = false) ClientIpResolver clientIpResolver) {
        this.vaultService = vaultService;
        this.rateLimiter = rateLimiter;
        this.clientIpResolver = clientIpResolver != null ? clientIpResolver : new ClientIpResolver();
    }

    public VaultController(ZeroTrustVaultService vaultService) {
        this(vaultService, null, new ClientIpResolver());
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Tải lên tài liệu nhạy cảm vào kho Zero-Trust (Watermark + Mã hóa AES-256 + Token 1 lần)",
            description = "Tự động đóng dấu watermark chéo bằng Java2D, mã hóa đối xứng AES/GCM/NoPadding (256-bit), " +
                          "lưu vào MinIO và cấp One-Time Access Token trên Redis có hiệu lực 24 giờ."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Tải lên và mã hóa thành công",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Tệp tải lên rỗng hoặc không hợp lệ")
    })
    public ResponseEntity<ApiResponse<VaultUploadResponse>> uploadDocument(
            @Parameter(description = "Tệp hình ảnh tài liệu công dân (PNG/JPEG/PDF)", required = true)
            @RequestParam("file") MultipartFile file,

            @Parameter(description = "Loại tài liệu (ví dụ: CCCD_FRONT, CCCD_BACK, CT01_FORM)")
            @RequestParam(value = "documentType", defaultValue = "CIVIC_DOCUMENT") String documentType,
            @RequestHeader(value = "X-Upload-Session", required = false) String uploadSessionId,
            HttpServletRequest request) {

        long contentLength = request != null ? request.getContentLengthLong() : -1L;
        if (contentLength > ZeroTrustVaultService.MAX_UPLOAD_SIZE_BYTES + (64L * 1024L)) {
            throw new BusinessException(ErrorCode.PAYLOAD_TOO_LARGE,
                    "Dung lượng yêu cầu tải lên vượt quá giới hạn tối đa 5 MB.");
        }
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Tệp tài liệu tải lên không được để trống.");
        }
        if (file.getSize() > ZeroTrustVaultService.MAX_UPLOAD_SIZE_BYTES) {
            throw new BusinessException(ErrorCode.PAYLOAD_TOO_LARGE,
                    "Kích thước tệp vượt quá giới hạn tối đa 5 MB.");
        }

        if (rateLimiter != null) {
            String clientIp = clientIpResolver.resolve(request);
            if (!rateLimiter.allowVaultUpload(clientIp, uploadSessionId)) {
                throw new BusinessException(ErrorCode.RATE_LIMIT_EXCEEDED,
                        "Bạn đã vượt quá giới hạn tải lên tài liệu (tối đa 20 lần / 10 phút hoặc 10 tệp / phiên). Vui lòng thử lại sau.");
            }
        }

        log.info("Received document upload to Vault: filename='{}', type='{}', size={} bytes",
                vn.edu.uth.smartward.common.FilenameUtils.sanitizeFilename(file.getOriginalFilename()), documentType, file.getSize());

        VaultUploadResponse response = vaultService.storeDocument(file, documentType);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/view/{token}")
    @Operation(
            summary = "Xem tài liệu một lần duy nhất (One-Time View Link)",
            description = "Truy xuất tài liệu từ MinIO, giải mã AES-256 và chỉ xóa vĩnh viễn token khỏi Redis sau khi đọc và giải mã thành công. " +
                          "Lần truy cập thứ hai trở đi sẽ bị chặn và trả về HTTP 410 GONE nhằm hạn chế lưu trữ và ngăn ngừa tái sử dụng liên kết."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Truy xuất và giải mã thành công (Token bị hủy ngay lập tức)"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "410", description = "Token đã hết hạn hoặc đã bị tiêu thụ một lần trước đó")
    })
    public ResponseEntity<byte[]> viewDocumentOnce(
            @Parameter(description = "Mã token xem 1 lần (bắt đầu bằng OTT_)", required = true)
            @PathVariable("token") String token) {

        log.info("Requesting one-time view for token: {}", vn.edu.uth.smartward.common.FilenameUtils.maskToken(token));

        byte[] decryptedBytes = vaultService.consumeOneTimeDocument(token);

        MediaType mediaType = MediaType.IMAGE_PNG;
        String filename = "vault_document.png";

        if (decryptedBytes != null && decryptedBytes.length >= 4) {
            if (decryptedBytes[0] == 0x25 && decryptedBytes[1] == 0x50 
                    && decryptedBytes[2] == 0x44 && decryptedBytes[3] == 0x46) {
                mediaType = MediaType.APPLICATION_PDF;
                filename = "vault_document.pdf";
            } else if (decryptedBytes[0] == (byte) 0xFF && decryptedBytes[1] == (byte) 0xD8 
                    && decryptedBytes[2] == (byte) 0xFF) {
                mediaType = MediaType.IMAGE_JPEG;
                filename = "vault_document.jpg";
            }
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate, max-age=0")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .contentType(mediaType)
                .body(decryptedBytes);
    }
}

package vn.edu.uth.smartward.vault;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.vault.dto.VaultUploadResponse;

/**
 * REST Controller for Zero-Trust Citizen Document Vault.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/vault")
@RequiredArgsConstructor
@Tag(name = "Document Vault", description = "Kho Hồ sơ Không Tin Cậy (Zero-Trust Document Vault) Tuân thủ Nghị định 13/2023/NĐ-CP")
public class VaultController {

    private final ZeroTrustVaultService vaultService;

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
            @RequestParam(value = "documentType", defaultValue = "CIVIC_DOCUMENT") String documentType) {

        log.info("Received document upload to Vault: filename='{}', type='{}', size={} bytes",
                file.getOriginalFilename(), documentType, file.getSize());

        VaultUploadResponse response = vaultService.storeDocument(file, documentType);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/view/{token}")
    @Operation(
            summary = "Xem tài liệu một lần duy nhất (One-Time View Link)",
            description = "Truy xuất tài liệu từ MinIO, giải mã AES-256 và xóa vĩnh viễn token khỏi Redis bằng lệnh nguyên tử GETDEL. " +
                          "Lần truy cập thứ hai trở đi sẽ bị chặn và trả về HTTP 410 GONE theo quy chuẩn Nghị định 13/2023/NĐ-CP."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Truy xuất và giải mã thành công (Token bị hủy ngay lập tức)"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "410", description = "Token đã hết hạn hoặc đã bị tiêu thụ một lần trước đó")
    })
    public ResponseEntity<byte[]> viewDocumentOnce(
            @Parameter(description = "Mã token xem 1 lần (bắt đầu bằng OTT_)", required = true)
            @PathVariable("token") String token) {

        log.info("Requesting one-time view for token: {}", token);

        byte[] decryptedImageBytes = vaultService.consumeOneTimeDocument(token);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"vault_document.png\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate, max-age=0")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .contentType(MediaType.IMAGE_PNG)
                .body(decryptedImageBytes);
    }
}

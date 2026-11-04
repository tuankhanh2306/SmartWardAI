package vn.edu.uth.smartward.formcheck;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.formcheck.dto.FormPrecheckReport;

/**
 * REST Controller for Administrative Declaration Form Precheck.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/forms")
@RequiredArgsConstructor
@Tag(name = "Form Rule Engine", description = "Động cơ Quy tắc Tiền kiểm định Biểu mẫu Hành chính (Mẫu CT01, Giấy khai sinh, CCCD)")
public class FormCheckController {

    private final FormPrecheckService formPrecheckService;

    @PostMapping(value = "/precheck", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(
            summary = "Sơ duyệt tờ khai hành chính (Mẫu CT01 cư trú, CCCD, Hộ tịch)",
            description = "Tiếp nhận ảnh chụp tờ khai hành chính (ảnh in hoặc viết tay), trích xuất thông tin qua Vision OCR " +
                          "và thực thi bộ quy tắc định thức (CCCD 12 số, logic ngày tháng, trường bắt buộc, cảnh báo độ tin cậy thấp). " +
                          "Hệ thống chỉ cảnh báo lỗi để công dân sửa trên giấy trước khi nộp, bảo đảm tuân thủ Nghị định 13/2023/NĐ-CP."
    )
    @ApiResponses(value = {
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "200", description = "Kiểm định hoàn tất, trả về báo cáo chi tiết từng trường",
                    content = @Content(schema = @Schema(implementation = ApiResponse.class))),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "400", description = "Tệp hình ảnh rỗng hoặc không đúng định dạng"),
            @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "Dữ liệu kiểm định không hợp lệ")
    })
    public ResponseEntity<ApiResponse<FormPrecheckReport>> precheckForm(
            @Parameter(description = "Tệp hình ảnh chụp tờ khai (PNG/JPEG, tối đa 5MB)", required = true)
            @RequestParam("file") MultipartFile file,

            @Parameter(description = "Mã loại biểu mẫu hành chính (mặc định: CT01_RESIDENCE_DECLARATION)")
            @RequestParam(value = "formType", defaultValue = "CT01_RESIDENCE_DECLARATION") String formType) {

        log.info("Received form precheck request for formType: '{}', file: '{}' (size: {} bytes)",
                formType, file.getOriginalFilename(), file.getSize());

        FormPrecheckReport report = formPrecheckService.precheckForm(file, formType);
        return ResponseEntity.ok(ApiResponse.ok(report));
    }
}

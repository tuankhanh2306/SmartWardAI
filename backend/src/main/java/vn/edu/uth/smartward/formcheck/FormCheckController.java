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
import vn.edu.uth.smartward.formcheck.dto.FormSubmissionDto;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckRequest;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckResponse;

import java.util.List;

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

    @PostMapping(value = "/precheck", consumes = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Tiền kiểm định đa biểu mẫu hành chính cấp xã (Mẫu CT01, Khai sinh TK-KS, Kết hôn & Độc thân TK-KH, Bảo trợ xã hội TK-BTXH)",
            description = "Đối chiếu chéo thông tin Tờ khai khai sinh với Giấy chứng sinh, kiểm tra mốc tuổi kết hôn hợp pháp (Nam >= 20, Nữ >= 18), " +
                          "kiểm tra mục đích xác nhận tình trạng hôn nhân, và kiểm tra điều kiện 80 tuổi trợ cấp xã hội."
    )
    public ResponseEntity<StructuredFormPrecheckResponse> precheckStructuredForm(
            @RequestBody StructuredFormPrecheckRequest request) {
        log.info("Received structured form precheck request for formType: '{}', procedureCode: '{}'",
                request.getFormType(), request.getProcedureCode());
        StructuredFormPrecheckResponse response = formPrecheckService.precheckStructuredForm(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/submissions")
    @Operation(
            summary = "Lấy danh sách các bản khai sơ duyệt gần đây phục vụ cán bộ Một cửa",
            description = "Truy xuất danh sách hồ sơ sơ duyệt đa biểu mẫu (CT01, Khai sinh, Kết hôn, BTXH) phục vụ đối chiếu và kiểm tra chéo."
    )
    public ResponseEntity<ApiResponse<List<FormSubmissionDto>>> getRecentSubmissions(
            @RequestParam(value = "limit", defaultValue = "20") int limit) {
        List<FormSubmissionDto> submissions = formPrecheckService.getRecentSubmissions(limit);
        return ResponseEntity.ok(ApiResponse.ok(submissions));
    }
}

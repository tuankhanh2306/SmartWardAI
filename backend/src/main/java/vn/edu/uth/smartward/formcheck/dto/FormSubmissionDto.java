package vn.edu.uth.smartward.formcheck.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * Audit record of administrative form prechecks for ward officer review.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Bản ghi hồ sơ tiền kiểm định phục vụ cán bộ Một cửa")
public class FormSubmissionDto {

    @Schema(description = "ID bản ghi", example = "1")
    private Long id;

    @Schema(description = "Mã hồ sơ nộp sơ duyệt", example = "SUB_20261106_123456_A1B2")
    private String submissionCode;

    @Schema(description = "Mã biểu mẫu (CT01, TK-KS, TK-KH, TK-BTXH)", example = "CT01")
    private String formType;

    @Schema(description = "Đường dẫn file hoặc nguồn dữ liệu", example = "structured_input_ct01.json")
    private String filePath;

    @Schema(description = "Hồ sơ hợp lệ hay không", example = "true")
    private Boolean isValid;

    @Schema(description = "Điểm tin cậy OCR / Sơ duyệt", example = "0.990")
    private BigDecimal confidenceScore;

    @Schema(description = "Thời điểm nộp sơ duyệt")
    private OffsetDateTime submittedAt;

    @Schema(description = "Báo cáo chi tiết các trường lỗi hoặc cảnh báo")
    private String validationReport;
}

package vn.edu.uth.smartward.formcheck.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.List;

/**
 * Audit result report generated after executing Deterministic Rule Engine on submitted form.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Báo cáo tiền kiểm định biểu mẫu hành chính")
public class FormPrecheckReport {

    @Schema(description = "Mã phiên kiểm định biểu mẫu", example = "SUB_20261104_A1B2")
    private String submissionCode;

    @Schema(description = "Mẫu biểu khai báo (ví dụ: CT01_RESIDENCE_DECLARATION)", example = "CT01_RESIDENCE_DECLARATION")
    private String formType;

    @Schema(description = "Tờ khai có hợp lệ để nộp hay không", example = "true")
    private boolean valid;

    @Schema(description = "Điểm tin cậy OCR tổng thể (0.0 - 1.0)", example = "0.945")
    private double overallConfidence;

    @Schema(description = "Thông tin các trường đã trích xuất")
    private ExtractedFormFields extractedFields;

    @Schema(description = "Danh sách các lỗi sai và cảnh báo cần sửa trên giấy")
    private List<FormValidationIssue> issues;

    @Schema(description = "Tổng kết đánh giá hồ sơ")
    private String summaryMessage;

    @Schema(description = "Tuyên bố trách nhiệm và quy tắc bảo mật Nghị định 13/2023/NĐ-CP")
    private String disclaimer;
}

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

    @Schema(description = "Tuyên bố trách nhiệm và quy tắc bảo vệ dữ liệu cá nhân theo quy định pháp luật hiện hành")
    private String disclaimer;

    // TASK-057: Explicit OCR status, readability & document classification fields
    @Schema(description = "Trạng thái dịch vụ OCR (COMPLETED, UNAVAILABLE)")
    private String ocrStatus;

    @Schema(description = "Độ đọc được của ảnh (CLEAR, BLURRY, TOO_DARK, GLARE, CROPPED, UNREADABLE, NOT_EVALUATED)")
    private String readabilityStatus;

    @Schema(description = "Lý do đánh giá chất lượng/nhận diện ảnh")
    private String readabilityReason;

    @Schema(description = "Loại giấy tờ nhận diện thực tế (TK_KS, BIRTH_CERT, CT01, TK_KH, TK_BTXH, CCCD, OTHER_TEXT, NON_DOCUMENT, UNKNOWN)")
    private String detectedDocumentType;

    @Schema(description = "Xác nhận ảnh là mẫu giấy tờ chính thức còn trống (chỉ true khi nhận diện rõ mẫu nhưng chưa điền)")
    private Boolean isBlankTemplate;

    @Schema(description = "Số trường thông tin thực sự đọc được từ ảnh")
    private Integer matchedFieldCount;
}

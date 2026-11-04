package vn.edu.uth.smartward.formcheck.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

/**
 * Detailed validation issue found during form precheck.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Chi tiết lỗi hoặc cảnh báo tiền kiểm định biểu mẫu")
public class FormValidationIssue {

    @Schema(description = "Tên trường thông tin bị lỗi", example = "cccdNumber")
    private String field;

    @Schema(description = "Mã loại lỗi kiểm định", example = "INVALID_CCCD_LENGTH")
    private String errorType;

    @Schema(description = "Mô tả chi tiết và hướng dẫn sửa lỗi", example = "Số Căn cước công dân phải đủ 12 chữ số")
    private String message;

    @Schema(description = "Mức độ nghiêm trọng (ERROR hoặc WARNING)", example = "ERROR")
    @Builder.Default
    private String severity = "ERROR";
}

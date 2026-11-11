package vn.edu.uth.smartward.formcheck.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Chi tiết đối soát chéo từng trường dữ liệu giữa Tờ khai và Bản quét OCR")
public class FieldDiscrepancy {

    @Schema(description = "Mã định danh trường dữ liệu", example = "childDob")
    private String fieldKey;

    @Schema(description = "Tên hiển thị tiếng Việt của trường", example = "Ngày sinh của trẻ")
    private String fieldLabel;

    @Schema(description = "Giá trị do công dân tự kê khai trên tờ khai", example = "2026-11-01")
    private String declaredValue;

    @Schema(description = "Giá trị trích xuất từ bản quét OCR giấy tờ đính kèm", example = "2026-11-05")
    private String ocrValue;

    @Schema(description = "Trạng thái đối soát của trường", example = "CONFLICT")
    private CrossCheckStatus status;

    @Schema(description = "Mã lý do kỹ thuật nếu có sai lệch", example = "DATE_MISMATCH")
    private String reasonCode;

    @Schema(description = "Thông điệp giải thích chi tiết cho công dân và cán bộ", example = "Lệch ngày sinh: Tờ khai ghi 01/11/2026 nhưng Giấy chứng sinh ghi 05/11/2026.")
    private String explanation;
}

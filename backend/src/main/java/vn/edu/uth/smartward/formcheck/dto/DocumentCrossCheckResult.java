package vn.edu.uth.smartward.formcheck.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Kết quả đối soát chéo tài liệu đính kèm với dữ liệu tờ khai hành chính")
public class DocumentCrossCheckResult {

    @Schema(description = "Mã loại tài liệu đối soát (GIAY_CHUNG_SINH, GIAY_BAO_TU, SO_HO_NGHEO, GIAY_XAC_NHAN_KHUYET_TAT, GCN_QSD_DAT)", example = "GIAY_CHUNG_SINH")
    private String documentType;

    @Schema(description = "Tên hiển thị loại tài liệu", example = "Giấy chứng sinh (Cơ sở y tế cấp)")
    private String documentName;

    @Schema(description = "Trạng thái đối soát tổng thể của tài liệu (MATCH, WARNING, CONFLICT)", example = "CONFLICT")
    private CrossCheckStatus overallStatus;

    @Schema(description = "Độ tin cậy OCR trung bình toàn tài liệu (0.0 - 1.0)", example = "0.985")
    private Double confidenceScore;

    @Schema(description = "Danh sách chi tiết đối soát từng trường dữ liệu")
    private List<FieldDiscrepancy> discrepancies;

    @Schema(description = "Tổng kết đánh giá hồ sơ đối soát")
    private String summaryMessage;

    @Schema(description = "Cờ chỉ báo hồ sơ có bị chặn nộp hay không (true nếu overallStatus == CONFLICT)")
    private boolean blocking;
}

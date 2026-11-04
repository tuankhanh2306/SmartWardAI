package vn.edu.uth.smartward.formcheck.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

import java.util.Map;

/**
 * Structured fields extracted from declaration form via OCR.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Các trường thông tin trích xuất từ biểu mẫu qua OCR")
public class ExtractedFormFields {

    @Schema(description = "Họ và tên công dân", example = "NGUYỄN VĂN AN")
    private String fullName;

    @Schema(description = "Ngày tháng năm sinh (dd/MM/yyyy)", example = "15/08/1995")
    private String birthDate;

    @Schema(description = "Giới tính (Nam / Nữ)", example = "Nam")
    private String gender;

    @Schema(description = "Số định danh cá nhân / Số CCCD (12 chữ số)", example = "079095012345")
    private String cccdNumber;

    @Schema(description = "Ngày cấp CCCD (dd/MM/yyyy)", example = "20/09/2021")
    private String issueDate;

    @Schema(description = "Nơi cấp thẻ CCCD", example = "Cục Cảnh sát QLHC về TTXH")
    private String issuePlace;

    @Schema(description = "Nơi thường trú đăng ký", example = "Số 15 Võ Oanh, Phường 25, Quận Bình Thạnh, TP. Hồ Chí Minh")
    private String permanentAddress;

    @Schema(description = "Điểm tin cậy OCR trung bình toàn biểu mẫu", example = "0.945")
    private Double overallConfidence;

    @Schema(description = "Điểm tin cậy OCR chi tiết cho từng trường")
    private Map<String, Double> fieldConfidences;
}

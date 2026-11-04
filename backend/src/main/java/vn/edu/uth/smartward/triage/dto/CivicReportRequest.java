package vn.edu.uth.smartward.triage.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Citizen civic incident report payload with GPS location and text description.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu gửi phản ánh hiện trường cấp phường/xã")
public class CivicReportRequest {

    @NotBlank(message = "Danh mục sự cố không được để trống")
    @Schema(description = "Danh mục sự cố (ROAD_DAMAGE, FLOODING, GARBAGE, STREETLIGHT, ORDER_SECURITY)", example = "ROAD_DAMAGE")
    private String category;

    @NotBlank(message = "Mô tả chi tiết sự cố không được để trống")
    @Size(max = 2000, message = "Mô tả không được vượt quá 2000 ký tự")
    @Schema(description = "Mô tả chi tiết hiện trường sự cố của công dân", example = "Đoạn trước số 15 Võ Oanh có ổ gà khá sâu, trời mưa đọng nước rất dễ té ngã xe máy.")
    private String description;

    @NotNull(message = "Tọa độ vĩ độ (Latitude) không được để trống")
    @DecimalMin(value = "-90.0", message = "Vĩ độ không hợp lệ")
    @DecimalMax(value = "90.0", message = "Vĩ độ không hợp lệ")
    @Schema(description = "Tọa độ vĩ độ WGS84", example = "10.8035600")
    private BigDecimal latitude;

    @NotNull(message = "Tọa độ kinh độ (Longitude) không được để trống")
    @DecimalMin(value = "-180.0", message = "Kinh độ không hợp lệ")
    @DecimalMax(value = "180.0", message = "Kinh độ không hợp lệ")
    @Schema(description = "Tọa độ kinh độ WGS84", example = "106.7142160")
    private BigDecimal longitude;

    @Schema(description = "Đường dẫn hình ảnh chụp hiện trường (tùy chọn)", example = "https://minio.smartward.vn/photos/pothole.jpg")
    private String imageUrl;
}

package vn.edu.uth.smartward.formcheck.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Trạng thái đối soát chéo trường dữ liệu hoặc toàn bộ tài liệu")
public enum CrossCheckStatus {
    @Schema(description = "Trùng khớp hoàn toàn (100% khớp hoặc sau chuẩn hóa đồng nhất)")
    MATCH,

    @Schema(description = "Cảnh báo sai khác nhỏ (viết tắt chữ đệm, viết tắt địa giới, tách thửa đất, thiếu dấu mộc đỏ)")
    WARNING,

    @Schema(description = "Mâu thuẫn nghiêm trọng (sai ngày tháng, sai số CCCD, sai họ tên, sai số thửa, bất khả thi thời gian)")
    CONFLICT
}

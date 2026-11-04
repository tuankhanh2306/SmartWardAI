package vn.edu.uth.smartward.rag.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.*;

/**
 * Verified legal citation returned with the RAG answer.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Trích dẫn căn cứ pháp lý đã được hậu kiểm tra")
public class LegalCitationDto {

    @Schema(description = "Mã định danh đoạn trích dẫn", example = "KS-01-DK")
    private String chunkCode;

    @Schema(description = "Tên thủ tục hành chính", example = "Đăng ký khai sinh")
    private String procedureName;

    @Schema(description = "Mã thủ tục hành chính", example = "T-BTH-001")
    private String procedureCode;

    @Schema(description = "Tiêu đề đoạn quy định", example = "Điều kiện và hồ sơ yêu cầu")
    private String title;

    @Schema(description = "Căn cứ pháp lý chính thức", example = "Điều 15 Luật Hộ tịch 2014 & Nghị định 123/2015/NĐ-CP")
    private String legalReference;

    @Schema(description = "Nội dung trích đoạn tóm tắt", example = "Hồ sơ gồm Giấy chứng sinh (hoặc văn bản thay thế)...")
    private String excerpt;

    @Schema(description = "Điểm tương đồng Cosine Similarity với câu hỏi", example = "0.852")
    private double similarityScore;
}

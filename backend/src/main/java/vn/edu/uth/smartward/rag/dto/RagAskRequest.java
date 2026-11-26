package vn.edu.uth.smartward.rag.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.util.List;

/**
 * Request payload for citizen legal inquiry via RAG.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Schema(description = "Yêu cầu hỏi đáp thủ tục hành chính qua Legal RAG")
public class RagAskRequest {

    @JsonAlias({"query", "question"})
    @NotBlank(message = "Câu hỏi pháp lý không được để trống")
    @Size(max = 1000, message = "Câu hỏi không được vượt quá 1000 ký tự")
    @Schema(description = "Câu hỏi của công dân về thủ tục hành chính", example = "Tôi muốn làm khai sinh cho con mới sinh cần giấy tờ gì?")
    private String question;

    @jakarta.validation.constraints.Pattern(regexp = "^[A-Za-z0-9_-]{1,50}$", message = "Mã xã/phường không hợp lệ (tối đa 50 ký tự chữ và số)")
    @Schema(description = "Mã định danh xã/phường phục vụ cách ly ngữ cảnh và tra cứu địa chỉ Một cửa", example = "AG_P_LONGXUYEN")
    private String wardCode;

    @Size(max = 120, message = "Tên xã/phường không được vượt quá 120 ký tự")
    @Schema(description = "Tên Ủy ban nhân dân cấp Xã/Phường địa phương tiếp nhận", example = "Xã An Phú, Tỉnh An Giang")
    private String wardName;

    @Size(max = 300, message = "Địa chỉ trụ sở không được vượt quá 300 ký tự")
    @Schema(description = "Địa chỉ trụ sở Bộ phận Một cửa địa phương", example = "Đường Thoại Ngọc Hầu, Xã An Phú, Huyện An Phú, Tỉnh An Giang")
    private String officeAddress;

    @Size(max = 50, message = "Lĩnh vực thủ tục không được vượt quá 50 ký tự")
    @Schema(description = "Lĩnh vực thủ tục hành chính (tùy chọn: Hộ tịch, Cư trú, Đất đai...)", example = "Hộ tịch")
    private String category;

    @Min(value = 1, message = "topK tối thiểu là 1")
    @Max(value = 10, message = "topK tối đa là 10")
    @Schema(description = "Số đoạn trích dẫn tương đồng cao nhất cần truy xuất (bị bỏ qua ở production, chỉ override ở profile eval)", defaultValue = "3")
    @Builder.Default
    private Integer topK = 3;

    @Schema(description = "Ngưỡng chốt chặn từ chối trả lời theta (bị bỏ qua ở production, chỉ override ở profile eval)", defaultValue = "0.78")
    @Builder.Default
    private Double similarityThreshold = 0.78;

    @Size(max = 5, message = "Lịch sử hội thoại không được vượt quá 5 lượt")
    @jakarta.validation.Valid
    @Schema(description = "Lịch sử hội thoại tối đa 5 lượt gần nhất phục vụ trả lời câu hỏi nối tiếp")
    private List<ConversationTurnDto> history;

    @Size(max = 128, message = "Mã phiên không được vượt quá 128 ký tự")
    @Schema(description = "Mã phiên người dùng (tùy chọn) giúp phân tách hạn mức gọi API trên cùng đường truyền Wi-Fi tại UBND", example = "sess-kiosk-01")
    private String sessionId;
}

package vn.edu.uth.smartward.rag;

import lombok.extern.slf4j.Slf4j;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * Extracted from RagQueryService (TASK-019): Builds non-LLM deterministic responses for
 * greetings/small-talk, ambiguous consultation, 40-procedure catalog, and ward office hours.
 */
@Slf4j
final class RagConversationalResponseBuilder {

    private RagConversationalResponseBuilder() {}

    static RagAskResponse buildSmallTalkResponse(String rawQuery, String wardName, double threshold, long startTime) {
        String q = rawQuery.trim().toLowerCase().replaceAll("[!?.,;:]+$", "");
        String wardLabel = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã/phường";
        String answer;

        if (q.contains("hôm nay thế nào") || q.contains("khỏe không") || q.contains("thế nào rồi") || q.contains("ra sao")) {
            answer = String.format(
                    "Dạ chào bà con! Hôm nay tôi vẫn hoạt động bình thường 24/7 và luôn sẵn sàng hỗ trợ giải đáp mọi thủ tục hành chính công tại %s.\n\n" +
                    "Hôm nay bà con đang cần làm giấy tờ gì hoặc có vướng mắc về thủ tục nào (như khai sinh, kết hôn, cư trú CT01, chứng thực, xác nhận độc thân...) để tôi hướng dẫn cụ thể nhé!",
                    wardLabel
            );
        } else if (q.contains("cảm ơn") || q.contains("thanks") || q.contains("tuyệt vời") || q.contains("tốt lắm") || q.equals("ok") || q.equals("oke")) {
            answer = String.format(
                    "Dạ không có gì ạ! Rất vui được hỗ trợ bà con. Chúc bà con giải quyết công việc hành chính thật nhanh chóng và thuận lợi.\n\n" +
                    "Nếu cần tra cứu thêm thủ tục hoặc tiền kiểm tra biểu mẫu tại %s, bà con cứ nhắn lại tôi nhé!",
                    wardLabel
            );
        } else if (q.contains("tạm biệt") || q.contains("bye")) {
            answer = String.format(
                    "Tạm biệt bà con! Chúc bà con một ngày vui vẻ và làm việc hiệu quả.\n\n" +
                    "Bất cứ khi nào cần tra cứu thủ tục hành chính tại %s, bà con có thể quay lại trò chuyện cùng tôi bất cứ lúc nào!",
                    wardLabel
            );
        } else {
            answer = String.format(
                    "Xin chào! Tôi là Trợ lý Pháp lý Một Cửa tại %s.\n\n" +
                    "Tôi sẵn sàng hỗ trợ bà con tra cứu, giải đáp và hướng dẫn chuẩn bị hồ sơ cho các thủ tục hành chính cấp xã/phường như:\n" +
                    "• Đăng ký khai sinh, kết hôn, khai tử, trích lục hộ tịch\n" +
                    "• Đăng ký thường trú, tạm trú, thông tin cư trú (Mẫu CT01)\n" +
                    "• Chứng thực chữ ký, chứng thực bản sao từ bản chính\n" +
                    "• Cấp giấy xác nhận tình trạng hôn nhân (giấy độc thân)\n" +
                    "• Các chế độ chính sách bảo trợ xã hội và tiền kiểm tra hồ sơ\n\n" +
                    "Bà con đang cần tìm hiểu hoặc chuẩn bị làm thủ tục nào? Hãy nhập câu hỏi để tôi hướng dẫn chi tiết nhé!",
                    wardLabel
            );
        }

        return RagAskResponse.builder()
                .answer(answer)
                .abstained(false)
                .maxSimilarity(1.0)
                .appliedThreshold(threshold)
                .citations(Collections.emptyList())
                .cached(false)
                .suggestions(List.of("👶 Đăng ký khai sinh", "💍 Đăng ký kết hôn", "🏠 Đăng ký thường trú (CT01)", "📋 Xem 40 thủ tục"))
                .responseTimeMs(System.currentTimeMillis() - startTime)
                .disclaimer("Trợ lý Pháp lý Một Cửa SmartWard AI sẵn sàng phục vụ nhân dân.")
                .build();
    }

    static RagAskResponse buildAmbiguousConsultationResponse(String wardName, double threshold, long startTime) {
        String wardLabel = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã/phường";
        String answer = String.format(
                "Dạ được chứ ạ! Tôi là Trợ lý Pháp lý Một Cửa, luôn sẵn sàng hỗ trợ tư vấn các thủ tục hành chính công cho bà con tại %s.\n\n" +
                "Bà con vui lòng cho biết đang cần giải quyết công việc gì hoặc chọn nhanh một trong các lĩnh vực dưới đây để tôi hướng dẫn chi tiết hồ sơ, lệ phí và quy trình thực hiện nhé:\n" +
                "• 👶 Hộ tịch: Đăng ký khai sinh, kết hôn, trích lục, xác nhận độc thân\n" +
                "• 🏠 Cư trú: Đăng ký thường trú (Mẫu CT01), tạm trú, xác nhận CT07\n" +
                "• 📄 Chứng thực: Sao y bản sao, chứng thực chữ ký, hợp đồng giao dịch\n" +
                "• 🤝 Bảo trợ xã hội: Trợ cấp người cao tuổi, mai táng phí, người khuyết tật\n" +
                "• 🌾 Đất đai: Xác nhận hiện trạng, trích lục bản đồ địa chính",
                wardLabel
        );

        return RagAskResponse.builder()
                .answer(answer)
                .abstained(false)
                .maxSimilarity(1.0)
                .appliedThreshold(threshold)
                .citations(Collections.emptyList())
                .cached(false)
                .suggestions(List.of("👶 Đăng ký khai sinh", "💍 Đăng ký kết hôn", "🏠 Đăng ký thường trú (CT01)", "📄 Chứng thực sao y", "📋 Xem 40 thủ tục"))
                .responseTimeMs(System.currentTimeMillis() - startTime)
                .disclaimer("Trợ lý Pháp lý Một Cửa SmartWard AI sẵn sàng phục vụ nhân dân.")
                .build();
    }

    static RagAskResponse buildProcedureCatalogResponse(AdminProcedureRepository procedureRepository,
                                                        String wardName, double threshold, long startTime) {
        String wardLabel = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã/phường";

        List<AdminProcedure> procedures = Collections.emptyList();
        if (procedureRepository != null) {
            try {
                procedures = procedureRepository.findByStatus("ACTIVE");
                if (procedures.isEmpty()) {
                    procedures = procedureRepository.findAll();
                }
            } catch (Exception e) {
                log.warn("Could not query dynamic procedures from repository: {}", e.getMessage());
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Danh mục các thủ tục hành chính công trọng tâm cấp xã/phường được hỗ trợ tại %s gồm 4 nhóm chính:\n\n", wardLabel));

        if (!procedures.isEmpty()) {
            appendCategory(sb, "📋 1. LĨNH VỰC HỘ TỊCH & NHÂN THÂN:\n", procedures.stream()
                    .filter(p -> "Hộ tịch".equalsIgnoreCase(p.getCategory()) || "Cư trú".equalsIgnoreCase(p.getCategory())).toList());
            appendCategory(sb, "\n📑 2. LĨNH VỰC CHỨNG THỰC GIẤY TỜ & CHỮ KÝ:\n", procedures.stream()
                    .filter(p -> "Chứng thực".equalsIgnoreCase(p.getCategory())).toList());
            appendCategory(sb, "\n🌾 3. LĨNH VỰC ĐẤT ĐAI & MÔI TRƯỜNG:\n", procedures.stream()
                    .filter(p -> "Đất đai và Môi trường".equalsIgnoreCase(p.getCategory())
                            || "Địa chính".equalsIgnoreCase(p.getCategory())
                            || "Xây dựng".equalsIgnoreCase(p.getCategory())).toList());
            appendCategory(sb, "\n🤝 4. LĨNH VỰC BẢO TRỢ XÃ HỘI & NGƯỜI CÓ CÔNG:\n", procedures.stream()
                    .filter(p -> "Bảo trợ xã hội".equalsIgnoreCase(p.getCategory())
                            || "Bảo trợ xã hội và Người có công".equalsIgnoreCase(p.getCategory())).toList());
        } else {
            appendStaticFallbackCatalog(sb);
        }

        sb.append("\n👉 Bà con đang cần làm thủ tục nào? Hãy gõ câu hỏi hoặc tên thủ tục (ví dụ: \"khai sinh cần giấy tờ gì\", \"kết hôn mất bao lâu\", \"hướng dẫn điền CT01\") để tôi hướng dẫn chi tiết từng bước nhé!");

        return RagAskResponse.builder()
                .answer(sb.toString())
                .abstained(false)
                .maxSimilarity(1.0)
                .appliedThreshold(threshold)
                .citations(Collections.emptyList())
                .cached(false)
                .suggestions(List.of("👶 Đăng ký khai sinh", "💍 Đăng ký kết hôn", "🏠 Đăng ký thường trú (CT01)", "📄 Chứng thực sao y", "🤝 Trợ cấp bảo trợ xã hội"))
                .responseTimeMs(System.currentTimeMillis() - startTime)
                .disclaimer("Danh mục 40 TTHC cấp xã chuẩn hóa theo bộ dữ liệu hành chính địa phương.")
                .build();
    }

    static RagAskResponse buildWardOfficeResponse(String wardName, String officeAddress, double threshold, long startTime) {
        String wardLabel = (wardName != null && !wardName.isBlank()) ? wardName : "UBND cấp xã/phường";
        String addrLabel = (officeAddress != null && !officeAddress.isBlank()) ? officeAddress : "Trụ sở Bộ phận Tiếp nhận và Trả kết quả";
        String answer = String.format(
                "Thông tin liên hệ và thời gian làm việc của Bộ phận Tiếp nhận và Trả kết quả (Một Cửa) thuộc %s:\n\n" +
                "• Trụ sở / Địa chỉ Một cửa: %s\n" +
                "• Giờ tiếp nhận và trả kết quả: Sáng từ 07:30 – 11:30 | Chiều từ 13:30 – 17:00 (Thứ 2 đến Thứ 6; Thứ 7 làm việc buổi sáng).\n" +
                "• Cổng Dịch vụ công Quốc gia: Nộp hồ sơ trực tuyến 24/7 tại dichvucong.gov.vn\n\n" +
                "Bà con có thể đến trực tiếp trong khung giờ làm việc trên hoặc gửi câu hỏi về thủ tục hành chính để tôi hướng dẫn chuẩn bị đầy đủ hồ sơ trước khi đến nộp.",
                wardLabel, addrLabel
        );

        return RagAskResponse.builder()
                .answer(answer)
                .abstained(false)
                .maxSimilarity(1.0)
                .appliedThreshold(threshold)
                .citations(Collections.emptyList())
                .cached(false)
                .suggestions(List.of("📋 Xem 40 thủ tục", "👶 Đăng ký khai sinh", "💍 Đăng ký kết hôn", "🏠 Đăng ký thường trú (CT01)"))
                .responseTimeMs(System.currentTimeMillis() - startTime)
                .disclaimer("Thông tin chính thức từ Danh bạ hành chính UBND cấp xã/phường.")
                .build();
    }

    private static void appendCategory(StringBuilder sb, String heading, List<AdminProcedure> items) {
        sb.append(heading);
        items.stream()
                .sorted(Comparator.comparing(AdminProcedure::getProcedureCode))
                .forEach(p -> sb.append(String.format("• [%s] %s\n", p.getProcedureCode(), p.getProcedureName())));
    }

    private static void appendStaticFallbackCatalog(StringBuilder sb) {
        sb.append("📋 1. LĨNH VỰC HỘ TỊCH & NHÂN THÂN:\n")
          .append("• [TTHC-HT-01] Đăng ký khai sinh\n")
          .append("• [TTHC-HT-02] Đăng ký kết hôn\n")
          .append("• [TTHC-HT-03] Đăng ký khai tử có yếu tố nước ngoài tại khu vực biên giới\n")
          .append("• [TTHC-HT-04] Cấp bản sao Trích lục hộ tịch, bản sao Giấy khai sinh\n")
          .append("• [TTHC-HT-05] Đăng ký nhận cha, mẹ, con có yếu tố nước ngoài\n")
          .append("• [TTHC-HT-06] Đăng ký giám hộ\n")
          .append("• [TTHC-HT-11] Cấp Giấy xác nhận tình trạng hôn nhân\n")
          .append("• [TTHC-HT-13] Đăng ký khai tử (trong nước)\n")
          .append("• [TTHC-CR-01] Đăng ký thường trú\n")
          .append("• [TTHC-CR-02] Liên thông điện tử: Khai tử, xóa thường trú, mai táng phí\n")
          .append("• [TTHC-CR-03] Đăng ký tạm trú\n")
          .append("• [TTHC-CR-08] Xác nhận thông tin về cư trú (CT07)\n")
          .append("• [TTHC-CR-10] Xác nhận thông tin hộ tịch\n\n")
          .append("📑 2. LĨNH VỰC CHỨNG THỰC GIẤY TỜ & CHỮ KÝ:\n")
          .append("• [TTHC-CT-01] Chứng thực bản sao từ bản chính\n")
          .append("• [TTHC-CT-02] Chứng thực chữ ký trong các giấy tờ, văn bản\n")
          .append("• [TTHC-CT-04] Chứng thực văn bản phân chia di sản\n")
          .append("• [TTHC-CT-07] Chứng thực văn bản từ chối nhận di sản\n")
          .append("• [TTHC-CT-08] Chứng thực di chúc\n\n")
          .append("🌾 3. LĨNH VỰC ĐẤT ĐAI & MÔI TRƯỜNG:\n")
          .append("• [TTHC-DC-01] Đăng ký biến động quyền sử dụng đất\n")
          .append("• [TTHC-DC-02] Đăng ký đất đai, cấp GCN QSDĐ lần đầu\n")
          .append("• [TTHC-XD-01] Đăng ký biến động quyền sử dụng đất, tài sản gắn liền với đất\n")
          .append("• [TTHC-XD-02] Cấp Giấy chứng nhận quyền sử dụng đất lần đầu cho tổ chức\n")
          .append("• [TTHC-MT-01] Đăng ký môi trường cấp xã\n\n")
          .append("🤝 4. LĨNH VỰC BẢO TRỢ XÃ HỘI & NGƯỜI CÓ CÔNG:\n")
          .append("• [TTHC-BT-01] Trợ cấp xã hội hằng tháng ở cộng đồng\n")
          .append("• [TTHC-BT-02] Hỗ trợ chi phí mai táng cho đối tượng bảo trợ xã hội\n")
          .append("• [TTHC-BT-03] Tiếp nhận đối tượng vào cơ sở trợ giúp xã hội\n")
          .append("• [TTHC-BT-04] Hỗ trợ chi phí mai táng đối với đối tượng trợ cấp hưu trí\n")
          .append("• [TTHC-BT-05] Hỗ trợ chi phí mai táng hàng tháng theo QĐ 124\n")
          .append("• [TTHC-NCC-01] Tiếp nhận hồ sơ giải quyết chế độ ưu đãi Người có công với cách mạng\n");
    }
}

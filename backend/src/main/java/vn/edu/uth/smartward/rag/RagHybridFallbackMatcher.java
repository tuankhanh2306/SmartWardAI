package vn.edu.uth.smartward.rag;

import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

/**
 * Extracted from RagQueryService (TASK-019): Keyword-to-procedure fallback retrieval
 * when cross-model embeddings or short colloquial queries score below threshold.
 */
@Slf4j
final class RagHybridFallbackMatcher {

    private RagHybridFallbackMatcher() {}

    record SimpleLegalChunkMatch(
            Long id,
            String chunkCode,
            String chunkType,
            String title,
            String content,
            String legalReference,
            String procedureCode,
            String procedureName,
            Double similarityScore
    ) implements LegalChunkMatch {
        @Override public Long getId() { return id; }
        @Override public String getChunkCode() { return chunkCode; }
        @Override public String getChunkType() { return chunkType; }
        @Override public String getTitle() { return title; }
        @Override public String getContent() { return content; }
        @Override public String getLegalReference() { return legalReference; }
        @Override public String getProcedureCode() { return procedureCode; }
        @Override public String getProcedureName() { return procedureName; }
        @Override public Double getSimilarityScore() { return similarityScore; }
    }

    static List<LegalChunkMatch> tryHybridProcedureKeywordMatch(String query,
                                                                AdminProcedureRepository procedureRepository,
                                                                LegalChunkRepository chunkRepository) {
        if (query == null || query.isBlank() || procedureRepository == null) {
            return Collections.emptyList();
        }
        String matchedCode = matchProcedureCode(query.toLowerCase());
        if (matchedCode == null) {
            return Collections.emptyList();
        }

        Optional<AdminProcedure> procOpt = procedureRepository.findByProcedureCode(matchedCode);
        if (procOpt.isEmpty() && "TTHC-HT-13".equals(matchedCode)) {
            procOpt = procedureRepository.findByProcedureCode("TTHC-HT-03");
        }
        if (procOpt.isEmpty()) {
            return Collections.emptyList();
        }

        AdminProcedure proc = procOpt.get();
        List<LegalChunk> chunks = chunkRepository.findByProcedureId(proc.getId());
        log.info("Hybrid Keyword Match: mapped query '{}' to procedure '{}' ({}) with {} database chunks",
                RagPromptAndCitationHelper.truncate(query, 40), proc.getProcedureName(), proc.getProcedureCode(), chunks.size());

        List<LegalChunkMatch> matches = new ArrayList<>();
        if (!chunks.isEmpty()) {
            for (LegalChunk c : chunks) {
                matches.add(new SimpleLegalChunkMatch(
                        c.getId(), c.getChunkCode(), c.getChunkType(), c.getTitle(),
                        c.getContent(), c.getLegalReference(),
                        proc.getProcedureCode(), proc.getProcedureName(), 0.92
                ));
            }
        } else {
            matches.add(new SimpleLegalChunkMatch(
                    proc.getId(),
                    proc.getProcedureCode() + "_CHUNK_001",
                    "OVERVIEW",
                    "Tổng quan " + proc.getProcedureName(),
                    "Thủ tục: " + proc.getProcedureName()
                            + ". Cơ quan giải quyết: " + (proc.getAgency() != null ? proc.getAgency() : "UBND cấp xã / phường")
                            + ". Thời hạn giải quyết: " + (proc.getProcessingTime() != null ? proc.getProcessingTime() : "Theo quy định")
                            + ". Lệ phí: " + (proc.getFee() != null ? proc.getFee() : "Miễn phí / theo quy định")
                            + ". Thực hiện tại Bộ phận Tiếp nhận và Trả kết quả (Một cửa).",
                    proc.getProcedureName(),
                    proc.getProcedureCode(),
                    proc.getProcedureName(),
                    0.92
            ));
        }
        return matches;
    }

    private static String matchProcedureCode(String lower) {
        if (lower.contains("khai sinh") || lower.contains("giấy khai sinh") || lower.contains("chứng sinh") || lower.contains("sinh con") || lower.contains("mới sinh")) {
            return "TTHC-HT-01";
        } else if (lower.contains("kết hôn") || lower.contains("đăng ký kết hôn") || lower.contains("hôn thú") || lower.contains("giá thú") || lower.contains("lấy vợ") || lower.contains("lấy chồng")) {
            return "TTHC-HT-02";
        } else if (lower.contains("khai tử") || lower.contains("giấy chứng tử") || lower.contains("báo tử") || lower.contains("người mất") || lower.contains("người chết")) {
            return "TTHC-HT-13";
        } else if (lower.contains("trích lục") || lower.contains("bản sao trích lục") || lower.contains("xin lại khai sinh") || lower.contains("xin lại kết hôn")) {
            return "TTHC-HT-04";
        } else if (lower.contains("độc thân") || lower.contains("tình trạng hôn nhân") || lower.contains("chưa kết hôn")) {
            return "TTHC-HT-11";
        } else if (lower.contains("chứng thực chữ ký") || lower.contains("lăn tay") || lower.contains("điểm chỉ")) {
            return "TTHC-CT-02";
        } else if (lower.contains("sao y") || lower.contains("chứng thực bản sao") || lower.contains("chứng giấy")) {
            return "TTHC-CT-01";
        } else if (lower.contains("mai táng") || lower.contains("tiền mai táng") || lower.contains("chi phí mai táng") || lower.contains("chết có trợ cấp")) {
            return "TTHC-BT-02";
        } else if (lower.contains("tiền già") || lower.contains("trợ cấp người cao tuổi") || lower.contains("trợ cấp xã hội") || lower.contains("bảo trợ xã hội")) {
            return "TTHC-BT-01";
        } else if (lower.contains("ct01") || lower.contains("thường trú") || lower.contains("nhập hộ khẩu") || lower.contains("nhập khẩu")) {
            return "TTHC-CR-01";
        } else if (lower.contains("tạm trú") || lower.contains("đăng ký tạm trú")) {
            return "TTHC-CR-03";
        } else if (lower.contains("lưu trú") || lower.contains("thông báo lưu trú")) {
            return "TTHC-CR-06";
        } else if (lower.contains("tạm vắng") || lower.contains("khai báo tạm vắng")) {
            return "TTHC-CR-07";
        } else if (lower.contains("biến động đất") || lower.contains("sang tên đất") || lower.contains("chuyển nhượng quyền sử dụng") || lower.contains("tặng cho đất")) {
            return "TTHC-DC-01";
        } else if (lower.contains("sổ đỏ") || lower.contains("cấp sổ") || lower.contains("đăng ký đất đai")) {
            return "TTHC-DC-02";
        } else if (lower.contains("giấy phép xây dựng") || lower.contains("xin phép xây nhà") || lower.contains("xây dựng nhà ở")) {
            return "TTHC-XD-01";
        }
        return null;
    }
}

package vn.edu.uth.smartward.rag;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
public class LegalChunkingService {

    /**
     * Splits administrative procedure documentation into structured, semantically isolated legal chunks.
     * Prevents RAG context dilution by maintaining discrete units (Overview, Steps, Requirements, Legal Basis).
     */
    public List<LegalChunk> chunkProcedure(AdminProcedure procedure, List<String> processSteps, List<String> requiredDocs, List<String> legalBases) {
        List<LegalChunk> chunks = new ArrayList<>();
        int chunkIdx = 0;

        // 1. Overview Chunk (Agency, Fees, Processing Duration)
        chunkIdx++;
        chunks.add(LegalChunk.builder()
                .procedure(procedure)
                .chunkCode(String.format("%s_CHK_%03d", procedure.getProcedureCode(), chunkIdx))
                .chunkType("OVERVIEW")
                .title("Tổng quan & Thẩm quyền giải quyết " + procedure.getProcedureName())
                .content(String.format("Thủ tục: %s. Cơ quan có thẩm quyền: %s. Thời hạn giải quyết: %s. Lệ phí: %s.",
                        procedure.getProcedureName(), procedure.getAgency(), procedure.getProcessingTime(), procedure.getFee()))
                .legalReference(procedure.getProcedureName())
                .status("ACTIVE")
                .build());

        // 2. Process Step Chunks
        if (processSteps != null) {
            for (int i = 0; i < processSteps.size(); i++) {
                chunkIdx++;
                chunks.add(LegalChunk.builder()
                        .procedure(procedure)
                        .chunkCode(String.format("%s_CHK_%03d", procedure.getProcedureCode(), chunkIdx))
                        .chunkType("PROCESS_STEP")
                        .title(String.format("Trình tự thực hiện %s - Bước %d", procedure.getProcedureName(), i + 1))
                        .content(processSteps.get(i))
                        .legalReference(procedure.getProcedureName() + " - Trình tự giải quyết")
                        .status("ACTIVE")
                        .build());
            }
        }

        // 3. Required Documents Chunk
        if (requiredDocs != null && !requiredDocs.isEmpty()) {
            chunkIdx++;
            StringBuilder docContent = new StringBuilder("Thành phần hồ sơ công dân cần chuẩn bị khi thực hiện thủ tục ")
                    .append(procedure.getProcedureName()).append(":\n");
            for (String doc : requiredDocs) {
                docContent.append("- ").append(doc).append("\n");
            }

            chunks.add(LegalChunk.builder()
                    .procedure(procedure)
                    .chunkCode(String.format("%s_CHK_%03d", procedure.getProcedureCode(), chunkIdx))
                    .chunkType("REQUIRED_DOCUMENTS")
                    .title("Thành phần hồ sơ " + procedure.getProcedureName())
                    .content(docContent.toString().trim())
                    .legalReference(procedure.getProcedureName() + " - Thành phần hồ sơ")
                    .status("ACTIVE")
                    .build());
        }

        // 4. Legal Basis Chunk
        if (legalBases != null && !legalBases.isEmpty()) {
            chunkIdx++;
            StringBuilder legalContent = new StringBuilder("Căn cứ pháp lý quy định thủ tục ")
                    .append(procedure.getProcedureName()).append(" bao gồm:\n");
            for (String lb : legalBases) {
                legalContent.append("- ").append(lb).append("\n");
            }

            chunks.add(LegalChunk.builder()
                    .procedure(procedure)
                    .chunkCode(String.format("%s_CHK_%03d", procedure.getProcedureCode(), chunkIdx))
                    .chunkType("LEGAL_BASIS")
                    .title("Căn cứ pháp lý " + procedure.getProcedureName())
                    .content(legalContent.toString().trim())
                    .legalReference("Văn bản quy phạm pháp luật")
                    .status("ACTIVE")
                    .build());
        }

        log.debug("Chunked procedure [{}] into {} discrete legal units.", procedure.getProcedureCode(), chunks.size());
        return chunks;
    }
}

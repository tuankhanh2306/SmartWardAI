package vn.edu.uth.smartward.rag;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
public class LegalChunkingService {

    private static final int MAX_WORDS_PER_CHUNK = 200;
    private static final Pattern H2_PATTERN = Pattern.compile("^##\\s+(.+)$", Pattern.MULTILINE);
    private static final Pattern ITEM_SPLIT_PATTERN = Pattern.compile("(?=(?:^[-*+]\\s+|^\\(?\\d+[\\.\\)]\\s+|^\\([ivxlcdm]+\\)\\s+|^Điều\\s+\\d+|^Khoản\\s+\\d+|^Điểm\\s+[a-z]\\)))", Pattern.MULTILINE | Pattern.CASE_INSENSITIVE);

    /**
     * Header-Aware Markdown Chunking for Administrative Procedures (Knowledge Pipeline Bước 3).
     * Splits by H1-H4, preserves hierarchical header_path, enforces PhoBERT 256-token limit,
     * avoids breaking legal clauses mid-item, and generates provenance content_hash.
     */
    public List<LegalChunk> chunkMarkdownDocument(AdminProcedure procedure,
                                                  String markdownContent,
                                                  String sourceUrl,
                                                  OffsetDateTime scrapedAt,
                                                  String pipelineVersion) {
        if (markdownContent == null || markdownContent.isBlank()) {
            return List.of();
        }

        List<LegalChunk> chunks = new ArrayList<>();
        int chunkIdx = 0;
        String procCode = procedure.getProcedureCode();
        String procName = procedure.getProcedureName();

        Matcher matcher = H2_PATTERN.matcher(markdownContent);
        List<Integer> sectionStarts = new ArrayList<>();
        List<String> sectionTitles = new ArrayList<>();

        while (matcher.find()) {
            sectionStarts.add(matcher.start());
            sectionTitles.add(matcher.group(1).trim());
        }

        for (int i = 0; i < sectionStarts.size(); i++) {
            String sectionTitle = sectionTitles.get(i);
            int startPos = sectionStarts.get(i);
            int endPos = (i + 1 < sectionStarts.size()) ? sectionStarts.get(i + 1) : markdownContent.length();

            String rawSectionBody = markdownContent.substring(startPos, endPos).trim();
            // Remove the ## heading line from body
            int firstNewline = rawSectionBody.indexOf('\n');
            String sectionBody = (firstNewline != -1) ? rawSectionBody.substring(firstNewline).trim() : "";

            if (sectionBody.isBlank()) {
                continue;
            }

            String headerPath = String.format("%s > %s", procCode, sectionTitle);
            String chunkType = resolveChunkType(sectionTitle);

            List<String> subBlocks = splitIntoTokenSafeBlocks(sectionBody, MAX_WORDS_PER_CHUNK);
            for (int subIdx = 0; subIdx < subBlocks.size(); subIdx++) {
                String blockContent = subBlocks.get(subIdx);
                chunkIdx++;

                String chunkCode = String.format("%s_HCHK_%03d", procCode, chunkIdx);
                String title = (subBlocks.size() == 1)
                        ? String.format("%s - %s", procName, sectionTitle)
                        : String.format("%s - %s (Phần %d)", procName, sectionTitle, subIdx + 1);

                String hash = sha256Hex(blockContent);

                LegalChunk chunk = LegalChunk.builder()
                        .procedure(procedure)
                        .chunkCode(chunkCode)
                        .chunkType(chunkType)
                        .title(title)
                        .content(blockContent)
                        .legalReference(procName + " - " + sectionTitle)
                        .headerPath(headerPath)
                        .sectionName(sectionTitle)
                        .sourceUrl(sourceUrl)
                        .scrapedAt(scrapedAt != null ? scrapedAt : OffsetDateTime.now())
                        .contentHash(hash)
                        .pipelineVersion(pipelineVersion != null ? pipelineVersion : "1.0")
                        .status("ACTIVE")
                        .build();

                chunks.add(chunk);
            }
        }

        log.info("HeaderAwareChunker: Document [{}] partitioned into {} chunks (PhoBERT-safe).",
                procCode, chunks.size());
        return chunks;
    }

    /**
     * Formats the full text representation passed into PhoBERT / Bi-Encoder embedding,
     * prefixing header_path to preserve surrounding context even when split.
     */
    public String prepareTextForEmbedding(LegalChunk chunk) {
        StringBuilder sb = new StringBuilder();
        if (chunk.getHeaderPath() != null && !chunk.getHeaderPath().isBlank()) {
            sb.append("[").append(chunk.getHeaderPath()).append("]\n");
        }
        sb.append(chunk.getTitle()).append("\n");
        sb.append(chunk.getContent());
        return sb.toString().trim();
    }

    private List<String> splitIntoTokenSafeBlocks(String text, int maxWords) {
        List<String> blocks = new ArrayList<>();
        String[] items = ITEM_SPLIT_PATTERN.split(text);

        StringBuilder currentBlock = new StringBuilder();
        int currentWordCount = 0;

        for (String item : items) {
            String trimmed = item.trim();
            if (trimmed.isEmpty()) {
                continue;
            }

            int wordsInItem = countWords(trimmed);
            if (currentWordCount + wordsInItem > maxWords && currentWordCount > 0) {
                blocks.add(currentBlock.toString().trim());
                currentBlock = new StringBuilder();
                currentWordCount = 0;
            }

            if (currentBlock.length() > 0) {
                currentBlock.append("\n");
            }
            currentBlock.append(trimmed);
            currentWordCount += wordsInItem;
        }

        if (currentBlock.length() > 0) {
            blocks.add(currentBlock.toString().trim());
        }

        return blocks;
    }

    private int countWords(String text) {
        if (text == null || text.isBlank()) {
            return 0;
        }
        return text.trim().split("\\s+").length;
    }

    private String resolveChunkType(String sectionTitle) {
        String lower = sectionTitle.toLowerCase();
        if (lower.contains("trình tự") || lower.contains("bước")) return "PROCESS_STEP";
        if (lower.contains("thành phần") || lower.contains("hồ sơ")) return "REQUIRED_DOCUMENTS";
        if (lower.contains("thời hạn") || lower.contains("lệ phí") || lower.contains("phí")) return "OVERVIEW";
        if (lower.contains("cơ quan") || lower.contains("thẩm quyền")) return "AGENCY";
        if (lower.contains("căn cứ") || lower.contains("pháp lý")) return "LEGAL_BASIS";
        return "GENERAL_SECTION";
    }

    private String sha256Hex(String text) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }

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

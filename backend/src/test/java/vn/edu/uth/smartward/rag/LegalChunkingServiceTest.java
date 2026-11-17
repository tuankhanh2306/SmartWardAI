package vn.edu.uth.smartward.rag;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class LegalChunkingServiceTest {

    private LegalChunkingService chunkingService;

    @BeforeEach
    void setUp() {
        chunkingService = new LegalChunkingService();
    }

    @Test
    void testChunkProcedure_shouldCreateExpectedChunkTypes() {
        AdminProcedure procedure = AdminProcedure.builder()
                .procedureCode("TTHC-HT-01")
                .procedureName("Thủ tục đăng ký khai sinh")
                .agency("Bộ Tư pháp")
                .processingTime("1 ngày làm việc")
                .fee("Miễn phí")
                .build();

        List<String> steps = List.of("Bước 1: Nộp hồ sơ trực tuyến", "Bước 2: Cán bộ thẩm tra");
        List<String> docs = List.of("Giấy chứng sinh", "Tờ khai theo mẫu");
        List<String> legal = List.of("Luật Hộ tịch 2014", "Nghị định 123/2015/NĐ-CP");

        List<LegalChunk> chunks = chunkingService.chunkProcedure(procedure, steps, docs, legal);

        assertNotNull(chunks);
        // 1 Overview + 2 Steps + 1 Required Docs + 1 Legal Basis = 5 chunks
        assertEquals(5, chunks.size());

        assertEquals("OVERVIEW", chunks.get(0).getChunkType());
        assertEquals("PROCESS_STEP", chunks.get(1).getChunkType());
        assertEquals("PROCESS_STEP", chunks.get(2).getChunkType());
        assertEquals("REQUIRED_DOCUMENTS", chunks.get(3).getChunkType());
        assertEquals("LEGAL_BASIS", chunks.get(4).getChunkType());

        assertTrue(chunks.get(3).getContent().contains("Giấy chứng sinh"));
        assertTrue(chunks.get(4).getContent().contains("Luật Hộ tịch 2014"));
    }

    @Test
    void testChunkMarkdownDocument_headerAwareAndProvenance() {
        AdminProcedure procedure = AdminProcedure.builder()
                .procedureCode("TTHC-CR-01")
                .procedureName("Thủ tục đăng ký thường trú")
                .build();

        String sampleMarkdown = """
                # Thủ tục đăng ký thường trú
                
                ## Trình tự thực hiện
                - Bước 1: Công dân nộp hồ sơ tại Công an cấp xã hoặc qua Cổng DVC.
                - Bước 2: Cán bộ tiếp nhận và đối soát thông tin cư trú trên CSDL Quốc gia về dân cư.
                
                ## Thành phần hồ sơ
                - Tờ khai thay đổi thông tin cư trú (Mẫu CT01).
                - Giấy tờ, tài liệu chứng minh chỗ ở hợp pháp.
                
                ## Thời hạn và lệ phí
                Thời hạn giải quyết: 07 ngày làm việc kể từ ngày nhận đủ hồ sơ hợp lệ.
                Lệ phí: 20.000 đồng khi nộp trực tiếp, 10.000 đồng khi nộp trực tuyến.
                
                ## Cơ quan thực hiện
                - Cơ quan có thẩm quyền: Công an cấp Xã/Phường.
                
                ## Căn cứ pháp lý
                - Luật Cư trú năm 2020.
                - Thông tư số 55/2021/TT-BCA của Bộ Công an.
                """;

        List<LegalChunk> chunks = chunkingService.chunkMarkdownDocument(
                procedure, sampleMarkdown, "https://dichvucong.gov.vn", null, "1.0");

        assertNotNull(chunks);
        assertEquals(5, chunks.size());

        for (LegalChunk chunk : chunks) {
            assertNotNull(chunk.getHeaderPath(), "HeaderPath must not be null");
            assertTrue(chunk.getHeaderPath().startsWith("TTHC-CR-01 > "));
            assertNotNull(chunk.getContentHash(), "ContentHash must not be null");
            assertEquals(64, chunk.getContentHash().length(), "ContentHash must be SHA-256 (64 hex chars)");
            assertEquals("https://dichvucong.gov.vn", chunk.getSourceUrl());
            assertEquals("1.0", chunk.getPipelineVersion());

            String embedText = chunkingService.prepareTextForEmbedding(chunk);
            assertTrue(embedText.startsWith("[TTHC-CR-01 > "));
        }
    }
}

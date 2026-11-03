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
}

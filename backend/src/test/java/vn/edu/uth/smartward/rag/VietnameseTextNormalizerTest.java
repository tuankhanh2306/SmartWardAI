package vn.edu.uth.smartward.rag;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class VietnameseTextNormalizerTest {

    @Test
    void testNormalize_telexAndDialectAndAbbreviation() {
        String input = "xinchao tui muon lam gks cho con mới sanh";
        String normalized = VietnameseTextNormalizer.normalize(input);

        assertTrue(normalized.contains("xin chào"), "Should normalize xinchao to xin chào");
        assertTrue(normalized.contains("tôi"), "Should normalize tui to tôi");
        assertTrue(normalized.contains("giấy khai sinh"), "Should expand gks to giấy khai sinh");
        assertTrue(normalized.contains("mới sinh"), "Should normalize mới sanh to mới sinh");
    }

    @Test
    void testNormalize_whitespaceAndEmpty() {
        assertEquals("", VietnameseTextNormalizer.normalize(null));
        assertEquals("", VietnameseTextNormalizer.normalize("   "));
        assertEquals("thủ tục hành chính", VietnameseTextNormalizer.normalize("  tthc   "));
    }

    @Test
    void testRemoveAccents() {
        assertEquals("Tieng Viet co dau", VietnameseTextNormalizer.removeAccents("Tiếng Việt có dấu"));
        assertEquals("Dong Thap", VietnameseTextNormalizer.removeAccents("Đồng Tháp"));
        assertEquals("", VietnameseTextNormalizer.removeAccents(null));
    }
}

package vn.edu.uth.smartward.formcheck;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.formcheck.dto.ExtractedFormFields;
import vn.edu.uth.smartward.formcheck.dto.FormPrecheckReport;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class FormPrecheckOcrClassificationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    private FormPrecheckService buildService(String rawOcrResponse) {
        AiModelClient stubAi = new AiModelClient() {
            @Override
            public float[] generateEmbedding(String text) {
                return new float[768];
            }

            @Override
            public String generateChatResponse(String systemPrompt, String userPrompt) {
                return "";
            }

            @Override
            public String performVisionOcr(byte[] imageBytes, String mimeType) {
                return rawOcrResponse;
            }
        };
        OcrExtractionClient ocrClient = new OcrExtractionClient(stubAi, objectMapper);
        return new FormPrecheckService(
                ocrClient,
                new MandatoryFieldValidator(),
                new CccdValidator(),
                new DateLogicValidator(),
                mock(FormSubmissionRepository.class),
                objectMapper
        );
    }

    @Test
    void returnsUnavailableAndZeroConfidenceWhenOcrServiceUnavailable() {
        FormPrecheckService service = buildService("""
                {
                  "ocrStatus": "UNAVAILABLE",
                  "readabilityStatus": "NOT_EVALUATED",
                  "readabilityReason": "Chưa cấu hình khóa Gemini API.",
                  "detectedDocumentType": "UNKNOWN",
                  "isBlankTemplate": false,
                  "overallConfidence": 0.0
                }
                """);

        FormPrecheckReport report = service.precheckFormBytes(new byte[]{1, 2, 3}, "image/jpeg", "doc.jpg", "TK-KS");
        assertFalse(report.isValid());
        assertEquals("UNAVAILABLE", report.getOcrStatus());
        assertEquals("NOT_EVALUATED", report.getReadabilityStatus());
        assertEquals("UNKNOWN", report.getDetectedDocumentType());
        assertEquals(0.0, report.getOverallConfidence());
        assertEquals(0, report.getMatchedFieldCount());
    }

    @Test
    void neverTreatsBookPageWithZeroFieldsAsBlankTemplate() {
        FormPrecheckService service = buildService("""
                {
                  "ocrStatus": "COMPLETED",
                  "readabilityStatus": "CLEAR",
                  "readabilityReason": "Trang sách văn bản thường.",
                  "detectedDocumentType": "OTHER_TEXT",
                  "isBlankTemplate": true,
                  "rawTextExcerpt": "Chương 1: Nhập môn trí tuệ nhân tạo",
                  "overallConfidence": 0.85
                }
                """);

        FormPrecheckReport report = service.precheckFormBytes(new byte[]{1, 2, 3}, "image/jpeg", "TK-KS.jpg", "TK-KS");
        assertEquals("OTHER_TEXT", report.getDetectedDocumentType());
        assertEquals(Boolean.FALSE, report.getIsBlankTemplate());
        assertEquals(0, report.getMatchedFieldCount());
    }

    @Test
    void neverTreatsBlurryOrFaintPhotoAsBlankTemplate() {
        FormPrecheckService service = buildService("""
                {
                  "ocrStatus": "COMPLETED",
                  "readabilityStatus": "BLURRY",
                  "readabilityReason": "Chữ mờ nhạt không đọc rõ.",
                  "detectedDocumentType": "TK_KS",
                  "isBlankTemplate": true,
                  "overallConfidence": 0.25
                }
                """);

        FormPrecheckReport report = service.precheckFormBytes(new byte[]{1, 2, 3}, "image/jpeg", "blur.jpg", "TK-KS");
        assertEquals("BLURRY", report.getReadabilityStatus());
        assertEquals(Boolean.FALSE, report.getIsBlankTemplate());
    }

    @Test
    void extractsBirthCertificateFieldsAndPreservesBlankFlagOnlyForClearOfficialForm() {
        FormPrecheckService certService = buildService("""
                {
                  "ocrStatus": "COMPLETED",
                  "readabilityStatus": "CLEAR",
                  "readabilityReason": "Giấy chứng sinh rõ nét có dấu đỏ.",
                  "detectedDocumentType": "BIRTH_CERT",
                  "isBlankTemplate": false,
                  "childFullName": "NGUYỄN MINH AN",
                  "childDob": "15-10-2026",
                  "childGender": "Nam",
                  "motherFullName": "TRẦN THỊ HOA",
                  "birthCertNumber": "GCS-2026-0099",
                  "hospitalName": "Bệnh viện Sản Nhi An Giang",
                  "hasRedSeal": true,
                  "overallConfidence": 0.94
                }
                """);

        FormPrecheckReport certReport = certService.precheckFormBytes(new byte[]{1, 2, 3}, "image/jpeg", "gcs.jpg", "TK-KS");
        assertEquals("BIRTH_CERT", certReport.getDetectedDocumentType());
        assertEquals(Boolean.FALSE, certReport.getIsBlankTemplate());
        assertTrue(certReport.getMatchedFieldCount() >= 5);
        ExtractedFormFields fields = certReport.getExtractedFields();
        assertEquals("NGUYỄN MINH AN", fields.getChildFullName());
        assertEquals("15-10-2026", fields.getChildDob());
        assertEquals("GCS-2026-0099", fields.getBirthCertNumber());
        assertEquals(Boolean.TRUE, fields.getHasRedSeal());

        FormPrecheckService blankService = buildService("""
                {
                  "ocrStatus": "COMPLETED",
                  "readabilityStatus": "CLEAR",
                  "readabilityReason": "Tờ khai đăng ký khai sinh còn trống.",
                  "detectedDocumentType": "TK_KS",
                  "isBlankTemplate": true,
                  "overallConfidence": 0.92
                }
                """);

        FormPrecheckReport blankReport = blankService.precheckFormBytes(new byte[]{1, 2, 3}, "image/jpeg", "blank.jpg", "TK-KS");
        assertEquals("TK_KS", blankReport.getDetectedDocumentType());
        assertEquals(Boolean.TRUE, blankReport.getIsBlankTemplate());
        assertEquals(0, blankReport.getMatchedFieldCount());
    }
}

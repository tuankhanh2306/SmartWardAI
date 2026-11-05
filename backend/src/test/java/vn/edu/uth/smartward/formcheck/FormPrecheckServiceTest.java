package vn.edu.uth.smartward.formcheck;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.uth.smartward.formcheck.dto.ExtractedFormFields;
import vn.edu.uth.smartward.formcheck.dto.FormPrecheckReport;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckRequest;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckResponse;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FormPrecheckServiceTest {

    @Mock
    private OcrExtractionClient ocrExtractionClient;

    @Mock
    private FormSubmissionRepository submissionRepository;

    private FormPrecheckService formPrecheckService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        formPrecheckService = new FormPrecheckService(
                ocrExtractionClient,
                new MandatoryFieldValidator(),
                new CccdValidator(),
                new DateLogicValidator(),
                submissionRepository,
                objectMapper
        );
    }

    @Test
    void testPrecheckFormBytes_validForm() {
        ExtractedFormFields mockFields = ExtractedFormFields.builder()
                .fullName("VÕ MAI HƯƠNG")
                .birthDate("13/07/1984")
                .gender("Nữ")
                .cccdNumber("048184451695")
                .issueDate("15/06/2018")
                .permanentAddress("Số 164 Võ Oanh, Phường 25, Bình Thạnh")
                .overallConfidence(0.96)
                .fieldConfidences(Map.of(
                        "fullName", 0.98,
                        "cccdNumber", 0.95
                ))
                .build();

        when(ocrExtractionClient.extractFields(any(), any())).thenReturn(mockFields);

        byte[] fakeBytes = new byte[]{1, 2, 3};
        FormPrecheckReport report = formPrecheckService.precheckFormBytes(fakeBytes, "image/png", "FORM_P001.png", "CT01");

        assertNotNull(report);
        assertTrue(report.isValid(), "Form P001 should be completely valid");
        assertEquals(0, report.getIssues().size());
        assertTrue(report.getSummaryMessage().contains("hợp lệ"));
        assertNotNull(report.getSubmissionCode());
        verify(submissionRepository).save(any(FormSubmission.class));
    }

    @Test
    void testPrecheckFormBytes_invalidForm_withMultipleErrors() {
        ExtractedFormFields mockFields = ExtractedFormFields.builder()
                .fullName("PHAN TIẾN DŨNG")
                .birthDate("10/02/1995")
                .gender("Nam")
                .cccdNumber("999095531586") // Invalid province 999
                .issueDate("15/06/2018")
                .permanentAddress("") // Missing address
                .overallConfidence(0.92)
                .build();

        when(ocrExtractionClient.extractFields(any(), any())).thenReturn(mockFields);

        byte[] fakeBytes = new byte[]{1, 2, 3};
        FormPrecheckReport report = formPrecheckService.precheckFormBytes(fakeBytes, "image/png", "FORM_P010.png", "CT01");

        assertNotNull(report);
        assertFalse(report.isValid(), "Form with invalid province and missing address must be invalid");
        assertTrue(report.getIssues().size() >= 2);
        assertTrue(report.getIssues().stream().anyMatch(i -> "INVALID_CCCD_PROVINCE".equals(i.getErrorType())));
        assertTrue(report.getIssues().stream().anyMatch(i -> "MISSING_MANDATORY_FIELD".equals(i.getErrorType())));
    }

    @Test
    void testPrecheckFormBytes_lowConfidence_shouldGenerateWarning() {
        ExtractedFormFields mockFields = ExtractedFormFields.builder()
                .fullName("NGUYỄN VĂN AN")
                .birthDate("15/08/1995")
                .gender("Nam")
                .cccdNumber("079095012345")
                .issueDate("20/09/2021")
                .permanentAddress("Số 15 Võ Oanh, Phường 25, Bình Thạnh")
                .overallConfidence(0.85)
                .fieldConfidences(Map.of(
                        "fullName", 0.95,
                        "permanentAddress", 0.62 // Below 0.70 threshold
                ))
                .build();

        when(ocrExtractionClient.extractFields(any(), any())).thenReturn(mockFields);

        byte[] fakeBytes = new byte[]{1, 2, 3};
        FormPrecheckReport report = formPrecheckService.precheckFormBytes(fakeBytes, "image/png", "test.png", "CT01");

        assertNotNull(report);
        assertTrue(report.isValid(), "Warnings do not invalidate the form by themselves");
        assertTrue(report.getIssues().stream().anyMatch(i ->
                "MANUAL_REVIEW_REQUIRED".equals(i.getErrorType()) && "WARNING".equals(i.getSeverity())));
    }

    @Test
    void testPrecheckStructuredForm_birthRegistration_shouldDetectMismatchAndUnmarriedFatherRule() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-HT-01")
                .formType("TK-KS")
                .fullName("TRẦN GIA BẢO")
                .dateOfBirth("2026-10-18")
                .gender("Nam")
                .citizenCccd("089195001234")
                .address("Phường Mỹ Xuyên, An Giang")
                .formData(Map.of(
                        "hospitalBirthDate", "2026-10-15",
                        "motherName", "LÊ THỊ MỸ LINH",
                        "hospitalMotherName", "LÊ THỊ MỸ LINH",
                        "fatherName", "TRẦN VĂN HÙNG",
                        "parentsMarried", "NO"
                ))
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertFalse(resp.isOverallValid(), "Must fail when birth date mismatches hospital cert and unmarried parents write father name");
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "BIRTH_CERT_DATE_MISMATCH".equals(f.getErrorCode())));
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "UNMARRIED_PARENTS_PATERNITY_REQUIRED".equals(f.getErrorCode())));
    }

    @Test
    void testPrecheckStructuredForm_marriageAndSingleStatus_shouldDetectUnderageAndVaguePurpose() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-HT-02")
                .formType("TK-KH")
                .fullName("NGUYỄN THỊ NGỌC TRÂM")
                .dateOfBirth("2010-05-10") // Under 18
                .gender("Nữ")
                .citizenCccd("089310004567")
                .address("Xã An Phú, An Giang")
                .formData(Map.of(
                        "partnerName", "PHẠM VĂN MINH",
                        "partnerDob", "2001-03-10",
                        "partnerGender", "Nam",
                        "maritalCertPurpose", "Bổ sung hồ sơ",
                        "previousMaritalStatus", "DIVORCED"
                ))
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertFalse(resp.isOverallValid());
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "UNDERAGE_MARRIAGE".equals(f.getErrorCode())));
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "VAGUE_MARITAL_PURPOSE".equals(f.getErrorCode())));
    }

    @Test
    void testPrecheckStructuredForm_socialProtection_shouldValidate80YearsAndBankAccount() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-BT-01")
                .formType("TK-BTXH")
                .fullName("LÊ VĂN BẢY")
                .dateOfBirth("1940-04-10") // > 80 years old
                .gender("Nam")
                .citizenCccd("089040001122")
                .address("Phường Châu Phú A, An Giang")
                .formData(Map.of(
                        "disabilityLevel", "NONE",
                        "bankAccount", "70110000889912 - VietinBank An Giang"
                ))
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertTrue(resp.isOverallValid(), "80+ citizen with valid 12-digit CCCD and bank account must pass");
    }
}

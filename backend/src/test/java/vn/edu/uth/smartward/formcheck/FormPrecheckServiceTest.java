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

    @Test
    void testPrecheckStructuredForm_socialProtection_shouldValidate75YearsUnderLuatBhxh2024() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-BT-01")
                .formType("TK-BTXH")
                .fullName("NGUYỄN THỊ NĂM")
                .dateOfBirth("1950-02-15") // 76 years old (>= 75 years old under Luật BHXH 2024)
                .gender("Nữ")
                .citizenCccd("089150005544")
                .address("Phường Mỹ Long, An Giang")
                .formData(Map.of(
                        "disabilityLevel", "NONE",
                        "bankAccount", "102800123456 - Vietcombank An Giang"
                ))
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertTrue(resp.isOverallValid(), "Citizen from 75 years old without pension qualifies under Luật BHXH 2024");
    }

    @Test
    void testPrecheckStructuredForm_residenceCt01_shouldValidatePhoneUnderCircular66() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-CR-01")
                .formType("CT01")
                .fullName("NGUYỄN MINH TUẤN KHANH")
                .dateOfBirth("2005-06-23")
                .gender("Nam")
                .citizenCccd("089205023490")
                .address("Số 18 Đường Trần Hưng Đạo, Phường Mỹ Bình, An Giang")
                .formData(Map.of(
                        "phoneNumber", "0918123456"
                ))
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertTrue(resp.isOverallValid(), "Valid CT01 form with valid phone number must pass");
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> f.getFieldName().contains("Số điện thoại liên hệ")));
    }

    @Test
    void testPrecheckStructuredForm_ct01_rentingWithoutHostInfo_shouldFail() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-CR-01")
                .formType("CT01")
                .fullName("NGUYỄN VĂN AN")
                .dateOfBirth("2000-01-01")
                .gender("Nam")
                .citizenCccd("089200001234")
                .address("Số 10 Đường Lý Thường Kiệt, Phường Mỹ Bình, An Giang")
                .hostRelation("Thuê nhà trọ")
                .phoneNumber("0912345678")
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertFalse(resp.isOverallValid(), "Renting without host info must fail");
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "MISSING_HOST_NAME".equals(f.getErrorCode())));
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "INVALID_HOST_CCCD".equals(f.getErrorCode())));
    }

    @Test
    void testPrecheckStructuredForm_ct01_rentingWithValidHostInfo_shouldPass() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-CR-01")
                .formType("CT01")
                .fullName("NGUYỄN VĂN AN")
                .dateOfBirth("2000-01-01")
                .gender("Nam")
                .citizenCccd("089200001234")
                .address("Số 10 Đường Lý Thường Kiệt, Phường Mỹ Bình, An Giang")
                .phoneNumber("0912345678")
                .hostRelation("Thuê nhà trọ")
                .hostName("LÊ HOÀNG NAM")
                .hostCccd("089190005678")
                .declarationScope("Đăng ký tạm trú")
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertTrue(resp.isOverallValid(), "Valid renting declaration with complete host details must pass");
        assertTrue(resp.getWarnings().stream().anyMatch(w -> w.contains("hợp đồng thuê mượn chỗ ở")));
    }

    @Test
    void testPrecheckStructuredForm_tkks_missingMandatoryChildAndCertFields_shouldFail() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-HT-01")
                .formType("TK-KS")
                .fullName("TRẦN GIA BẢO")
                .dateOfBirth("2026-10-15")
                .gender("Nam")
                .citizenCccd("089195001234")
                .address("Phường Mỹ Xuyên, An Giang")
                .formData(Map.of(
                        "hospitalBirthDate", "2026-10-15",
                        "motherName", "LÊ THỊ MỸ LINH",
                        "hospitalMotherName", "LÊ THỊ MỸ LINH",
                        "parentsMarried", "YES"
                ))
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertFalse(resp.isOverallValid());
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "MISSING_CHILD_ETHNICITY".equals(f.getErrorCode())));
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "MISSING_CHILD_NATIONALITY".equals(f.getErrorCode())));
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "MISSING_CHILD_BIRTH_PLACE".equals(f.getErrorCode())));
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "MISSING_BIRTH_CERT_NUMBER".equals(f.getErrorCode())));
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "MISSING_MOTHER_RESIDENCE".equals(f.getErrorCode())));
    }

    @Test
    void testPrecheckStructuredForm_tkks_fullValidDeclaration_shouldPass() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-HT-01")
                .formType("TK-KS")
                .fullName("TRẦN MINH KHÔI")
                .dateOfBirth("2026-10-01")
                .gender("Nam")
                .citizenCccd("089195001234")
                .address("Phường Mỹ Xuyên, An Giang")
                .childEthnicity("Kinh")
                .childNationality("Việt Nam")
                .childBirthPlace("Bệnh viện Đa khoa Trung tâm An Giang")
                .birthCertNumber("1234/GCS-2026")
                .birthCertIssueDate("2026-10-02")
                .motherResidence("Số 25 Chu Văn An, Phường Mỹ Xuyên, An Giang")
                .formData(Map.of(
                        "hospitalBirthDate", "2026-10-01",
                        "motherName", "LÊ THỊ BÍCH",
                        "hospitalMotherName", "LÊ THỊ BÍCH",
                        "parentsMarried", "YES"
                ))
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertTrue(resp.isOverallValid(), "Full valid birth declaration under Circular 04/2020 must pass");
    }

    @Test
    void testPrecheckStructuredForm_tkh_marriageRegistration_missingPartnerInfo_shouldFail() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-HT-02")
                .formType("TK-KH")
                .marriageMode("MARRIAGE_REGISTRATION")
                .fullName("TRẦN VĂN HẢI")
                .gender("Nam")
                .dateOfBirth("1998-05-10")
                .citizenCccd("089198001234")
                .address("Phường Mỹ Bình, An Giang")
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertFalse(resp.isOverallValid());
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "MISSING_PARTNER_NAME".equals(f.getErrorCode())));
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "INVALID_PARTNER_CCCD".equals(f.getErrorCode())));
    }

    @Test
    void testPrecheckStructuredForm_tkh_marriageRegistration_valid_shouldPass() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-HT-02")
                .formType("TK-KH")
                .marriageMode("MARRIAGE_REGISTRATION")
                .fullName("TRẦN VĂN HẢI")
                .gender("Nam")
                .dateOfBirth("1998-05-10")
                .citizenCccd("089198001234")
                .address("Phường Mỹ Bình, An Giang")
                .applicantEthnicity("Kinh")
                .applicantNationality("Việt Nam")
                .partnerName("LÊ THỊ MAI")
                .partnerCccd("089201005678")
                .partnerAddress("Số 80 Lê Lợi, Phường Mỹ Long, An Giang")
                .partnerEthnicity("Kinh")
                .partnerNationality("Việt Nam")
                .formData(Map.of(
                        "partnerDob", "2001-08-20",
                        "partnerGender", "Nữ"
                ))
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertTrue(resp.isOverallValid(), "Valid marriage registration with both eligible partners must pass");
    }

    @Test
    void testPrecheckStructuredForm_tkh_divorcedWithoutJudgment_shouldFail() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-HT-02")
                .formType("TK-KH")
                .marriageMode("MARITAL_STATUS_CONFIRMATION")
                .fullName("NGUYỄN THỊ THU")
                .gender("Nữ")
                .dateOfBirth("1995-02-14")
                .citizenCccd("089195008765")
                .address("Phường Bình Đức, An Giang")
                .formData(Map.of(
                        "maritalCertPurpose", "Để vay vốn ngân hàng thương mại tại An Giang",
                        "previousMaritalStatus", "DIVORCED"
                ))
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertFalse(resp.isOverallValid());
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "MISSING_DIVORCE_JUDGMENT_NUMBER".equals(f.getErrorCode())));
    }

    @Test
    void testPrecheckStructuredForm_tkh_widowedWithoutDeathCert_shouldFail() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-HT-02")
                .formType("TK-KH")
                .marriageMode("MARITAL_STATUS_CONFIRMATION")
                .fullName("NGUYỄN THỊ THU")
                .gender("Nữ")
                .dateOfBirth("1995-02-14")
                .citizenCccd("089195008765")
                .address("Phường Bình Đức, An Giang")
                .formData(Map.of(
                        "maritalCertPurpose", "Để làm thủ tục chuyển nhượng quyền sử dụng đất",
                        "previousMaritalStatus", "WIDOWED"
                ))
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertFalse(resp.isOverallValid());
        assertTrue(resp.getFieldValidations().stream().anyMatch(f -> "MISSING_DEATH_CERT_NUMBER".equals(f.getErrorCode())));
    }

    @Test
    void testPrecheckStructuredForm_tkbtxh_poorHousehold70Years_valid() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-BT-01")
                .formType("TK-BTXH")
                .fullName("NGUYỄN VĂN TÁM")
                .dateOfBirth("1955-04-10") // 71 years old
                .gender("Nam")
                .citizenCccd("089055001234")
                .address("Xã Vĩnh Tế, TP Châu Đốc, An Giang")
                .poorHouseholdBookNumber("HN-2026/08912")
                .formData(Map.of(
                        "householdStatus", "POOR",
                        "disabilityLevel", "NONE",
                        "bankAccount", "1029384756 - Agribank Châu Đốc"
                ))
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertTrue(resp.isOverallValid(), "71-year-old poor citizen with poor book number must qualify under Luật BHXH 2024");
    }

    @Test
    void testPrecheckStructuredForm_tkbtxh_severeDisabilityWithCert_valid() {
        StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-BT-01")
                .formType("TK-BTXH")
                .fullName("HOÀNG MINH ĐỨC")
                .dateOfBirth("1995-03-12")
                .gender("Nam")
                .citizenCccd("089195009876")
                .address("Phường Mỹ Phước, An Giang")
                .disabilityCertNumber("GKT-2025/001")
                .disabilityCertIssueDate("2025-05-10")
                .disabilityCertIssuer("UBND Phường Mỹ Phước")
                .guardianName("HOÀNG VĂN CHÍNH")
                .guardianCccd("089165004321")
                .guardianRelation("Bố đẻ")
                .guardianPhone("0987654321")
                .formData(Map.of(
                        "disabilityLevel", "SEVERE",
                        "bankAccount", "9988776655 - BIDV An Giang"
                ))
                .build();

        StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

        assertNotNull(resp);
        assertTrue(resp.isOverallValid(), "Severe disability with valid disability certificate and guardian info must pass");
    }
}

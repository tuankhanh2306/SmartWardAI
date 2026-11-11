package vn.edu.uth.smartward.formcheck;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckRequest;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckResponse;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Adversarial Stress-Testing Harness for FormPrecheckService (Milestone 2 Gate Evaluation).
 * Challenges edge cases across CT01, TK-KS, TK-KH, and TK-BTXH.
 */
@ExtendWith(MockitoExtension.class)
public class AdversarialFormPrecheckHarnessTest {

    @Mock
    private OcrExtractionClient ocrExtractionClient;

    @Mock
    private FormSubmissionRepository submissionRepository;

    private FormPrecheckService service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        service = new FormPrecheckService(
                ocrExtractionClient,
                new MandatoryFieldValidator(),
                new CccdValidator(),
                new DateLogicValidator(),
                submissionRepository,
                objectMapper
        );
    }

    // =========================================================================
    // 1. CT01 — RESIDENCE DECLARATION ADVERSARIAL CHALLENGES
    // =========================================================================
    @Nested
    @DisplayName("1. CT01 Adversarial Tests")
    class Ct01Tests {

        private StructuredFormPrecheckRequest.StructuredFormPrecheckRequestBuilder baseCt01Builder() {
            return StructuredFormPrecheckRequest.builder()
                    .procedureCode("TTHC-CR-01")
                    .formType("CT01")
                    .fullName("NGUYỄN VĂN AN")
                    .dateOfBirth("2000-01-01")
                    .gender("Nam")
                    .citizenCccd("089200001234") // Valid: 089 An Giang, 2 (century 20 male), 00 (2000), 001234
                    .address("Số 10 Đường Lý Thường Kiệt, Phường Mỹ Bình, TP Long Xuyên, An Giang")
                    .phoneNumber("0912345678");
        }

        @Test
        @DisplayName("CT01: Renting without host name must FAIL with MISSING_HOST_NAME")
        void testCt01_renting_withoutHostName_mustFail() {
            StructuredFormPrecheckRequest req = baseCt01Builder()
                    .hostRelation("Thuê nhà trọ")
                    .declarationScope("Đăng ký tạm trú")
                    .hostName("") // Missing host name
                    .hostCccd("089190005678")
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid(), "Must be invalid when host name is missing");
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_HOST_NAME".equals(f.getErrorCode()) && !f.isValid()),
                    "Must flag MISSING_HOST_NAME error");
        }

        @Test
        @DisplayName("CT01: Renting with single-word host name (< 4 chars, e.g. 'Nam' or 'Lê') must FAIL with MISSING_HOST_NAME")
        void testCt01_renting_singleWordHostName_mustFail() {
            // Case A: 3-character single word name "Nam"
            StructuredFormPrecheckRequest req3Chars = baseCt01Builder()
                    .hostRelation("Thuê nhà trọ")
                    .declarationScope("Đăng ký tạm trú")
                    .hostName("Nam")
                    .hostCccd("089190005678")
                    .build();

            StructuredFormPrecheckResponse resp3Chars = service.precheckStructuredForm(req3Chars);
            assertFalse(resp3Chars.isOverallValid());
            assertTrue(resp3Chars.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_HOST_NAME".equals(f.getErrorCode()) && !f.isValid()));

            // Case B: 2-character single word name "Lê"
            StructuredFormPrecheckRequest req2Chars = baseCt01Builder()
                    .hostRelation("Thuê nhà trọ")
                    .declarationScope("Đăng ký tạm trú")
                    .hostName("Lê")
                    .hostCccd("089190005678")
                    .build();

            StructuredFormPrecheckResponse resp2Chars = service.precheckStructuredForm(req2Chars);
            assertFalse(resp2Chars.isOverallValid());
            assertTrue(resp2Chars.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_HOST_NAME".equals(f.getErrorCode()) && !f.isValid()));

            // Case C: Single word >= 4 chars without space e.g. "Thành"
            StructuredFormPrecheckRequest reqNoSpace = baseCt01Builder()
                    .hostRelation("Thuê nhà trọ")
                    .declarationScope("Đăng ký tạm trú")
                    .hostName("Thành")
                    .hostCccd("089190005678")
                    .build();

            StructuredFormPrecheckResponse respNoSpace = service.precheckStructuredForm(reqNoSpace);
            assertFalse(respNoSpace.isOverallValid(), "Single word name without space must fail");
            assertTrue(respNoSpace.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_HOST_NAME".equals(f.getErrorCode()) && !f.isValid()));
        }

        @Test
        @DisplayName("CT01: Renting with host CCCD having 11 digits must FAIL with INVALID_HOST_CCCD")
        void testCt01_renting_hostCccd11Digits_mustFail() {
            StructuredFormPrecheckRequest req = baseCt01Builder()
                    .hostRelation("Thuê nhà trọ")
                    .declarationScope("Đăng ký tạm trú")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccd("08919000567") // 11 digits
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid(), "Must be invalid when host CCCD has 11 digits");
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "INVALID_HOST_CCCD".equals(f.getErrorCode()) && !f.isValid()),
                    "Must flag INVALID_HOST_CCCD error");
        }

        @Test
        @DisplayName("CT01: Renting with host CCCD having 13 digits must FAIL with INVALID_HOST_CCCD")
        void testCt01_renting_hostCccd13Digits_mustFail() {
            StructuredFormPrecheckRequest req = baseCt01Builder()
                    .hostRelation("Thuê nhà trọ")
                    .declarationScope("Đăng ký tạm trú")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccd("0891900056789") // 13 digits
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid(), "Must be invalid when host CCCD has 13 digits");
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "INVALID_HOST_CCCD".equals(f.getErrorCode()) && !f.isValid()),
                    "Must flag INVALID_HOST_CCCD error");
        }

        @Test
        @DisplayName("CT01: Host CCCD with invalid province code must FAIL with INVALID_HOST_CCCD")
        void testCt01_renting_hostCccdInvalidProvince_mustFail() {
            StructuredFormPrecheckRequest req = baseCt01Builder()
                    .hostRelation("Thuê nhà trọ")
                    .declarationScope("Đăng ký tạm trú")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccd("999190005678") // Invalid province 999
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid());
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "INVALID_HOST_CCCD".equals(f.getErrorCode()) && !f.isValid()));
        }

        @Test
        @DisplayName("CT01: Applicant CCCD with invalid century/gender code must FAIL with INVALID_CCCD_CENTURY_GENDER")
        void testCt01_applicantCccd_invalidCenturyGender_mustFail() {
            // Applicant: Male, born 2000. Expected century/gender digit: 2.
            // Provided CCCD has digit 0 (century 19 male): 089000001234
            StructuredFormPrecheckRequest req = baseCt01Builder()
                    .citizenCccd("089000001234") // Digit 0 instead of 2
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid());
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "INVALID_CCCD_CENTURY_GENDER".equals(f.getErrorCode()) && !f.isValid()),
                    "Must flag INVALID_CCCD_CENTURY_GENDER error");
        }

        @Test
        @DisplayName("CT01: Renting without declaration scope must FAIL with MISSING_DECLARATION_SCOPE")
        void testCt01_renting_withoutDeclarationScope_mustFail() {
            StructuredFormPrecheckRequest req = baseCt01Builder()
                    .hostRelation("Thuê nhà trọ")
                    .declarationScope("") // Blank declaration scope
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccd("089190005678")
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid(), "Must fail when declaration scope is missing in rental case");
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_DECLARATION_SCOPE".equals(f.getErrorCode()) && !f.isValid()),
                    "Must flag MISSING_DECLARATION_SCOPE error");
        }

        @Test
        @DisplayName("CT01: Renting declared in declarationScope but hostRelation is empty -> checks behavior")
        void testCt01_renting_scopeSpecified_relationEmpty_behaviorAudit() {
            StructuredFormPrecheckRequest req = baseCt01Builder()
                    .declarationScope("Thuê nhà trọ để ở và đi làm")
                    .hostRelation("") // Empty relation
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccd("089190005678")
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);
            // Empirical observation of behavior when relation is empty
            boolean hasRelationError = resp.getFieldValidations().stream()
                    .anyMatch(f -> "MISSING_HOST_RELATION".equals(f.getErrorCode()));
            System.out.println("CT01 scopeSpecified_relationEmpty: isOverallValid=" + resp.isOverallValid()
                    + ", hasRelationError=" + hasRelationError);
        }

        @Test
        @DisplayName("CT01: Fully compliant rental declaration must PASS")
        void testCt01_renting_fullyCompliant_mustPass() {
            StructuredFormPrecheckRequest req = baseCt01Builder()
                    .hostRelation("Thuê nhà trọ")
                    .declarationScope("Đăng ký tạm trú tại chỗ ở hợp pháp")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccd("089190005678")
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertTrue(resp.isOverallValid(), "Fully compliant CT01 renting form must pass");
            assertEquals(0, resp.getFieldValidations().stream().filter(f -> !f.isValid()).count());
        }
    }

    // =========================================================================
    // 2. TK-KS — BIRTH REGISTRATION ADVERSARIAL CHALLENGES
    // =========================================================================
    @Nested
    @DisplayName("2. TK-KS Adversarial Tests")
    class TkKsTests {

        private StructuredFormPrecheckRequest.StructuredFormPrecheckRequestBuilder baseTkKsBuilder() {
            return StructuredFormPrecheckRequest.builder()
                    .procedureCode("TTHC-HT-01")
                    .formType("TK-KS")
                    .fullName("TRẦN GIA BẢO")
                    .dateOfBirth("2026-10-15")
                    .gender("Nam")
                    .citizenCccd("089195001234") // Parent CCCD
                    .address("Phường Mỹ Xuyên, TP Long Xuyên, An Giang")
                    .childEthnicity("Kinh")
                    .childNationality("Việt Nam")
                    .childBirthPlace("Bệnh viện Đa khoa An Giang")
                    .birthCertNumber("1234/GCS-2026")
                    .birthCertIssueDate("2026-10-16")
                    .motherResidence("Số 15 Thoại Ngọc Hầu, Phường Mỹ Xuyên, An Giang")
                    .formData(Map.of(
                            "hospitalBirthDate", "2026-10-15",
                            "motherName", "LÊ THỊ BÍCH",
                            "hospitalMotherName", "LÊ THỊ BÍCH",
                            "parentsMarried", "YES"
                    ));
        }

        @Test
        @DisplayName("TK-KS: Missing child ethnicity, nationality, birth place must FAIL")
        void testTkKs_missingChildEthnicityNationalityBirthPlace_mustFail() {
            StructuredFormPrecheckRequest req = baseTkKsBuilder()
                    .childEthnicity("")
                    .childNationality("")
                    .childBirthPlace("")
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid());
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_CHILD_ETHNICITY".equals(f.getErrorCode()) && !f.isValid()));
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_CHILD_NATIONALITY".equals(f.getErrorCode()) && !f.isValid()));
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_CHILD_BIRTH_PLACE".equals(f.getErrorCode()) && !f.isValid()));
        }

        @Test
        @DisplayName("TK-KS: Child birth place too short (< 6 chars) must FAIL")
        void testTkKs_childBirthPlaceTooShort_mustFail() {
            StructuredFormPrecheckRequest req = baseTkKsBuilder()
                    .childBirthPlace("BV AG") // Only 5 chars
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid());
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_CHILD_BIRTH_PLACE".equals(f.getErrorCode()) && !f.isValid()));
        }

        @Test
        @DisplayName("TK-KS: Missing birth cert number must FAIL with MISSING_BIRTH_CERT_NUMBER")
        void testTkKs_missingBirthCertNumber_mustFail() {
            StructuredFormPrecheckRequest req = baseTkKsBuilder()
                    .birthCertNumber("")
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid());
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_BIRTH_CERT_NUMBER".equals(f.getErrorCode()) && !f.isValid()));
        }

        @Test
        @DisplayName("TK-KS: Birth cert issue date in the future must FAIL with INVALID_BIRTH_CERT_ISSUE_DATE")
        void testTkKs_futureBirthCertIssueDate_mustFail() {
            StructuredFormPrecheckRequest req = baseTkKsBuilder()
                    .birthCertIssueDate("2099-01-01") // Far future
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid());
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "INVALID_BIRTH_CERT_ISSUE_DATE".equals(f.getErrorCode()) && !f.isValid()));
        }

        @Test
        @DisplayName("TK-KS: Missing mother residence must FAIL with MISSING_MOTHER_RESIDENCE")
        void testTkKs_missingMotherResidence_mustFail() {
            StructuredFormPrecheckRequest req = baseTkKsBuilder()
                    .motherResidence("")
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid());
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_MOTHER_RESIDENCE".equals(f.getErrorCode()) && !f.isValid()));
        }

        @Test
        @DisplayName("TK-KS: Father declared while parents NOT married must FAIL with UNMARRIED_PARENTS_PATERNITY_REQUIRED")
        void testTkKs_fatherDeclared_parentsNotMarried_mustFail() {
            Map<String, String> data = new HashMap<>(Map.of(
                    "hospitalBirthDate", "2026-10-15",
                    "motherName", "LÊ THỊ BÍCH",
                    "hospitalMotherName", "LÊ THỊ BÍCH",
                    "parentsMarried", "NO", // Unmarried
                    "fatherName", "TRẦN VĂN HÙNG" // But father name declared
            ));

            StructuredFormPrecheckRequest req = baseTkKsBuilder()
                    .fatherResidence("Số 10 Hùng Vương, Phường Mỹ Long, An Giang")
                    .formData(data)
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid());
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "UNMARRIED_PARENTS_PATERNITY_REQUIRED".equals(f.getErrorCode()) && !f.isValid()),
                    "Must flag UNMARRIED_PARENTS_PATERNITY_REQUIRED when father is declared without marriage cert");
        }

        @Test
        @DisplayName("TK-KS: Fully compliant birth declaration must PASS")
        void testTkKs_fullyCompliant_mustPass() {
            StructuredFormPrecheckRequest req = baseTkKsBuilder().build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertTrue(resp.isOverallValid(), "Valid TK-KS must pass all validations");
        }
    }

    // =========================================================================
    // 3. TK-KH — MARRIAGE & MARITAL STATUS ADVERSARIAL CHALLENGES
    // =========================================================================
    @Nested
    @DisplayName("3. TK-KH Adversarial Tests")
    class TkKhTests {

        private StructuredFormPrecheckRequest.StructuredFormPrecheckRequestBuilder baseTkKhBuilder() {
            return StructuredFormPrecheckRequest.builder()
                    .procedureCode("TTHC-HT-02")
                    .formType("TK-KH")
                    .marriageMode("MARRIAGE_REGISTRATION")
                    .fullName("TRẦN VĂN HẢI")
                    .gender("Nam")
                    .dateOfBirth("1998-05-10") // 28 years old (Male >= 20)
                    .citizenCccd("089198001234") // Valid: 089, 0 (century 19 male), 98 (1998), 001234
                    .address("Phường Mỹ Bình, TP Long Xuyên, An Giang")
                    .applicantEthnicity("Kinh")
                    .applicantNationality("Việt Nam")
                    .partnerName("LÊ THỊ MAI")
                    .partnerCccd("089201005678") // Valid: 089, 3 (century 20 female), 01 (2001), 005678
                    .partnerAddress("Số 80 Lê Lợi, Phường Mỹ Long, An Giang")
                    .partnerEthnicity("Kinh")
                    .partnerNationality("Việt Nam")
                    .formData(Map.of(
                            "partnerDob", "2001-08-20", // 25 years old (Female >= 18)
                            "partnerGender", "Nữ"
                    ));
        }

        @Test
        @DisplayName("TK-KH: Underage male partner (age 19 < 20) must FAIL with PARTNER_UNDERAGE_MARRIAGE")
        void testTkKh_underageMalePartner_mustFail() {
            LocalDate today = LocalDate.now();
            // Male partner born 19 years ago
            String partnerDob19 = today.minusYears(19).minusMonths(2).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

            StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                    .procedureCode("TTHC-HT-02")
                    .formType("TK-KH")
                    .marriageMode("MARRIAGE_REGISTRATION")
                    .fullName("LÊ THỊ MAI")
                    .gender("Nữ")
                    .dateOfBirth("2000-01-01") // 26 years old
                    .citizenCccd("089300001234")
                    .address("Phường Mỹ Long, TP Long Xuyên, An Giang")
                    .applicantEthnicity("Kinh")
                    .applicantNationality("Việt Nam")
                    .partnerName("TRẦN VĂN HẢI")
                    .partnerCccd("089207005678")
                    .partnerAddress("Số 80 Lê Lợi, Phường Mỹ Bình, An Giang")
                    .partnerEthnicity("Kinh")
                    .partnerNationality("Việt Nam")
                    .formData(Map.of(
                            "partnerDob", partnerDob19,
                            "partnerGender", "Nam" // Male partner 19 years old
                    ))
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid(), "Must fail when male partner is under 20");
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "PARTNER_UNDERAGE_MARRIAGE".equals(f.getErrorCode()) && !f.isValid()),
                    "Must flag PARTNER_UNDERAGE_MARRIAGE for 19-year-old male partner");
        }

        @Test
        @DisplayName("TK-KH: Underage female partner (age 17 < 18) must FAIL with PARTNER_UNDERAGE_MARRIAGE")
        void testTkKh_underageFemalePartner_mustFail() {
            LocalDate today = LocalDate.now();
            // Female partner born 17 years ago
            String partnerDob17 = today.minusYears(17).minusMonths(2).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

            StructuredFormPrecheckRequest req = baseTkKhBuilder()
                    .formData(Map.of(
                            "partnerDob", partnerDob17,
                            "partnerGender", "Nữ" // Female partner 17 years old
                    ))
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid(), "Must fail when female partner is under 18");
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "PARTNER_UNDERAGE_MARRIAGE".equals(f.getErrorCode()) && !f.isValid()),
                    "Must flag PARTNER_UNDERAGE_MARRIAGE for 17-year-old female partner");
        }

        @Test
        @DisplayName("TK-KH: Missing partner CCCD must FAIL with INVALID_PARTNER_CCCD")
        void testTkKh_missingPartnerCccd_mustFail() {
            StructuredFormPrecheckRequest req = baseTkKhBuilder()
                    .partnerCccd("") // Missing partner CCCD
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid());
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "INVALID_PARTNER_CCCD".equals(f.getErrorCode()) && !f.isValid()));
        }

        @Test
        @DisplayName("TK-KH: Missing partner address must FAIL with MISSING_PARTNER_ADDRESS")
        void testTkKh_missingPartnerAddress_mustFail() {
            StructuredFormPrecheckRequest req = baseTkKhBuilder()
                    .partnerAddress("") // Missing partner address
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid());
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_PARTNER_ADDRESS".equals(f.getErrorCode()) && !f.isValid()));
        }

        @Test
        @DisplayName("TK-KH: Divorced status without judgment number/date must FAIL with MISSING_DIVORCE_JUDGMENT_*")
        void testTkKh_divorcedWithoutJudgment_mustFail() {
            StructuredFormPrecheckRequest req = baseTkKhBuilder()
                    .formData(Map.of(
                            "partnerDob", "2001-08-20",
                            "partnerGender", "Nữ",
                            "previousMaritalStatus", "DIVORCED"
                    ))
                    .divorceJudgmentNumber("") // Missing judgment number
                    .divorceJudgmentDate("")   // Missing judgment date
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid());
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_DIVORCE_JUDGMENT_NUMBER".equals(f.getErrorCode()) && !f.isValid()),
                    "Must flag MISSING_DIVORCE_JUDGMENT_NUMBER");
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_DIVORCE_JUDGMENT_DATE".equals(f.getErrorCode()) && !f.isValid()),
                    "Must flag MISSING_DIVORCE_JUDGMENT_DATE");
        }

        @Test
        @DisplayName("TK-KH: Widowed status without death certificate number/date must FAIL with MISSING_DEATH_CERT_*")
        void testTkKh_widowedWithoutDeathCert_mustFail() {
            StructuredFormPrecheckRequest req = baseTkKhBuilder()
                    .formData(Map.of(
                            "partnerDob", "2001-08-20",
                            "partnerGender", "Nữ",
                            "previousMaritalStatus", "WIDOWED"
                    ))
                    .deathCertNumber("") // Missing death cert number
                    .deathCertDate("")   // Missing death cert date
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid());
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_DEATH_CERT_NUMBER".equals(f.getErrorCode()) && !f.isValid()),
                    "Must flag MISSING_DEATH_CERT_NUMBER");
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_DEATH_CERT_DATE".equals(f.getErrorCode()) && !f.isValid()),
                    "Must flag MISSING_DEATH_CERT_DATE");
        }

        @Test
        @DisplayName("TK-KH: Fully compliant marriage registration must PASS")
        void testTkKh_fullyCompliant_mustPass() {
            StructuredFormPrecheckRequest req = baseTkKhBuilder().build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertTrue(resp.isOverallValid(), "Fully compliant marriage registration must pass");
        }
    }

    // =========================================================================
    // 4. TK-BTXH — SOCIAL PROTECTION ADVERSARIAL CHALLENGES
    // =========================================================================
    @Nested
    @DisplayName("4. TK-BTXH Adversarial Tests")
    class TkBtxhTests {

        private StructuredFormPrecheckRequest.StructuredFormPrecheckRequestBuilder baseTkBtxhBuilder() {
            return StructuredFormPrecheckRequest.builder()
                    .procedureCode("TTHC-BT-01")
                    .formType("TK-BTXH")
                    .fullName("NGUYỄN VĂN AN")
                    .gender("Nam")
                    .citizenCccd("089051001234") // An Giang, 0 (century 19 male), 51 (1951), 001234
                    .address("Phường Mỹ Long, TP Long Xuyên, An Giang")
                    .formData(Map.of(
                            "disabilityLevel", "NONE",
                            "householdStatus", "NORMAL",
                            "bankAccount", "102800123456 - Vietcombank An Giang"
                    ));
        }

        @Test
        @DisplayName("TK-BTXH: Applicant age 74 (not poor, no disability) MUST FAIL with INELIGIBLE_SOCIAL_PROTECTION_AGE")
        void testTkBtxh_age74_notPoor_noDisability_mustFail() {
            LocalDate today = LocalDate.now();
            String dob74 = today.minusYears(74).minusMonths(2).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

            StructuredFormPrecheckRequest req = baseTkBtxhBuilder()
                    .dateOfBirth(dob74) // Exactly 74 years old
                    .citizenCccd("089052001234") // 1952 male
                    .formData(Map.of(
                            "disabilityLevel", "NONE",
                            "householdStatus", "NORMAL",
                            "bankAccount", "102800123456 - Vietcombank An Giang"
                    ))
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid(), "Applicant age 74 (not poor, no disability) must fail");
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "INELIGIBLE_SOCIAL_PROTECTION_AGE".equals(f.getErrorCode()) && !f.isValid()),
                    "Must flag INELIGIBLE_SOCIAL_PROTECTION_AGE");
        }

        @Test
        @DisplayName("TK-BTXH: Applicant age 75 MUST PASS under Luật BHXH 2024")
        void testTkBtxh_age75_mustPass_underLuatBhxh2024() {
            LocalDate today = LocalDate.now();
            String dob75 = today.minusYears(75).minusMonths(1).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

            StructuredFormPrecheckRequest req = baseTkBtxhBuilder()
                    .dateOfBirth(dob75) // Exactly 75 years old
                    .citizenCccd("089051001234") // 1951 male
                    .formData(Map.of(
                            "disabilityLevel", "NONE",
                            "householdStatus", "NORMAL",
                            "bankAccount", "102800123456 - Vietcombank An Giang"
                    ))
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertTrue(resp.isOverallValid(), "Applicant age 75 must pass under Luật BHXH 2024");
            assertTrue(resp.getFieldValidations().stream().allMatch(
                    vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckResponse.FieldValidationItem::isValid));
        }

        @Test
        @DisplayName("TK-BTXH: Poor applicant age 69 MUST FAIL with INELIGIBLE_SOCIAL_PROTECTION_AGE")
        void testTkBtxh_poorApplicant_age69_mustFail() {
            LocalDate today = LocalDate.now();
            String dob69 = today.minusYears(69).minusMonths(3).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

            StructuredFormPrecheckRequest req = baseTkBtxhBuilder()
                    .dateOfBirth(dob69) // 69 years old
                    .citizenCccd("089057001234") // 1957 male
                    .poorHouseholdBookNumber("HN-2026/08912")
                    .formData(Map.of(
                            "disabilityLevel", "NONE",
                            "householdStatus", "POOR",
                            "bankAccount", "102800123456 - Vietcombank An Giang"
                    ))
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid(), "Poor applicant age 69 must fail (requires >= 70)");
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "INELIGIBLE_SOCIAL_PROTECTION_AGE".equals(f.getErrorCode()) && !f.isValid()));
        }

        @Test
        @DisplayName("TK-BTXH: Poor applicant age 70 with poor book number MUST PASS")
        void testTkBtxh_poorApplicant_age70_withPoorBook_mustPass() {
            LocalDate today = LocalDate.now();
            String dob70 = today.minusYears(70).minusMonths(1).format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));

            StructuredFormPrecheckRequest req = baseTkBtxhBuilder()
                    .dateOfBirth(dob70) // Exactly 70 years old
                    .citizenCccd("089056001234") // 1956 male
                    .poorHouseholdBookNumber("HN-2026/08912")
                    .formData(Map.of(
                            "disabilityLevel", "NONE",
                            "householdStatus", "POOR",
                            "bankAccount", "102800123456 - Vietcombank An Giang"
                    ))
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertTrue(resp.isOverallValid(), "Poor applicant age 70 with poor book number must pass");
            assertTrue(resp.getFieldValidations().stream().allMatch(
                    vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckResponse.FieldValidationItem::isValid));
        }

        @Test
        @DisplayName("TK-BTXH: Severe disability without cert number/date MUST FAIL")
        void testTkBtxh_severeDisability_withoutCert_mustFail() {
            StructuredFormPrecheckRequest req = baseTkBtxhBuilder()
                    .dateOfBirth("1995-03-12") // 31 years old
                    .citizenCccd("089095009876")
                    .disabilityCertNumber("") // Missing cert number
                    .disabilityCertIssueDate("") // Missing issue date
                    .disabilityCertIssuer("") // Missing issuer
                    .formData(Map.of(
                            "disabilityLevel", "SEVERE",
                            "householdStatus", "NORMAL",
                            "bankAccount", "102800123456 - Vietcombank An Giang"
                    ))
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertFalse(resp.isOverallValid(), "Severe disability without certificate details must fail");
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_DISABILITY_CERT_NUMBER".equals(f.getErrorCode()) && !f.isValid()));
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_DISABILITY_CERT_DATE".equals(f.getErrorCode()) && !f.isValid()));
            assertTrue(resp.getFieldValidations().stream().anyMatch(f ->
                    "MISSING_DISABILITY_CERT_ISSUER".equals(f.getErrorCode()) && !f.isValid()));
        }

        @Test
        @DisplayName("TK-BTXH: Invalid guardian CCCD (e.g. 11 digits, 13 digits, invalid province) MUST FAIL with INVALID_GUARDIAN_CCCD")
        void testTkBtxh_invalidGuardianCccd_mustFail() {
            // Case A: 11 digits
            StructuredFormPrecheckRequest req11 = baseTkBtxhBuilder()
                    .dateOfBirth("1995-03-12")
                    .citizenCccd("089095009876")
                    .disabilityCertNumber("GKT-2025/001")
                    .disabilityCertIssueDate("2025-05-10")
                    .disabilityCertIssuer("UBND Phường Mỹ Phước")
                    .guardianName("HOÀNG VĂN CHÍNH")
                    .guardianCccd("08916500432") // 11 digits
                    .guardianRelation("Bố đẻ")
                    .guardianPhone("0987654321")
                    .formData(Map.of(
                            "disabilityLevel", "EXTREMELY_SEVERE",
                            "householdStatus", "NORMAL",
                            "bankAccount", "102800123456 - Vietcombank An Giang"
                    ))
                    .build();

            StructuredFormPrecheckResponse resp11 = service.precheckStructuredForm(req11);
            assertFalse(resp11.isOverallValid());
            assertTrue(resp11.getFieldValidations().stream().anyMatch(f ->
                    "INVALID_GUARDIAN_CCCD".equals(f.getErrorCode()) && !f.isValid()));

            // Case B: Invalid province 999
            StructuredFormPrecheckRequest req999 = baseTkBtxhBuilder()
                    .dateOfBirth("1995-03-12")
                    .citizenCccd("089095009876")
                    .disabilityCertNumber("GKT-2025/001")
                    .disabilityCertIssueDate("2025-05-10")
                    .disabilityCertIssuer("UBND Phường Mỹ Phước")
                    .guardianName("HOÀNG VĂN CHÍNH")
                    .guardianCccd("999165004321") // 999 invalid province
                    .guardianRelation("Bố đẻ")
                    .guardianPhone("0987654321")
                    .formData(Map.of(
                            "disabilityLevel", "EXTREMELY_SEVERE",
                            "householdStatus", "NORMAL",
                            "bankAccount", "102800123456 - Vietcombank An Giang"
                    ))
                    .build();

            StructuredFormPrecheckResponse resp999 = service.precheckStructuredForm(req999);
            assertFalse(resp999.isOverallValid());
            assertTrue(resp999.getFieldValidations().stream().anyMatch(f ->
                    "INVALID_GUARDIAN_CCCD".equals(f.getErrorCode()) && !f.isValid()));
        }

        @Test
        @DisplayName("TK-BTXH: Fully compliant severe disability declaration with guardian MUST PASS")
        void testTkBtxh_severeDisability_fullyCompliant_mustPass() {
            StructuredFormPrecheckRequest req = baseTkBtxhBuilder()
                    .dateOfBirth("1995-03-12")
                    .citizenCccd("089095009876")
                    .disabilityCertNumber("GKT-2025/001")
                    .disabilityCertIssueDate("2025-05-10")
                    .disabilityCertIssuer("UBND Phường Mỹ Phước")
                    .guardianName("HOÀNG VĂN CHÍNH")
                    .guardianCccd("089165004321")
                    .guardianRelation("Bố đẻ")
                    .guardianPhone("0987654321")
                    .formData(Map.of(
                            "disabilityLevel", "EXTREMELY_SEVERE",
                            "householdStatus", "NORMAL",
                            "bankAccount", "102800123456 - Vietcombank An Giang"
                    ))
                    .build();

            StructuredFormPrecheckResponse resp = service.precheckStructuredForm(req);

            assertTrue(resp.isOverallValid(), "Fully compliant severe disability declaration must pass");
            assertTrue(resp.getFieldValidations().stream().allMatch(
                    vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckResponse.FieldValidationItem::isValid));
        }
    }
}

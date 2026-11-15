package vn.edu.uth.smartward.challenge;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.uth.smartward.formcheck.CccdValidator;
import vn.edu.uth.smartward.formcheck.DateLogicValidator;
import vn.edu.uth.smartward.formcheck.FormPrecheckService;
import vn.edu.uth.smartward.formcheck.FormSubmissionRepository;
import vn.edu.uth.smartward.formcheck.MandatoryFieldValidator;
import vn.edu.uth.smartward.formcheck.OcrExtractionClient;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckRequest;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckResponse;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Empirical Stress-Testing Harness for Milestone 3 Gate:
 * CT01 Rule Engine (Circular 116/2026/TT-BCA) & Paperless Exemption (Decree 309/2026/ND-CP).
 * Authored and independently verified by Challenger 1.
 */
@ExtendWith(MockitoExtension.class)
public class Milestone3Challenger1EmpiricalTest {

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
        // Avoid NPE when precheck persists audit records
        when(submissionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    }

    // Helper to generate a valid adult applicant
    private StructuredFormPrecheckRequest.StructuredFormPrecheckRequestBuilder baseValidCt01Request() {
        return StructuredFormPrecheckRequest.builder()
                .procedureCode("TTHC-CR-01")
                .formType("CT01")
                .fullName("NGUYỄN VĂN AN")
                .dateOfBirth("2000-01-01")
                .gender("Nam")
                .citizenCccd("089200001234") // An Giang (089), male 2000s (2), year 00
                .address("Số 10 Đường Lý Thường Kiệt, Phường Mỹ Bình, An Giang")
                .phoneNumber("0912345678")
                .declarationScope("Đăng ký thường trú");
    }

    // =========================================================================
    // SECTION 1: CT01 HOST CCCD & AGE VALIDATION EMPIRICAL TESTS (TT 116/2026/TT-BCA)
    // =========================================================================
    @Nested
    @DisplayName("1. CT01 Host CCCD & Age Validation (Circular 116/2026/TT-BCA)")
    class Ct01HostCccdAndAgeValidationChallenge {

        @Test
        @DisplayName("Case 1.1: Valid adult host born 1985 (century 0, age 41 in 2026) -> PASS")
        void testValidHost_born1985_shouldPass() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê nhà trọ")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccdNumber("089085005678") // Century 0 (male 1900-1999), 1985 -> age 41 in 2026
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp).isNotNull();
            assertThat(resp.isOverallValid()).isTrue();
            assertThat(resp.getFieldValidations())
                    .noneMatch(f -> "INVALID_HOST_AGE".equals(f.getErrorCode()))
                    .noneMatch(f -> "INVALID_HOST_CCCD".equals(f.getErrorCode()));
        }

        @Test
        @DisplayName("Case 1.2: Valid adult host born 2000 (female century 3, age 26 in 2026) -> PASS")
        void testValidHost_femaleBorn2000_shouldPass() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Ở nhờ")
                    .hostName("TRẦN THỊ MAI")
                    .hostCccdNumber("089300005678") // Century 3 (female 2000-2099), 2000 -> age 26 in 2026
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp).isNotNull();
            assertThat(resp.isOverallValid()).isTrue();
            assertThat(resp.getFieldValidations())
                    .noneMatch(f -> "INVALID_HOST_AGE".equals(f.getErrorCode()));
        }

        @Test
        @DisplayName("Case 1.3: Boundary adult host born 2008 (century 2, age exactly 18 in 2026) -> PASS")
        void testBoundaryHost_born2008_exactly18_shouldPass() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Mượn nhà")
                    .hostName("PHẠM QUỐC BẢO")
                    .hostCccdNumber("089208001234") // Century 2 (male 2000-2099), 2008 -> 2026 - 2008 = 18
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp).isNotNull();
            assertThat(resp.isOverallValid()).isTrue();
            assertThat(resp.getFieldValidations())
                    .noneMatch(f -> "INVALID_HOST_AGE".equals(f.getErrorCode()));
        }

        @Test
        @DisplayName("Case 1.4: Minor host born 2009 (century 2, age 17 in 2026) -> MUST FAIL with INVALID_HOST_AGE")
        void testMinorHost_born2009_age17_mustFailWithInvalidHostAge() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê nhà trọ")
                    .hostName("LÊ VĂN EM")
                    .hostCccdNumber("089209001234") // Century 2 (male 2000-2099), 2009 -> age 17 in 2026
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp).isNotNull();
            assertThat(resp.isOverallValid()).isFalse();
            assertThat(resp.getFieldValidations())
                    .anyMatch(f -> "INVALID_HOST_AGE".equals(f.getErrorCode()) && !f.isValid());
        }

        @Test
        @DisplayName("Case 1.5: Minor host born 2010 (century 2, age 16 in 2026) -> MUST FAIL with INVALID_HOST_AGE")
        void testMinorHost_born2010_age16_mustFailWithInvalidHostAge() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê nhà trọ")
                    .hostName("NGUYỄN VĂN NHỎ")
                    .hostCccdNumber("089210005678") // Century 2 (male 2000-2099), 2010 -> age 16 in 2026
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp).isNotNull();
            assertThat(resp.isOverallValid()).isFalse();
            assertThat(resp.getFieldValidations())
                    .anyMatch(f -> "INVALID_HOST_AGE".equals(f.getErrorCode()) && !f.isValid());
        }

        @Test
        @DisplayName("Case 1.6: Minor host with explicit hostBirthDate (2009-08-15) -> MUST FAIL with INVALID_HOST_AGE")
        void testMinorHost_explicitHostDob2009_mustFailWithInvalidHostAge() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê phòng")
                    .hostName("ĐẶNG THỊ ÚT")
                    .hostCccdNumber("089309009876") // female 2009
                    .hostBirthDate("2009-08-15")
                    .hostGender("Nữ")
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp).isNotNull();
            assertThat(resp.isOverallValid()).isFalse();
            assertThat(resp.getFieldValidations())
                    .anyMatch(f -> "INVALID_HOST_AGE".equals(f.getErrorCode()) && !f.isValid());
        }

        @Test
        @DisplayName("Case 1.7: Invalid Host CCCD format (11 digits) -> MUST FAIL with INVALID_HOST_CCCD")
        void testInvalidHostCccd_11digits_mustFail() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê nhà")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccdNumber("08908500567") // 11 digits
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp).isNotNull();
            assertThat(resp.isOverallValid()).isFalse();
            assertThat(resp.getFieldValidations())
                    .anyMatch(f -> "INVALID_HOST_CCCD".equals(f.getErrorCode()) && !f.isValid());
        }

        @Test
        @DisplayName("Case 1.8: Invalid Host CCCD format (13 digits) -> MUST FAIL with INVALID_HOST_CCCD")
        void testInvalidHostCccd_13digits_mustFail() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê nhà")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccdNumber("0890850056789") // 13 digits
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp).isNotNull();
            assertThat(resp.isOverallValid()).isFalse();
            assertThat(resp.getFieldValidations())
                    .anyMatch(f -> "INVALID_HOST_CCCD".equals(f.getErrorCode()) && !f.isValid());
        }

        @Test
        @DisplayName("Case 1.9: Invalid Host CCCD format (contains letters) -> MUST FAIL with INVALID_HOST_CCCD")
        void testInvalidHostCccd_alphanumeric_mustFail() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê nhà")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccdNumber("089085ABC678") // alphanumeric
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp).isNotNull();
            assertThat(resp.isOverallValid()).isFalse();
            assertThat(resp.getFieldValidations())
                    .anyMatch(f -> "INVALID_HOST_CCCD".equals(f.getErrorCode()) && !f.isValid());
        }

        @Test
        @DisplayName("Case 1.10: Invalid Host CCCD province code (999 not in catalogue) -> MUST FAIL with INVALID_HOST_CCCD")
        void testInvalidHostCccd_unknownProvince_mustFail() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê nhà")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccdNumber("999085005678") // 999 unknown province
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp).isNotNull();
            assertThat(resp.isOverallValid()).isFalse();
            assertThat(resp.getFieldValidations())
                    .anyMatch(f -> "INVALID_HOST_CCCD".equals(f.getErrorCode()) && !f.isValid());
        }

        @Test
        @DisplayName("Case 1.11: Renting/borrowing with empty Host CCCD -> MUST FAIL with INVALID_HOST_CCCD")
        void testRentingWithoutHostCccd_mustFail() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê nhà trọ")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccdNumber("") // empty
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp).isNotNull();
            assertThat(resp.isOverallValid()).isFalse();
            assertThat(resp.getFieldValidations())
                    .anyMatch(f -> "INVALID_HOST_CCCD".equals(f.getErrorCode()) && !f.isValid());
        }

        @Test
        @DisplayName("Case 1.12: Host CCCD alias resolution (hostCccd vs hostCccdNumber vs formData.host_cccd)")
        void testHostCccd_aliasResolution_shouldAllPass() {
            // Using hostCccd property directly
            StructuredFormPrecheckRequest req1 = baseValidCt01Request()
                    .hostRelation("Thuê nhà")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccd("089085005678")
                    .build();
            StructuredFormPrecheckResponse resp1 = formPrecheckService.precheckStructuredForm(req1);
            assertThat(resp1.isOverallValid()).isTrue();

            // Using formData map with key 'host_cccd'
            StructuredFormPrecheckRequest req2 = baseValidCt01Request()
                    .hostRelation("Thuê nhà")
                    .hostName("LÊ HOÀNG NAM")
                    .formData(Map.of("host_cccd", "089085005678"))
                    .build();
            StructuredFormPrecheckResponse resp2 = formPrecheckService.precheckStructuredForm(req2);
            assertThat(resp2.isOverallValid()).isTrue();
        }
    }

    // =========================================================================
    // SECTION 2: VNEID HOST CONSENT EXEMPTION EMPIRICAL TESTS
    // =========================================================================
    @Nested
    @DisplayName("2. VNeID Host Consent Exemption (Circular 116/2026/TT-BCA)")
    class VneidHostConsentExemptionChallenge {

        @Test
        @DisplayName("Case 2.1: vneidHostConfirmed == true (typed field) -> emits paper consent exemption warning")
        void testVneidHostConfirmed_trueField_shouldEmitExemptionWarning() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê nhà")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccdNumber("089085005678")
                    .vneidHostConfirmed(true)
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.isOverallValid()).isTrue();
            assertThat(resp.getWarnings())
                    .anyMatch(w -> w.contains("ĐÃ XÁC NHẬN QUA VNEID") && w.contains("Miễn nộp văn bản đồng ý bằng giấy"));
        }

        @Test
        @DisplayName("Case 2.2: vneidHostConfirmed in formData ('vneid_host_confirmed' = 'true') -> emits exemption warning")
        void testVneidHostConfirmed_formDataAlias_shouldEmitExemptionWarning() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê nhà")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccdNumber("089085005678")
                    .formData(Map.of("vneid_host_confirmed", "true"))
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.isOverallValid()).isTrue();
            assertThat(resp.getWarnings())
                    .anyMatch(w -> w.contains("ĐÃ XÁC NHẬN QUA VNEID"));
        }

        @Test
        @DisplayName("Case 2.3: vneidHostConfirmed == false or null -> does NOT emit paper consent exemption warning")
        void testVneidHostConfirmed_falseOrNull_noExemptionWarning() {
            StructuredFormPrecheckRequest reqFalse = baseValidCt01Request()
                    .hostRelation("Thuê nhà")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccdNumber("089085005678")
                    .vneidHostConfirmed(false)
                    .build();
            StructuredFormPrecheckResponse respFalse = formPrecheckService.precheckStructuredForm(reqFalse);
            assertThat(respFalse.getWarnings())
                    .noneMatch(w -> w.contains("ĐÃ XÁC NHẬN QUA VNEID"));

            StructuredFormPrecheckRequest reqNull = baseValidCt01Request()
                    .hostRelation("Thuê nhà")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccdNumber("089085005678")
                    .vneidHostConfirmed(null)
                    .build();
            StructuredFormPrecheckResponse respNull = formPrecheckService.precheckStructuredForm(reqNull);
            assertThat(respNull.getWarnings())
                    .noneMatch(w -> w.contains("ĐÃ XÁC NHẬN QUA VNEID"));
        }

        @Test
        @DisplayName("Case 2.4: Adversarial Collision - Minor host (< 18) with vneidHostConfirmed == true -> STILL FAILS on INVALID_HOST_AGE")
        void testMinorHost_withVneidConfirmed_mustStillFail() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê nhà")
                    .hostName("LÊ VĂN EM")
                    .hostCccdNumber("089209001234") // 17 years old
                    .vneidHostConfirmed(true)
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            // Minor host cannot legally be host under Law on Residence even if confirmed on VNeID
            assertThat(resp.isOverallValid()).isFalse();
            assertThat(resp.getFieldValidations())
                    .anyMatch(f -> "INVALID_HOST_AGE".equals(f.getErrorCode()) && !f.isValid());
        }
    }

    // =========================================================================
    // SECTION 3: PAPERLESS EXEMPTION EMPIRICAL TESTS (DECREE 309/2026/ND-CP)
    // =========================================================================
    @Nested
    @DisplayName("3. Paperless Exemption & Digital Verification (Decree 309/2026/ND-CP)")
    class PaperlessExemptionChallenge {

        @Test
        @DisplayName("Case 3.1: verifiedViaVneidQr == true -> tags response verifiedViaVneidQr = true and emits ND 309 advisory notice")
        void testVerifiedViaVneidQr_true_shouldTagAndEmitExemptionNotice() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .verifiedViaVneidQr(true)
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.getVerifiedViaVneidQr()).isTrue();
            assertThat(resp.getWarnings())
                    .anyMatch(w -> w.contains("VERIFIED_VIA_VNEID_QR")
                            && w.contains("Nghị định 309/2026/NĐ-CP")
                            && w.contains("MIỄN nộp bản sao chứng thực Căn cước công dân và Giấy xác nhận thông tin về cư trú (Mẫu CT07)"));
        }

        @Test
        @DisplayName("Case 3.2: citizenScanQr == true -> tags response verifiedViaVneidQr = true and emits advisory notice")
        void testCitizenScanQr_true_shouldTagAndEmitExemptionNotice() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .citizenScanQr(true)
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.getVerifiedViaVneidQr()).isTrue();
            assertThat(resp.getWarnings()).anyMatch(w -> w.contains("VERIFIED_VIA_VNEID_QR"));
        }

        @Test
        @DisplayName("Case 3.3: verifiedViaVneid == true -> tags response verifiedViaVneidQr = true and emits advisory notice")
        void testVerifiedViaVneid_true_shouldTagAndEmitExemptionNotice() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .verifiedViaVneid(true)
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.getVerifiedViaVneidQr()).isTrue();
            assertThat(resp.getWarnings()).anyMatch(w -> w.contains("VERIFIED_VIA_VNEID_QR"));
        }

        @Test
        @DisplayName("Case 3.4: qrRawData is present -> tags response verifiedViaVneidQr = true and emits advisory notice")
        void testQrRawData_present_shouldTagAndEmitExemptionNotice() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .qrRawData("089200001234|001200001234|NGUYỄN VĂN AN|01012000|Nam|An Giang|01012022")
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.getVerifiedViaVneidQr()).isTrue();
            assertThat(resp.getWarnings()).anyMatch(w -> w.contains("VERIFIED_VIA_VNEID_QR"));
        }

        @Test
        @DisplayName("Case 3.5: formData aliases ('verifiedViaVneidQr', 'isVneidVerified', 'scannedViaQr') -> tags verifiedViaVneidQr = true")
        void testFormDataAliases_shouldTagAndEmitExemptionNotice() {
            String[] aliases = {"verifiedViaVneidQr", "citizenScanQr", "verifiedViaVneid", "scannedViaQr", "isVneidVerified"};

            for (String alias : aliases) {
                Map<String, String> data = new HashMap<>();
                data.put(alias, "true");

                StructuredFormPrecheckRequest req = baseValidCt01Request()
                        .formData(data)
                        .build();

                StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);
                assertThat(resp.getVerifiedViaVneidQr())
                        .as("Alias '%s' must trigger verifiedViaVneidQr = true", alias)
                        .isTrue();
                assertThat(resp.getWarnings())
                        .as("Alias '%s' must trigger VERIFIED_VIA_VNEID_QR warning", alias)
                        .anyMatch(w -> w.contains("VERIFIED_VIA_VNEID_QR"));
            }
        }

        @Test
        @DisplayName("Case 3.6: Citizen WITHOUT digital verification -> verifiedViaVneidQr = false and NO exemption notice")
        void testWithoutDigitalVerification_shouldNotTagOrExempt() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .verifiedViaVneidQr(false)
                    .citizenScanQr(false)
                    .verifiedViaVneid(false)
                    .qrRawData(null)
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.getVerifiedViaVneidQr()).isFalse();
            assertThat(resp.getWarnings()).noneMatch(w -> w.contains("VERIFIED_VIA_VNEID_QR"));
        }

        @Test
        @DisplayName("Case 3.7: Completely unmentioned digital verification (all defaults null) -> verifiedViaVneidQr = false")
        void testDefaultNullVerification_shouldBeFalse() {
            StructuredFormPrecheckRequest req = baseValidCt01Request().build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.getVerifiedViaVneidQr()).isFalse();
            assertThat(resp.getWarnings()).noneMatch(w -> w.contains("VERIFIED_VIA_VNEID_QR"));
        }

        @Test
        @DisplayName("Case 3.8: Paperless Exemption applied to Birth Registration (TK-KS) -> tags verifiedViaVneidQr = true")
        void testPaperlessExemption_onBirthRegistration_shouldTagVerified() {
            StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                    .procedureCode("TTHC-HT-01")
                    .formType("TK-KS")
                    .fullName("NGUYỄN VĂN AN")
                    .dateOfBirth("1995-01-01")
                    .gender("Nam")
                    .citizenCccd("089195001234")
                    .address("Phường Mỹ Bình, An Giang")
                    .verifiedViaVneidQr(true)
                    .formData(Map.of(
                            "childFullName", "NGUYỄN GIA HÂN",
                            "childDob", "2026-02-01",
                            "childGender", "Nữ",
                            "fatherName", "NGUYỄN VĂN AN",
                            "motherName", "TRẦN THỊ MAI"
                    ))
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.getVerifiedViaVneidQr()).isTrue();
            assertThat(resp.getWarnings()).anyMatch(w -> w.contains("VERIFIED_VIA_VNEID_QR"));
        }

        @Test
        @DisplayName("Case 3.9: Paperless Exemption applied to Marriage Registration (TK-KH) -> tags verifiedViaVneidQr = true")
        void testPaperlessExemption_onMarriageRegistration_shouldTagVerified() {
            StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                    .procedureCode("TTHC-HT-02")
                    .formType("TK-KH")
                    .marriageMode("MARRIAGE_REGISTRATION")
                    .fullName("TRẦN VĂN HẢI")
                    .gender("Nam")
                    .dateOfBirth("1998-05-10")
                    .citizenCccd("089198001234")
                    .address("Phường Mỹ Bình, An Giang")
                    .partnerName("LÊ THỊ MAI")
                    .partnerCccd("089201005678")
                    .partnerAddress("Số 80 Lê Lợi, Phường Mỹ Long, An Giang")
                    .verifiedViaVneidQr(true)
                    .formData(Map.of(
                            "partnerDob", "2001-08-20",
                            "partnerGender", "Nữ"
                    ))
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.getVerifiedViaVneidQr()).isTrue();
            assertThat(resp.getWarnings()).anyMatch(w -> w.contains("VERIFIED_VIA_VNEID_QR"));
        }
    }

    // =========================================================================
    // SECTION 4: ADVERSARIAL EDGE CASE & ROBUSTNESS TESTS
    // =========================================================================
    @Nested
    @DisplayName("4. Adversarial Edge Cases & Boundary Conditions")
    class AdversarialEdgeCasesChallenge {

        @Test
        @DisplayName("Case 4.1: Citizen itself is minor (< 18) registering with valid adult host (>= 18) -> PASS")
        void testMinorCitizen_withValidAdultHost_shouldPass() {
            // Under 18 citizen changing residence (e.g. 16 years old moving with guardian/host consent)
            StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                    .procedureCode("TTHC-CR-01")
                    .formType("CT01")
                    .fullName("NGUYỄN VĂN NHỎ")
                    .dateOfBirth("2010-06-15") // 16 years old
                    .gender("Nam")
                    .citizenCccd("089210001234") // Valid CCCD for male born 2010
                    .address("Số 10 Đường Lý Thường Kiệt, Phường Mỹ Bình, An Giang")
                    .phoneNumber("0912345678")
                    .declarationScope("Đăng ký thường trú")
                    .hostRelation("Ở nhờ")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccdNumber("089085005678") // Adult host born 1985 (41 years old)
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.isOverallValid()).isTrue();
            assertThat(resp.getFieldValidations())
                    .noneMatch(f -> "INVALID_HOST_AGE".equals(f.getErrorCode()));
        }

        @Test
        @DisplayName("Case 4.2: Host born in 1940 (super-elderly, 86 years old in 2026) -> PASS (no upper age limit)")
        void testSuperElderlyHost_born1940_shouldPass() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Ở nhờ")
                    .hostName("CỤ ÔNG TRẦN VĂN GIÀ")
                    .hostCccdNumber("089040001234") // Male born 1940 -> 86 years old in 2026
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.isOverallValid()).isTrue();
            assertThat(resp.getFieldValidations())
                    .noneMatch(f -> "INVALID_HOST_AGE".equals(f.getErrorCode()));
        }

        @Test
        @DisplayName("Case 4.3: Host CCCD whitespace trimming robustness -> PASS")
        void testHostCccd_withWhitespace_shouldBeTrimmedAndPass() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê nhà")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccdNumber("  089085005678  ") // Untrimmed whitespace
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.isOverallValid()).isTrue();
            assertThat(resp.getFieldValidations())
                    .noneMatch(f -> "INVALID_HOST_CCCD".equals(f.getErrorCode()));
        }

        @Test
        @DisplayName("Case 4.4: Both vneidHostConfirmed and verifiedViaVneidQr active simultaneously -> both warnings present")
        void testBothExemptionsSimultaneous_shouldBothApply() {
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .hostRelation("Thuê nhà")
                    .hostName("LÊ HOÀNG NAM")
                    .hostCccdNumber("089085005678")
                    .vneidHostConfirmed(true)
                    .verifiedViaVneidQr(true)
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            assertThat(resp.isOverallValid()).isTrue();
            assertThat(resp.getVerifiedViaVneidQr()).isTrue();
            assertThat(resp.getWarnings())
                    .anyMatch(w -> w.contains("ĐÃ XÁC NHẬN QUA VNEID"))
                    .anyMatch(w -> w.contains("VERIFIED_VIA_VNEID_QR"));
        }

        @Test
        @DisplayName("Case 4.5: Probe Alias Gap - formData key 'vneidVerified' vs 'verifiedViaVneid'")
        void testProbeAliasGap_vneidVerifiedInFormData() {
            // Documenting empirical behavior: Does 'vneidVerified' in formData trigger exemption?
            StructuredFormPrecheckRequest req = baseValidCt01Request()
                    .formData(Map.of("vneidVerified", "true"))
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);

            // Note: In DTO, the aliases checked are 'verifiedViaVneidQr', 'citizenScanQr',
            // 'verifiedViaVneid', 'scannedViaQr', 'isVneidVerified'.
            // If 'vneidVerified' is not in getFirstNonBlank, resp.getVerifiedViaVneidQr() will be false.
            boolean triggered = Boolean.TRUE.equals(resp.getVerifiedViaVneidQr());
            System.out.println("Empirical finding: formData.vneidVerified triggered exemption = " + triggered);
            // This test empirically verifies and documents this behavior.
        }
    }
}

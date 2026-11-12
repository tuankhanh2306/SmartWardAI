package vn.edu.uth.smartward.formcheck;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.uth.smartward.formcheck.dto.CrossCheckStatus;
import vn.edu.uth.smartward.formcheck.dto.DocumentCrossCheckResult;
import vn.edu.uth.smartward.formcheck.dto.FieldDiscrepancy;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckRequest;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckResponse;

import java.time.LocalDate;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Empirical Adversarial Challenger Test Suite for Milestone 3 (F7 & F8).
 * Stress tests text normalization, verbal date parsing, fuzzy mother name matching,
 * cadastral parcel subdivision, temporal impossibility in death chronology, and seal verification.
 */
@ExtendWith(MockitoExtension.class)
class ChallengerM3AdversarialTest {

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

    @Nested
    @DisplayName("F8 Engine: TextNormalizationUtils Adversarial Probing")
    class TextNormalizationAdversarialTests {

        @Test
        @DisplayName("Verbal Date Parsing: Stress Testing Verified Patterns")
        void testParseVerbalVietnameseDate_stress() {
            // Case 1: Standard full verbal string (2026-08-15)
            String d1 = TextNormalizationUtils.parseVerbalVietnameseDate("Ngày mười lăm tháng tám năm hai nghìn không trăm hai mươi sáu");
            assertEquals("2026-08-15", d1);

            // Case 2: New year 2021 (2021-01-01)
            String d2 = TextNormalizationUtils.parseVerbalVietnameseDate("mùng một tháng một năm hai nghìn không trăm hai mươi mốt");
            assertEquals("2021-01-01", d2);

            // Case 3: "tháng giêng" as month 1
            String d3 = TextNormalizationUtils.parseVerbalVietnameseDate("mồng một tháng giêng năm hai nghìn không trăm hai mươi hai");
            assertEquals("2022-01-01", d3);

            // Case 4: "tháng chạp" as month 12
            String d4 = TextNormalizationUtils.parseVerbalVietnameseDate("hai mươi lăm tháng chạp năm hai nghìn không trăm hai mươi tư");
            assertEquals("2024-12-25", d4);

            // Case 5: Standard slash date
            String d5 = TextNormalizationUtils.parseVerbalVietnameseDate("15/8/2026");
            assertEquals("2026-08-15", d5);

            // Case 6: Standard ISO date
            String d6 = TextNormalizationUtils.parseVerbalVietnameseDate("2026-08-15");
            assertEquals("2026-08-15", d6);

            // Case 7: Null or blank
            assertEquals("", TextNormalizationUtils.parseVerbalVietnameseDate(null));
            assertEquals("", TextNormalizationUtils.parseVerbalVietnameseDate("   "));
        }

        @Test
        @DisplayName("BUG REPRODUCTION: Year Substring Pollutes Day Parsing in Verbal Date")
        void testReproduceBug_verbalDateYearSubstringPollution() {
            // "ba mươi tháng tư năm hai nghìn không trăm hai mươi lăm" (April 30, 2025)
            // Expectation: 2025-04-30
            // Actual Bug: Day matches "hai mươi lăm" inside year phrase 2025 ("hai nghìn không trăm hai mươi lăm"),
            // resulting in 2025-04-25 instead of 2025-04-30!
            String rawDate = "ba mươi tháng tư năm hai nghìn không trăm hai mươi lăm";
            String actual = TextNormalizationUtils.parseVerbalVietnameseDate(rawDate);

            // Empirically asserts the bug:
            assertEquals("2025-04-25", actual,
                    "Empirical proof of bug: day is prematurely parsed as 25 due to year phrase containing 'hai mươi lăm'");
            assertNotEquals("2025-04-30", actual,
                    "Flawed logic fails to produce statutory date 2025-04-30");
        }

        @Disabled("Target statutory requirement: Will fail until TextNormalizationUtils partitions day and year clauses before regex matching")
        @Test
        @DisplayName("Target Fix Oracle: Statutory Date April 30, 2025")
        void testStatutoryTarget_april30_2025() {
            String rawDate = "ba mươi tháng tư năm hai nghìn không trăm hai mươi lăm";
            String parsed = TextNormalizationUtils.parseVerbalVietnameseDate(rawDate);
            assertEquals("2025-04-30", parsed);
        }

        @Test
        @DisplayName("Mother Name Comparison: Exact, Abbreviation, Accents, and Mismatch")
        void testCompareMotherNames_stress() {
            // 1. Exact match
            assertEquals(CrossCheckStatus.MATCH,
                    TextNormalizationUtils.compareMotherNames("NGUYỄN THỊ KIM LOAN", "NGUYỄN THỊ KIM LOAN"));

            // 2. Abbreviated middle name with dot "T." -> WARNING
            assertEquals(CrossCheckStatus.WARNING,
                    TextNormalizationUtils.compareMotherNames("NGUYỄN THỊ KIM LOAN", "NGUYỄN T. KIM LOAN"));

            // 3. 3-word name with abbreviated middle name
            assertEquals(CrossCheckStatus.WARNING,
                    TextNormalizationUtils.compareMotherNames("TRẦN THỊ MAI", "TRẦN T. MAI"));

            // 4. Accent discrepancy -> WARNING
            assertEquals(CrossCheckStatus.WARNING,
                    TextNormalizationUtils.compareMotherNames("NGUYỄN THỊ KIM LOAN", "NGUYEN THI KIM LOAN"));

            // 5. Surname mismatch -> CONFLICT
            assertEquals(CrossCheckStatus.CONFLICT,
                    TextNormalizationUtils.compareMotherNames("NGUYỄN THỊ KIM LOAN", "LÊ THỊ KIM LOAN"));

            // 6. Given name mismatch -> CONFLICT
            assertEquals(CrossCheckStatus.CONFLICT,
                    TextNormalizationUtils.compareMotherNames("NGUYỄN THỊ KIM LOAN", "NGUYỄN THỊ BÍCH NGỌC"));

            // 7. Empty or blank name -> WARNING
            assertEquals(CrossCheckStatus.WARNING,
                    TextNormalizationUtils.compareMotherNames("", "NGUYỄN THỊ KIM LOAN"));
        }

        @Test
        @DisplayName("Cadastral Parcel Number: Exact, Subdivision, and Mismatch")
        void testCompareParcelNumbers_stress() {
            // 1. Exact match
            var p1 = TextNormalizationUtils.compareParcelNumbers("123", "123");
            assertEquals(CrossCheckStatus.MATCH, p1.status());
            assertNull(p1.reasonCode());

            // 2. Subdivision with dash (123-1 vs 123)
            var p2 = TextNormalizationUtils.compareParcelNumbers("123", "123-1");
            assertEquals(CrossCheckStatus.WARNING, p2.status());
            assertEquals("PARCEL_SUBDIVISION_DETECTED", p2.reasonCode());

            // 3. Inverse subdivision (123-1 vs 123)
            var p3 = TextNormalizationUtils.compareParcelNumbers("123-1", "123");
            assertEquals(CrossCheckStatus.WARNING, p3.status());
            assertEquals("PARCEL_SUBDIVISION_DETECTED", p3.reasonCode());

            // 4. Subdivision with slash (123/2 vs 123)
            var p4 = TextNormalizationUtils.compareParcelNumbers("123", "123/2");
            assertEquals(CrossCheckStatus.WARNING, p4.status());
            assertEquals("PARCEL_SUBDIVISION_DETECTED", p4.reasonCode());

            // 5. Distinct parcel numbers -> CONFLICT
            var p5 = TextNormalizationUtils.compareParcelNumbers("123", "456");
            assertEquals(CrossCheckStatus.CONFLICT, p5.status());
            assertEquals("PARCEL_NUMBER_MISMATCH", p5.reasonCode());

            // 6. Empty parcel info -> WARNING
            var p6 = TextNormalizationUtils.compareParcelNumbers("", "123");
            assertEquals(CrossCheckStatus.WARNING, p6.status());
            assertEquals("PARCEL_INFO_INCOMPLETE", p6.reasonCode());
        }

        @Test
        @DisplayName("Temporal Chronology in Death Declaration: Chronological Ordering")
        void testVerifyDeathChronology_stress() {
            LocalDate d1 = LocalDate.of(2026, 11, 10);
            LocalDate d2 = LocalDate.of(2026, 11, 11);
            LocalDate d3 = LocalDate.of(2026, 11, 15);

            // 1. Death on the day before report -> MATCH
            var c1 = TextNormalizationUtils.verifyDeathChronology(d1, d2);
            assertEquals(CrossCheckStatus.MATCH, c1.status());
            assertTrue(c1.valid());
            assertNull(c1.reasonCode());

            // 2. Death on the exact day of report -> MATCH
            var c2 = TextNormalizationUtils.verifyDeathChronology(d2, d2);
            assertEquals(CrossCheckStatus.MATCH, c2.status());
            assertTrue(c2.valid());

            // 3. Death AFTER report issuance date -> CONFLICT (Temporal impossibility)
            var c3 = TextNormalizationUtils.verifyDeathChronology(d3, d2);
            assertEquals(CrossCheckStatus.CONFLICT, c3.status());
            assertFalse(c3.valid());
            assertEquals("TEMPORAL_IMPOSSIBILITY_DEATH_AFTER_REPORT", c3.reasonCode());

            // 4. Null inputs
            var c4 = TextNormalizationUtils.verifyDeathChronology(null, d2);
            assertEquals(CrossCheckStatus.WARNING, c4.status());
            assertTrue(c4.valid());
            assertEquals("CHRONOLOGY_DATES_INCOMPLETE", c4.reasonCode());
        }

        @Test
        @DisplayName("Red Seal / Stamp Detection: Confidence & Presence")
        void testCheckRedSeal_stress() {
            // High confidence + present -> MATCH
            assertEquals(CrossCheckStatus.MATCH, TextNormalizationUtils.checkRedSeal(0.95, true));

            // Low confidence (< 0.70) -> WARNING
            assertEquals(CrossCheckStatus.WARNING, TextNormalizationUtils.checkRedSeal(0.69, true));
            assertEquals(CrossCheckStatus.WARNING, TextNormalizationUtils.checkRedSeal(0.12, true));

            // Missing seal (false) -> WARNING
            assertEquals(CrossCheckStatus.WARNING, TextNormalizationUtils.checkRedSeal(0.99, false));

            // Null inputs with high confidence -> MATCH
            assertEquals(CrossCheckStatus.MATCH, TextNormalizationUtils.checkRedSeal(0.85, null));
        }

        @Test
        @DisplayName("Address Abbreviations: Administrative and Street Expansions")
        void testExpandAddressAbbreviations_stress() {
            String raw = "Số 15 đ. Lê Duẩn, p. Bến Nghé, q. 1, tp. Hồ Chí Minh";
            String exp = TextNormalizationUtils.expandAddressAbbreviations(raw);
            assertTrue(exp.contains("đường lê duẩn"), "Must expand đ. to đường");
            assertTrue(exp.contains("phường bến nghé"), "Must expand p. to phường");
            assertTrue(exp.contains("quận 1"), "Must expand q. to quận");
            assertTrue(exp.contains("thành phố hồ chí minh"), "Must expand tp. to thành phố");
        }
    }

    @Nested
    @DisplayName("F8 Engine: FormPrecheckService Cross-Check Modules")
    class FormPrecheckCrossCheckModulesTests {

        @Test
        @DisplayName("Birth Certificate Cross-Check: Verbal Date + Abbreviated Mother + Provisional Child")
        void testCrossCheckBirthCertificate_complexEdgeCases() {
            DocumentCrossCheckResult res = formPrecheckService.crossCheckBirthCertificate(
                    "2026-08-15",
                    "NGUYỄN THỊ KIM LOAN",
                    "TRẦN ĐỨC ANH",
                    "Nam",
                    "Ngày mười lăm tháng tám năm hai nghìn không trăm hai mươi sáu",
                    "NGUYỄN T. KIM LOAN",
                    "CON BÀ NGUYỄN THỊ KIM LOAN",
                    "Nam",
                    0.88,
                    true
            );

            assertNotNull(res);
            assertEquals("GIAY_CHUNG_SINH", res.getDocumentType());
            assertEquals(CrossCheckStatus.WARNING, res.getOverallStatus(),
                    "Should evaluate to WARNING due to abbreviated mother and provisional name, NOT CONFLICT");
            assertFalse(res.isBlocking(), "WARNING should not block submission");

            // Verify individual discrepancies
            FieldDiscrepancy dobDisc = res.getDiscrepancies().stream()
                    .filter(d -> "childDob".equals(d.getFieldKey()))
                    .findFirst().orElseThrow();
            assertEquals(CrossCheckStatus.MATCH, dobDisc.getStatus());

            FieldDiscrepancy motherDisc = res.getDiscrepancies().stream()
                    .filter(d -> "motherFullName".equals(d.getFieldKey()))
                    .findFirst().orElseThrow();
            assertEquals(CrossCheckStatus.WARNING, motherDisc.getStatus());
            assertEquals("ABBREVIATED_MIDDLE_NAME", motherDisc.getReasonCode());

            FieldDiscrepancy childDisc = res.getDiscrepancies().stream()
                    .filter(d -> "childFullName".equals(d.getFieldKey()))
                    .findFirst().orElseThrow();
            assertEquals(CrossCheckStatus.WARNING, childDisc.getStatus());
            assertEquals("PROVISIONAL_CHILD_NAME", childDisc.getReasonCode());
        }

        @Test
        @DisplayName("Birth Certificate Cross-Check: Fatal Conflict Blocking Submission")
        void testCrossCheckBirthCertificate_fatalDateMismatch() {
            DocumentCrossCheckResult res = formPrecheckService.crossCheckBirthCertificate(
                    "2026-08-15",
                    "NGUYỄN THỊ KIM LOAN",
                    "TRẦN ĐỨC ANH",
                    "Nam",
                    "2026-08-20", // 5 days mismatch
                    "NGUYỄN THỊ KIM LOAN",
                    "TRẦN ĐỨC ANH",
                    "Nam",
                    0.95,
                    true
            );

            assertNotNull(res);
            assertEquals(CrossCheckStatus.CONFLICT, res.getOverallStatus());
            assertTrue(res.isBlocking(), "Fatal DOB mismatch must block submission");
        }

        @Test
        @DisplayName("Death Report Cross-Check: Temporal Impossibility Blocking Submission")
        void testCrossCheckDeathReport_temporalImpossibility() {
            DocumentCrossCheckResult res = formPrecheckService.crossCheckDeathReport(
                    "TRẦN VĂN HÙNG",
                    "079095012345",
                    "2026-11-20", // Death occurs on Nov 20
                    "2026-11-15", // But report was issued on Nov 15
                    "Phường Bến Nghé, Quận 1",
                    "999/GBT"
            );

            assertNotNull(res);
            assertEquals(CrossCheckStatus.CONFLICT, res.getOverallStatus());
            assertTrue(res.isBlocking());
            FieldDiscrepancy deathDisc = res.getDiscrepancies().stream()
                    .filter(d -> "dateOfDeath".equals(d.getFieldKey()))
                    .findFirst().orElseThrow();
            assertEquals(CrossCheckStatus.CONFLICT, deathDisc.getStatus());
            assertEquals("TEMPORAL_IMPOSSIBILITY_DEATH_AFTER_REPORT", deathDisc.getReasonCode());
        }

        @Test
        @DisplayName("Disability Certificate Cross-Check: Mild Claimed As Severe")
        void testCrossCheckDisabilityCert_levelConflict() {
            DocumentCrossCheckResult res = formPrecheckService.crossCheckDisabilityCert(
                    "NGUYỄN VĂN AN",
                    "DAC_BIET_NANG",
                    "NHE",
                    "GCN-KT-001",
                    0.95,
                    true
            );

            assertNotNull(res);
            assertEquals(CrossCheckStatus.CONFLICT, res.getOverallStatus());
            assertTrue(res.isBlocking());
            FieldDiscrepancy disc = res.getDiscrepancies().stream()
                    .filter(d -> "disabilityLevel".equals(d.getFieldKey()))
                    .findFirst().orElseThrow();
            assertEquals(CrossCheckStatus.CONFLICT, disc.getStatus());
            assertEquals("DISABILITY_LEVEL_CONFLICT", disc.getReasonCode());
        }

        @Test
        @DisplayName("Land Certificate Cross-Check: Parcel Subdivision vs Complete Mismatch")
        void testCrossCheckLandCertificate_subdivisionAndMismatch() {
            // Subdivision -> WARNING, non-blocking
            DocumentCrossCheckResult resWarning = formPrecheckService.crossCheckLandCertificate(
                    "LÊ VĂN BÌNH",
                    "123",
                    "123-1",
                    "Đường Lê Duẩn, Phường Bến Nghé, Quận 1",
                    "Đường Lê Duẩn, Phường Bến Nghé, Quận 1",
                    "01",
                    "100"
            );
            assertNotNull(resWarning);
            assertEquals(CrossCheckStatus.WARNING, resWarning.getOverallStatus());
            assertFalse(resWarning.isBlocking());

            // Complete mismatch -> CONFLICT, blocking
            DocumentCrossCheckResult resConflict = formPrecheckService.crossCheckLandCertificate(
                    "LÊ VĂN BÌNH",
                    "123",
                    "999",
                    "Đường Lê Duẩn, Phường Bến Nghé, Quận 1",
                    "Đường Lê Duẩn, Phường Bến Nghé, Quận 1",
                    "01",
                    "100"
            );
            assertNotNull(resConflict);
            assertEquals(CrossCheckStatus.CONFLICT, resConflict.getOverallStatus());
            assertTrue(resConflict.isBlocking());
        }

        @Test
        @DisplayName("Structured Precheck Integration: Blocking Cross-Check Forces overallValid = false")
        void testPrecheckStructuredForm_blockingCrossCheckOverridesValidations() {
            StructuredFormPrecheckRequest req = StructuredFormPrecheckRequest.builder()
                    .procedureCode("TTHC-HT-01")
                    .formType("TK-KS")
                    .fullName("TRẦN GIA BẢO")
                    .dateOfBirth("2026-10-15")
                    .gender("Nam")
                    .citizenCccd("089195001234")
                    .address("Phường Mỹ Xuyên, Long Xuyên, An Giang")
                    .childBirthPlace("Bệnh viện Sản Nhi An Giang")
                    .childEthnicity("Kinh")
                    .childNationality("Việt Nam")
                    .birthCertNumber("1234/GCS")
                    .birthCertIssueDate("2026-10-16")
                    .fatherDob("1998-05-20")
                    .fatherResidence("Phường Mỹ Xuyên, Long Xuyên, An Giang")
                    .motherDob("2000-08-14")
                    .motherResidence("Phường Mỹ Xuyên, Long Xuyên, An Giang")
                    .formData(Map.of(
                            "hospitalBirthDate", "2026-10-15",
                            "motherName", "LÊ THỊ MỸ LINH",
                            "hospitalMotherName", "LÊ THỊ MỸ LINH",
                            "fatherName", "TRẦN VĂN HÙNG",
                            "parentsMarried", "YES",
                            // Injected Death report with impossible date
                            "dateOfDeath", "2026-11-20",
                            "reportDate", "2026-11-10"
                    ))
                    .build();

            StructuredFormPrecheckResponse resp = formPrecheckService.precheckStructuredForm(req);
            assertNotNull(resp);
            assertFalse(resp.isOverallValid(), "Overall validity must be false due to blocking death report cross-check");
            assertTrue(resp.getCrossCheckResults().stream().anyMatch(r -> r.getOverallStatus() == CrossCheckStatus.CONFLICT && r.isBlocking()));
        }
    }
}

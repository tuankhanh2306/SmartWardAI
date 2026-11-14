package vn.edu.uth.smartward.challenge;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.formcheck.CccdValidator;
import vn.edu.uth.smartward.formcheck.DateLogicValidator;
import vn.edu.uth.smartward.formcheck.dto.FormValidationIssue;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Empirical Challenge Harness for Milestone 2 by Challenger 1.
 * 
 * Directly tests and stress-tests:
 * 1. DateLogicValidator strictness:
 *    - Leap year boundaries (29/02 in 2024, 2020, 2000 vs 2023, 2021, 1900).
 *    - Invalid calendar dates (31/04, 31/06, 31/09, 31/11, 00/01, 32/01, 15/13).
 *    - Year < 1900 enforcement (31/12/1899, 01/01/1800 vs 01/01/1900).
 *    - Cross-format strictness (dd/MM/uuuu vs uuuu-MM-dd).
 * 2. CccdValidator warning logic:
 *    - Malformed birthDateStr strings ("invalid-date", "abc", "2024/02", "not-a-date").
 *    - Confirms CANNOT_VERIFY_CCCD_YEAR_GENDER warning emitted with WARNING severity.
 *    - Confirms no silent bypass when date is corrupt.
 *    - Verifies behavior when birthDateStr is null/blank vs valid.
 * 3. Multi-locality QueryCache key uniqueness:
 *    - Multi-locality permutations across queries, wards, and categories.
 *    - Empirical collision testing on 1,000 distinct tuples.
 *    - Whitespace, case, and punctuation normalization invariance.
 *    - Idempotency when key already carries cache prefix.
 */
@ExtendWith(MockitoExtension.class)
public class Milestone2Challenger1EmpiricalTest {

    // =========================================================================
    // 1. DATE LOGIC VALIDATOR EMPIRICAL STRESS TESTS
    // =========================================================================
    @Nested
    @DisplayName("Challenge 1: DateLogicValidator Strictness & Calendar Boundaries")
    class DateLogicValidatorStressChallenge {

        private DateLogicValidator validator;

        @BeforeEach
        void setUp() {
            validator = new DateLogicValidator();
        }

        @Test
        @DisplayName("1.1 Invalid calendar day: 31/04/2024 (April only has 30 days) must be rejected")
        void testInvalidDayApril31() {
            List<FormValidationIssue> issues = validator.validate("31/04/2024", "20/09/2024");
            assertThat(issues).isNotEmpty();
            assertThat(issues).anyMatch(issue ->
                    "birthDate".equals(issue.getField()) &&
                    "INVALID_DATE_FORMAT".equals(issue.getErrorType()) &&
                    "ERROR".equals(issue.getSeverity())
            );
        }

        @Test
        @DisplayName("1.2 Non-leap year: 29/02/2023 must be rejected")
        void testNonLeapYearFeb29_2023() {
            List<FormValidationIssue> issues = validator.validate("29/02/2023", "20/09/2023");
            assertThat(issues).isNotEmpty();
            assertThat(issues).anyMatch(issue ->
                    "birthDate".equals(issue.getField()) &&
                    "INVALID_DATE_FORMAT".equals(issue.getErrorType()) &&
                    "ERROR".equals(issue.getSeverity())
            );
        }

        @Test
        @DisplayName("1.3 Valid leap years: 29/02/2024 and 29/02/2000 must pass date parsing")
        void testValidLeapYears() {
            // 29/02/2000 born, issued 15/03/2015 (age 15 >= 14) -> valid
            List<FormValidationIssue> issues2000 = validator.validate("29/02/2000", "15/03/2015");
            assertThat(issues2000).isEmpty();

            // 29/02/2004 born, issued 15/03/2020 (age 16 >= 14) -> valid
            List<FormValidationIssue> issues2004 = validator.validate("29/02/2004", "15/03/2020");
            assertThat(issues2004).isEmpty();
        }

        @Test
        @DisplayName("1.4 Century non-leap year: 29/02/1900 is NOT a leap year (divisible by 100 but not 400)")
        void testCenturyNonLeapYear1900() {
            List<FormValidationIssue> issues = validator.validate("29/02/1900", "15/03/1920");
            assertThat(issues).isNotEmpty();
            assertThat(issues).anyMatch(issue ->
                    "birthDate".equals(issue.getField()) &&
                    "INVALID_DATE_FORMAT".equals(issue.getErrorType())
            );
        }

        @Test
        @DisplayName("1.5 Day zero: 00/01/2000 must be rejected")
        void testDayZero() {
            List<FormValidationIssue> issues = validator.validate("00/01/2000", "15/03/2020");
            assertThat(issues).isNotEmpty();
            assertThat(issues).anyMatch(issue ->
                    "birthDate".equals(issue.getField()) &&
                    "INVALID_DATE_FORMAT".equals(issue.getErrorType())
            );
        }

        @Test
        @DisplayName("1.6 Day 32: 32/01/2000 must be rejected")
        void testDay32() {
            List<FormValidationIssue> issues = validator.validate("32/01/2000", "15/03/2020");
            assertThat(issues).isNotEmpty();
            assertThat(issues).anyMatch(issue ->
                    "birthDate".equals(issue.getField()) &&
                    "INVALID_DATE_FORMAT".equals(issue.getErrorType())
            );
        }

        @Test
        @DisplayName("1.7 Month 00 and Month 13 must be rejected")
        void testInvalidMonths() {
            List<FormValidationIssue> issuesM0 = validator.validate("15/00/2000", "15/03/2020");
            assertThat(issuesM0).isNotEmpty();

            List<FormValidationIssue> issuesM13 = validator.validate("15/13/2000", "15/03/2020");
            assertThat(issuesM13).isNotEmpty();
        }

        @Test
        @DisplayName("1.8 All 30-day months: 31st day must be rejected (April, June, September, November)")
        void testThirtyDayMonths() {
            String[] thirtyDayMonths = {"31/04/2020", "31/06/2020", "31/09/2020", "31/11/2020"};
            for (String invalidDate : thirtyDayMonths) {
                List<FormValidationIssue> issues = validator.validate(invalidDate, "15/03/2022");
                assertThat(issues)
                        .as("Date %s should be rejected by strict parser", invalidDate)
                        .anyMatch(issue -> "INVALID_DATE_FORMAT".equals(issue.getErrorType()));
            }
        }

        @Test
        @DisplayName("1.9 Year < 1900: 31/12/1899 parses as calendar date but fails business rule with INVALID_DATE_LOGIC")
        void testBirthYearBefore1900_1899() {
            List<FormValidationIssue> issues = validator.validate("31/12/1899", "15/03/1920");
            assertThat(issues).hasSize(1);
            FormValidationIssue issue = issues.get(0);
            assertThat(issue.getField()).isEqualTo("birthDate");
            assertThat(issue.getErrorType()).isEqualTo("INVALID_DATE_LOGIC");
            assertThat(issue.getSeverity()).isEqualTo("ERROR");
            assertThat(issue.getMessage()).contains("1899").contains("1900");
        }

        @Test
        @DisplayName("1.10 Year < 1900: Ancient year 01/01/1800 must return INVALID_DATE_LOGIC")
        void testBirthYearAncient1800() {
            List<FormValidationIssue> issues = validator.validate("01/01/1800", "15/03/1920");
            assertThat(issues).hasSize(1);
            assertThat(issues.get(0).getErrorType()).isEqualTo("INVALID_DATE_LOGIC");
            assertThat(issues.get(0).getMessage()).contains("1800");
        }

        @Test
        @DisplayName("1.11 Boundary year 1900: 01/01/1900 is NOT < 1900 and must pass if issue date is valid")
        void testBirthYearBoundary1900() {
            // 01/01/1900 born, issued 15/03/1920 (age 20 >= 14)
            List<FormValidationIssue> issues = validator.validate("01/01/1900", "15/03/1920");
            assertThat(issues).isEmpty();
        }

        @Test
        @DisplayName("1.12 ISO Format (uuuu-MM-dd) strictness: 2023-02-29 and 2024-04-31 must be rejected")
        void testIsoFormatStrictness() {
            List<FormValidationIssue> issuesFeb29 = validator.validate("2023-02-29", "2023-09-20");
            assertThat(issuesFeb29).isNotEmpty();
            assertThat(issuesFeb29.get(0).getErrorType()).isEqualTo("INVALID_DATE_FORMAT");

            List<FormValidationIssue> issuesApr31 = validator.validate("2024-04-31", "2024-09-20");
            assertThat(issuesApr31).isNotEmpty();
            assertThat(issuesApr31.get(0).getErrorType()).isEqualTo("INVALID_DATE_FORMAT");

            // Valid ISO format
            List<FormValidationIssue> validIso = validator.validate("1995-08-15", "2021-09-20");
            assertThat(validIso).isEmpty();
        }

        @Test
        @DisplayName("1.13 Issue date validation: Future date, issue before birth, age < 14 must return INVALID_DATE_LOGIC")
        void testIssueDateLogicRules() {
            // Future issue date
            List<FormValidationIssue> future = validator.validate("15/08/1995", "01/01/2099");
            assertThat(future).anyMatch(i -> "INVALID_DATE_LOGIC".equals(i.getErrorType()) && i.getMessage().contains("tương lai"));

            // Issue date before birth date
            List<FormValidationIssue> beforeBirth = validator.validate("15/08/2005", "10/05/2000");
            assertThat(beforeBirth).anyMatch(i -> "INVALID_DATE_LOGIC".equals(i.getErrorType()) && i.getMessage().contains("trước ngày sinh"));

            // Age < 14 at issuance
            List<FormValidationIssue> under14 = validator.validate("15/08/2010", "15/08/2023");
            assertThat(under14).anyMatch(i -> "INVALID_DATE_LOGIC".equals(i.getErrorType()) && i.getMessage().contains("chưa đủ 14 tuổi"));
        }
    }

    // =========================================================================
    // 2. CCCD VALIDATOR WARNING & INTEGRITY EMPIRICAL TESTS
    // =========================================================================
    @Nested
    @DisplayName("Challenge 2: CccdValidator Warning on Malformed Birth Dates")
    class CccdValidatorWarningChallenge {

        private CccdValidator cccdValidator;

        @BeforeEach
        void setUp() {
            cccdValidator = new CccdValidator();
        }

        @Test
        @DisplayName("2.1 Malformed birthDateStr 'invalid-date' triggers CANNOT_VERIFY_CCCD_YEAR_GENDER warning")
        void testMalformedBirthDate_InvalidString() {
            // Valid An Giang CCCD: 089 (An Giang), 0 (Male born 1900-1999), 95 (1995), 000123
            String cccd = "089095000123";
            List<FormValidationIssue> issues = cccdValidator.validate(cccd, "invalid-date", "Nam");

            assertThat(issues).isNotEmpty();
            assertThat(issues).hasSize(1);
            FormValidationIssue warning = issues.get(0);
            assertThat(warning.getField()).isEqualTo("cccdNumber");
            assertThat(warning.getErrorType()).isEqualTo("CANNOT_VERIFY_CCCD_YEAR_GENDER");
            assertThat(warning.getSeverity()).isEqualTo("WARNING");
            assertThat(warning.getMessage()).contains("Không thể đối soát năm sinh/giới tính");
        }

        @Test
        @DisplayName("2.2 Various corrupt date strings without 4-digit year must consistently emit WARNING, never silently pass")
        void testVariousCorruptDateStrings() {
            String cccd = "089095000123";
            String[] corruptDates = {
                    "invalid-date",
                    "not-a-date",
                    "abc",
                    "2024/02",
                    "99-99-99",
                    "dd/mm/yyyy",
                    "31-12-yy",
                    "12345"
            };

            for (String corruptDate : corruptDates) {
                List<FormValidationIssue> issues = cccdValidator.validate(cccd, corruptDate, "Nam");
                assertThat(issues)
                        .as("Corrupt birth date '%s' where year is unparseable must produce CANNOT_VERIFY_CCCD_YEAR_GENDER warning", corruptDate)
                        .anyMatch(issue ->
                                "CANNOT_VERIFY_CCCD_YEAR_GENDER".equals(issue.getErrorType()) &&
                                "WARNING".equals(issue.getSeverity())
                        );
            }
        }

        @Test
        @DisplayName("2.3 Null or empty birthDateStr does NOT emit CANNOT_VERIFY warning (field was not provided)")
        void testNullOrBlankBirthDateStr() {
            String cccd = "089095000123";
            List<FormValidationIssue> nullIssues = cccdValidator.validate(cccd, null, "Nam");
            assertThat(nullIssues).isEmpty();

            List<FormValidationIssue> blankIssues = cccdValidator.validate(cccd, "   ", "Nam");
            assertThat(blankIssues).isEmpty();
        }

        @Test
        @DisplayName("2.4 Valid birthDateStr with genuine year/gender mismatch returns ERROR (not WARNING)")
        void testGenuineMismatchReturnsError() {
            // CCCD has year '95' (1995), but birth date declared 15/08/1996
            String cccd = "089095000123";
            List<FormValidationIssue> yearMismatch = cccdValidator.validate(cccd, "15/08/1996", "Nam");
            assertThat(yearMismatch).isNotEmpty();
            assertThat(yearMismatch).anyMatch(i ->
                    "INVALID_CCCD_YEAR".equals(i.getErrorType()) &&
                    "ERROR".equals(i.getSeverity())
            );

            // CCCD has gender digit '0' (Male 20th century), but declared 'Nữ'
            List<FormValidationIssue> genderMismatch = cccdValidator.validate(cccd, "15/08/1995", "Nữ");
            assertThat(genderMismatch).isNotEmpty();
            assertThat(genderMismatch).anyMatch(i ->
                    "INVALID_CCCD_CENTURY_GENDER".equals(i.getErrorType()) &&
                    "ERROR".equals(i.getSeverity())
            );
        }

        @Test
        @DisplayName("2.5 Invalid CCCD structure: Blank, wrong length, bad province must be flagged as ERROR")
        void testCccdStructuralErrors() {
            // Missing
            assertThat(cccdValidator.validate("", "15/08/1995", "Nam"))
                    .anyMatch(i -> "MISSING_MANDATORY_FIELD".equals(i.getErrorType()));

            // Invalid length (11 digits)
            assertThat(cccdValidator.validate("08909500012", "15/08/1995", "Nam"))
                    .anyMatch(i -> "INVALID_CCCD_LENGTH".equals(i.getErrorType()));

            // Invalid province (999)
            assertThat(cccdValidator.validate("999095000123", "15/08/1995", "Nam"))
                    .anyMatch(i -> "INVALID_CCCD_PROVINCE".equals(i.getErrorType()));
        }
    }

    // =========================================================================
    // 3. MULTI-LOCALITY QUERY CACHE KEY EMPIRICAL TESTS
    // =========================================================================
    @Nested
    @DisplayName("Challenge 3: Multi-locality QueryCache Key Uniqueness & Normalization")
    class MultiLocalityQueryCacheKeyChallenge {

        @Mock
        private StringRedisTemplate stringRedisTemplate;

        private QueryCacheService cacheService;
        private final ObjectMapper objectMapper = new ObjectMapper();

        @BeforeEach
        void setUp() {
            cacheService = new QueryCacheService(stringRedisTemplate, objectMapper);
        }

        @Test
        @DisplayName("3.1 Key uniqueness across queries, wards, and categories")
        void testKeyUniquenessAcrossDimensions() {
            String q1 = "Thủ tục đăng ký khai sinh";
            String q2 = "Thủ tục cấp bản sao khai sinh";
            String w1 = "Phường Mỹ Long";
            String w2 = "Phường Mỹ Bình";
            String c1 = "Hộ tịch";
            String c2 = "Bảo trợ xã hội";

            String keyBase = cacheService.buildCacheKey(q1, w1, c1);
            String keyDiffQuery = cacheService.buildCacheKey(q2, w1, c1);
            String keyDiffWard = cacheService.buildCacheKey(q1, w2, c1);
            String keyDiffCategory = cacheService.buildCacheKey(q1, w1, c2);

            assertThat(keyBase).isNotEqualTo(keyDiffQuery);
            assertThat(keyBase).isNotEqualTo(keyDiffWard);
            assertThat(keyBase).isNotEqualTo(keyDiffCategory);
            assertThat(keyDiffWard).isNotEqualTo(keyDiffCategory);
        }

        @Test
        @DisplayName("3.2 Stress test: 1,000 distinct (query, ward, category) permutations produce 1,000 distinct keys (0 collisions)")
        void testMassiveKeyCollisionResistance() {
            Set<String> generatedKeys = new HashSet<>();
            int totalCombinations = 0;

            String[] queries = {
                    "Làm giấy khai sinh", "Thủ tục kết hôn", "Cấp căn cước công dân",
                    "Xác nhận tình trạng hôn nhân", "Đăng ký thường trú CT01", "Khai báo tạm vắng",
                    "Đăng ký biến động đất đai", "Trợ cấp hưu trí xã hội", "Hỗ trợ mai táng",
                    "Chứng thực bản sao điện tử"
            };

            String[] wards = {
                    "Phường Mỹ Long", "Phường Mỹ Bình", "Phường Mỹ Xuyên", "Phường Bình Đức",
                    "Phường Bình Khánh", "Phường Đông Xuyên", "Phường Mỹ Hòa", "Xã Mỹ Khánh",
                    "Xã Mỹ Hòa Hưng", "Phường Châu Phú A"
            };

            String[] categories = {
                    "Hộ tịch", "Cư trú", "Đất đai", "Bảo trợ xã hội", "Chứng thực",
                    "Tư pháp", "Lao động thương binh", "Môi trường", "Xây dựng", "Một cửa liên thông"
            };

            for (String q : queries) {
                for (String w : wards) {
                    for (String c : categories) {
                        String key = cacheService.buildCacheKey(q, w, c);
                        assertThat(key).startsWith("smartward:cache:rag:");
                        generatedKeys.add(key);
                        totalCombinations++;
                    }
                }
            }

            assertThat(totalCombinations).isEqualTo(1000);
            assertThat(generatedKeys).hasSize(1000);
        }

        @Test
        @DisplayName("3.3 Normalization invariance: Punctuation, excessive whitespace, and casing do not fragment cache")
        void testNormalizationInvariance() {
            String keyCanonical = cacheService.buildCacheKey("Thủ tục khai sinh", "Phường Mỹ Long", "Hộ tịch");
            String keyDirty = cacheService.buildCacheKey(
                    "  Thủ tục khai sinh???  ",
                    "PHƯỜNG   MỸ   LONG!  ",
                    "  hộ tịch...  "
            );

            assertThat(keyDirty).isEqualTo(keyCanonical);
        }

        @Test
        @DisplayName("3.4 Idempotency: Pre-fixed cache key is returned verbatim without double-hashing")
        void testPrefixedKeyIdempotency() {
            String existingKey = "smartward:cache:rag:a1b2c3d4e5f67890";
            String result = cacheService.buildCacheKey(existingKey);
            assertThat(result).isEqualTo(existingKey);
        }

        @Test
        @DisplayName("3.5 Null and blank locality parameters safely fall back to query-only hash")
        void testNullLocalityFallback() {
            String query = "Thủ tục cấp trích lục kết hôn";
            String keySingle = cacheService.buildCacheKey(query);
            String keyNulls = cacheService.buildCacheKey(query, null, null);
            String keyBlanks = cacheService.buildCacheKey(query, "   ", "   ");

            assertThat(keyNulls).isEqualTo(keySingle);
            assertThat(keyBlanks).isEqualTo(keySingle);
        }
    }
}

package vn.edu.uth.smartward.challenge;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.uth.smartward.common.QueryCacheService;
import vn.edu.uth.smartward.formcheck.CccdValidator;
import vn.edu.uth.smartward.formcheck.DateLogicValidator;
import vn.edu.uth.smartward.formcheck.dto.FormValidationIssue;
import vn.edu.uth.smartward.rag.AdminProcedure;
import vn.edu.uth.smartward.rag.AdminProcedureRepository;
import vn.edu.uth.smartward.rag.LegalChunkRepository;
import vn.edu.uth.smartward.rag.ProcedureService;
import vn.edu.uth.smartward.rag.VietnameseTextNormalizer;
import vn.edu.uth.smartward.rag.dto.ProcedureDto;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Challenger 2 Empirical Stress Test Suite for Milestone 2 Gate.
 * 
 * Target Verifications:
 * 1. DateLogicValidator: Leap years, non-leap years, strict resolver, boundary year 1900, year < 1900.
 * 2. CccdValidator: Birth year null vs present, warning CANNOT_VERIFY_CCCD_YEAR_GENDER, invalid 12-digit patterns.
 * 3. QueryCacheService: Multi-locality cache collision resistance across queries, wards, categories.
 * 4. LegalChunkRepository & ProcedureService: N+1 query elimination verification under scale.
 * 5. VietnameseTextNormalizer: High-concurrency thread-safety, correctness, and throughput benchmark.
 */
@ExtendWith(MockitoExtension.class)
public class Milestone2Challenger2EmpiricalTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    // =========================================================================
    // 1. DATE LOGIC VALIDATOR EMPIRICAL STRESS TESTS
    // =========================================================================
    @Nested
    @DisplayName("Challenge 1: DateLogicValidator Strictness & Boundary Tests")
    class DateLogicValidatorStressTest {

        private DateLogicValidator validator;

        @BeforeEach
        void setUp() {
            validator = new DateLogicValidator();
        }

        @Test
        @DisplayName("1.1 Leap Year 29/02 Validation: Valid leap years (2000, 2020, 2024) must pass date parsing")
        void testValidLeapYearFeb29() {
            // 29/02/2000 is valid (divisible by 400)
            List<FormValidationIssue> issues2000 = validator.validate("29/02/2000", "01/01/2020");
            assertThat(issues2000).noneMatch(i -> "birthDate".equals(i.getField()));

            // 29/02/2020 is valid (divisible by 4)
            // Note: issue date must be >= age 14 -> 2020 + 14 = 2034 is future, so test as issueDate instead
            List<FormValidationIssue> issuesIssueDate2020 = validator.validate("01/01/2000", "29/02/2020");
            assertThat(issuesIssueDate2020).isEmpty();

            // 29/02/2024 is valid (divisible by 4)
            List<FormValidationIssue> issuesIssueDate2024 = validator.validate("01/01/2000", "29/02/2024");
            assertThat(issuesIssueDate2024).isEmpty();
        }

        @Test
        @DisplayName("1.2 Non-Leap Year 29/02 Rejection: 29/02/2021, 29/02/2022, 29/02/2023 must be rejected strictly")
        void testNonLeapYearFeb29StrictRejection() {
            int[] nonLeapYears = {2021, 2022, 2023, 2025, 2026, 2027};
            for (int year : nonLeapYears) {
                String invalidDate = "29/02/" + year;
                List<FormValidationIssue> issues = validator.validate(invalidDate, "01/01/2025");
                assertThat(issues)
                        .as("29/02 in non-leap year %d must fail with INVALID_DATE_FORMAT", year)
                        .anyMatch(i -> "birthDate".equals(i.getField()) && "INVALID_DATE_FORMAT".equals(i.getErrorType()));
            }
        }

        @Test
        @DisplayName("1.3 Century Non-Leap Year: 29/02/1900 and 29/02/2100 are NOT leap years (divisible by 100, not 400)")
        void testCenturyNonLeapYears() {
            // 1900 is NOT a leap year
            List<FormValidationIssue> issues1900 = validator.validate("29/02/1900", "01/01/1920");
            assertThat(issues1900).anyMatch(i -> "birthDate".equals(i.getField()) && "INVALID_DATE_FORMAT".equals(i.getErrorType()));

            // 2100 is NOT a leap year
            List<FormValidationIssue> issues2100 = validator.validate("29/02/2100", "01/01/2020");
            assertThat(issues2100).anyMatch(i -> "birthDate".equals(i.getField()) && "INVALID_DATE_FORMAT".equals(i.getErrorType()));
        }

        @Test
        @DisplayName("1.4 Strict Calendar Boundaries: 30/02, 31/02, 31/04, 31/06, 31/09, 31/11 must be rejected")
        void testStrictCalendarBoundaries() {
            String[] invalidDates = {
                    "30/02/2024", "31/02/2024", "31/04/2024", "31/06/2024", "31/09/2024", "31/11/2024",
                    "32/01/2024", "00/01/2024", "15/00/2024", "15/13/2024"
            };
            for (String invalidDate : invalidDates) {
                List<FormValidationIssue> issues = validator.validate(invalidDate, "01/01/2025");
                assertThat(issues)
                        .as("Invalid calendar date '%s' must be rejected with INVALID_DATE_FORMAT", invalidDate)
                        .anyMatch(i -> "birthDate".equals(i.getField()) && "INVALID_DATE_FORMAT".equals(i.getErrorType()));
            }
        }

        @Test
        @DisplayName("1.5 Boundary Year 1900: Birth date 01/01/1900 must PASS (year == 1900 is allowed)")
        void testBoundaryYear1900Allowed() {
            // Citizen born 01/01/1900, issued CCCD on 01/01/1920 (age 20 >= 14)
            List<FormValidationIssue> issues = validator.validate("01/01/1900", "01/01/1920");
            assertThat(issues).isEmpty();

            // Citizen born 31/12/1900, issued CCCD on 31/12/1920 (age 20 >= 14)
            List<FormValidationIssue> issuesEnd1900 = validator.validate("31/12/1900", "31/12/1920");
            assertThat(issuesEnd1900).isEmpty();
        }

        @Test
        @DisplayName("1.6 Year < 1900 Rejection: 31/12/1899 and earlier years must fail with INVALID_DATE_LOGIC")
        void testYearPriorTo1900Rejected() {
            String[] ancientDates = {"31/12/1899", "01/01/1899", "15/08/1850", "01/01/1800"};
            for (String date : ancientDates) {
                List<FormValidationIssue> issues = validator.validate(date, "01/01/1920");
                assertThat(issues)
                        .as("Birth date '%s' with year < 1900 must fail with INVALID_DATE_LOGIC", date)
                        .anyMatch(i -> "birthDate".equals(i.getField()) && "INVALID_DATE_LOGIC".equals(i.getErrorType())
                                && i.getMessage().contains("phải từ năm 1900"));
            }
        }

        @Test
        @DisplayName("1.7 Alternative ISO Format (uuuu-MM-dd) Strictness")
        void testIsoFormatStrictness() {
            // Valid ISO format
            List<FormValidationIssue> validIso = validator.validate("2000-02-29", "2020-01-01");
            assertThat(validIso).isEmpty();

            // Invalid ISO leap year (2023-02-29)
            List<FormValidationIssue> invalidIso = validator.validate("2023-02-29", "2025-01-01");
            assertThat(invalidIso).anyMatch(i -> "birthDate".equals(i.getField()) && "INVALID_DATE_FORMAT".equals(i.getErrorType()));

            // Year < 1900 in ISO
            List<FormValidationIssue> ancientIso = validator.validate("1899-12-31", "1920-01-01");
            assertThat(ancientIso).anyMatch(i -> "INVALID_DATE_LOGIC".equals(i.getErrorType()));
        }

        @Test
        @DisplayName("1.8 Age Under 14 Rejection & Sequence Invariants")
        void testAgeUnder14AndSequenceInvariants() {
            // Citizen born 15/08/2010, card issued 14/08/2024 (age 13 years 364 days < 14) -> REJECT
            List<FormValidationIssue> ageIssues = validator.validate("15/08/2010", "14/08/2024");
            assertThat(ageIssues).anyMatch(i -> "INVALID_DATE_LOGIC".equals(i.getErrorType())
                    && i.getMessage().contains("chưa đủ 14 tuổi"));

            // Citizen born 15/08/2010, card issued 15/08/2024 (exact 14th birthday) -> PASS
            List<FormValidationIssue> exact14 = validator.validate("15/08/2010", "15/08/2024");
            assertThat(exact14).isEmpty();

            // Issue date prior to birth date -> REJECT
            List<FormValidationIssue> reversedDates = validator.validate("15/08/2000", "15/08/1990");
            assertThat(reversedDates).anyMatch(i -> "INVALID_DATE_LOGIC".equals(i.getErrorType())
                    && i.getMessage().contains("không thể xảy ra trước ngày sinh"));

            // Issue date in future -> REJECT
            String tomorrow = LocalDate.now().plusDays(1).format(DateTimeFormatter.ofPattern("dd/MM/uuuu"));
            List<FormValidationIssue> futureIssue = validator.validate("15/08/2000", tomorrow);
            assertThat(futureIssue).anyMatch(i -> "INVALID_DATE_LOGIC".equals(i.getErrorType())
                    && i.getMessage().contains("không thể xảy ra trong tương lai"));
        }
    }

    // =========================================================================
    // 2. CCCD VALIDATOR EMPIRICAL STRESS TESTS
    // =========================================================================
    @Nested
    @DisplayName("Challenge 2: CccdValidator Warning Logic & Invalid Patterns")
    class CccdValidatorStressTest {

        private CccdValidator validator;

        @BeforeEach
        void setUp() {
            validator = new CccdValidator();
        }

        @Test
        @DisplayName("2.1 Birth Year Null or Blank: Does not emit CANNOT_VERIFY_CCCD_YEAR_GENDER warning")
        void testBirthYearNullOrBlank_noWarning() {
            // Valid An Giang CCCD (089 = An Giang, 0 = 20th century male, 95 = 1995, 012345)
            // BirthDate is null -> validator cannot check year/gender, but emits no false warning
            List<FormValidationIssue> issuesNull = validator.validate("089095012345", null, "Nam");
            assertThat(issuesNull).isEmpty();

            // BirthDate is empty/blank
            List<FormValidationIssue> issuesBlank = validator.validate("089095012345", "   ", "Nam");
            assertThat(issuesBlank).isEmpty();
        }

        @Test
        @DisplayName("2.2 Birth Year Corrupt/Unparseable: MUST emit CANNOT_VERIFY_CCCD_YEAR_GENDER with severity WARNING")
        void testBirthYearMalformed_emitsWarning() {
            String[] malformedDates = {
                    "invalid-date", "2024/02", "not-a-date", "31-02-2023-extra", "abc/def/ghij", "2002"
            };

            for (String malformed : malformedDates) {
                List<FormValidationIssue> issues = validator.validate("089095012345", malformed, "Nam");
                assertThat(issues)
                        .as("Malformed birthDate '%s' must trigger CANNOT_VERIFY_CCCD_YEAR_GENDER warning", malformed)
                        .hasSize(1)
                        .anyMatch(i -> "cccdNumber".equals(i.getField())
                                && "CANNOT_VERIFY_CCCD_YEAR_GENDER".equals(i.getErrorType())
                                && "WARNING".equals(i.getSeverity()));
            }
        }

        @Test
        @DisplayName("2.3 Invalid 12-Digit Patterns: Length, characters, and spaces")
        void testInvalidLengthAndCharacters() {
            // Empty / null
            assertThat(validator.validate(null, "15/08/1995", "Nam")).anyMatch(i -> "MISSING_MANDATORY_FIELD".equals(i.getErrorType()));
            assertThat(validator.validate("", "15/08/1995", "Nam")).anyMatch(i -> "MISSING_MANDATORY_FIELD".equals(i.getErrorType()));

            // 11 digits
            assertThat(validator.validate("08909501234", "15/08/1995", "Nam")).anyMatch(i -> "INVALID_CCCD_LENGTH".equals(i.getErrorType()));

            // 13 digits
            assertThat(validator.validate("0890950123456", "15/08/1995", "Nam")).anyMatch(i -> "INVALID_CCCD_LENGTH".equals(i.getErrorType()));

            // Non-numeric characters
            assertThat(validator.validate("08909501234a", "15/08/1995", "Nam")).anyMatch(i -> "INVALID_CCCD_LENGTH".equals(i.getErrorType()));
            assertThat(validator.validate("089-095-01234", "15/08/1995", "Nam")).anyMatch(i -> "INVALID_CCCD_LENGTH".equals(i.getErrorType()));
        }

        @Test
        @DisplayName("2.4 Invalid Province Codes: Non-existent codes must trigger INVALID_CCCD_PROVINCE")
        void testInvalidProvinceCodes() {
            String[] invalidProvinces = {"000", "003", "005", "007", "009", "097", "098", "099", "100", "999"};
            for (String prov : invalidProvinces) {
                String cccd = prov + "095012345";
                List<FormValidationIssue> issues = validator.validate(cccd, "15/08/1995", "Nam");
                assertThat(issues)
                        .as("Province code '%s' must fail with INVALID_CCCD_PROVINCE", prov)
                        .anyMatch(i -> "INVALID_CCCD_PROVINCE".equals(i.getErrorType()));
            }
        }

        @Test
        @DisplayName("2.5 Valid Province Codes Coverage: 089 (An Giang), 079 (TP.HCM), 001 (Hà Nội), 048 (Đà Nẵng)")
        void testValidProvinceCodes() {
            String[] validProvinces = {"089", "079", "001", "048", "092", "091"};
            for (String prov : validProvinces) {
                String cccd = prov + "095012345";
                List<FormValidationIssue> issues = validator.validate(cccd, "15/08/1995", "Nam");
                assertThat(issues).noneMatch(i -> "INVALID_CCCD_PROVINCE".equals(i.getErrorType()));
            }
        }

        @Test
        @DisplayName("2.6 Century & Gender Code Cross-Validation (Circular 59/2021/TT-BCA)")
        void testCenturyAndGenderValidation() {
            // Century 20 (1900-1999): Male = 0, Female = 1
            assertThat(validator.validate("089095012345", "15/08/1995", "Nam")).isEmpty();
            assertThat(validator.validate("089195012345", "15/08/1995", "Nữ")).isEmpty();
            assertThat(validator.validate("089095012345", "15/08/1995", "Nữ")).anyMatch(i -> "INVALID_CCCD_CENTURY_GENDER".equals(i.getErrorType()));
            assertThat(validator.validate("089195012345", "15/08/1995", "Nam")).anyMatch(i -> "INVALID_CCCD_CENTURY_GENDER".equals(i.getErrorType()));

            // Century 21 (2000-2099): Male = 2, Female = 3
            assertThat(validator.validate("089204012345", "15/08/2004", "Nam")).isEmpty();
            assertThat(validator.validate("089304012345", "15/08/2004", "Nữ")).isEmpty();
            assertThat(validator.validate("089004012345", "15/08/2004", "Nam")).anyMatch(i -> "INVALID_CCCD_CENTURY_GENDER".equals(i.getErrorType()));
            assertThat(validator.validate("089204012345", "15/08/2004", "Nữ")).anyMatch(i -> "INVALID_CCCD_CENTURY_GENDER".equals(i.getErrorType()));
        }

        @Test
        @DisplayName("2.7 Birth Year Digits Match: Indices 4..5 must match last 2 digits of year")
        void testBirthYearDigitsMatch() {
            // Born 1995 -> expected "95", CCCD has "96" -> REJECT
            List<FormValidationIssue> issues96 = validator.validate("089096012345", "15/08/1995", "Nam");
            assertThat(issues96).anyMatch(i -> "INVALID_CCCD_YEAR".equals(i.getErrorType()));

            // Born 2000 -> expected "00"
            assertThat(validator.validate("089200012345", "01/01/2000", "Nam")).isEmpty();
            assertThat(validator.validate("089201012345", "01/01/2000", "Nam")).anyMatch(i -> "INVALID_CCCD_YEAR".equals(i.getErrorType()));
        }
    }

    // =========================================================================
    // 3. QUERY CACHE SERVICE MULTI-LOCALITY COLLISION TESTS
    // =========================================================================
    @Nested
    @DisplayName("Challenge 3: QueryCacheService Multi-Locality Collision Resistance")
    class QueryCacheMultiLocalityCollisionTest {

        private QueryCacheService cacheService;

        @BeforeEach
        void setUp() {
            cacheService = new QueryCacheService(null, objectMapper);
        }

        @Test
        @DisplayName("3.1 Same Query with Different Wards Must Produce Distinct Cache Keys")
        void testSameQueryDifferentWards_distinctKeys() {
            String query = "Thủ tục đăng ký khai sinh";
            String[] wards = {
                    "Phường Mỹ Bình", "Phường Mỹ Long", "Phường Bình Đức", "Xã Mỹ Hòa Hưng",
                    "Xã Vĩnh Tế", "Phường Châu Phú A", "Thị trấn Tri Tôn"
            };

            Set<String> generatedKeys = new HashSet<>();
            for (String ward : wards) {
                String key = cacheService.buildCacheKey(query, ward, "Hộ tịch");
                assertThat(key).startsWith("smartward:cache:rag:");
                boolean isNew = generatedKeys.add(key);
                assertTrue(isNew, "Key collision detected for ward: " + ward + " -> " + key);
            }
            assertEquals(wards.length, generatedKeys.size(), "All ward keys must be distinct");
        }

        @Test
        @DisplayName("3.2 Same Query and Ward with Different Categories Must Produce Distinct Cache Keys")
        void testSameQueryAndWardDifferentCategories_distinctKeys() {
            String query = "Thủ tục xin cấp giấy tờ";
            String ward = "Phường Mỹ Bình";
            String[] categories = {
                    "Hộ tịch", "Đất đai", "Bảo trợ xã hội", "Cư trú", "Chứng thực"
            };

            Set<String> generatedKeys = new HashSet<>();
            for (String cat : categories) {
                String key = cacheService.buildCacheKey(query, ward, cat);
                boolean isNew = generatedKeys.add(key);
                assertTrue(isNew, "Key collision detected for category: " + cat);
            }
            assertEquals(categories.length, generatedKeys.size());
        }

        @Test
        @DisplayName("3.3 Collision Resistance Stress Test on 1,000 Multi-Locality Permutations")
        void testMultiLocalityCollisionResistance_1000Permutations() {
            String[] queries = {
                    "làm khai sinh cho con", "đăng ký thường trú mới", "thủ tục kết hôn",
                    "xin cấp sổ đỏ lần đầu", "hỗ trợ mai táng phí", "chứng thực chữ ký",
                    "xác nhận tình trạng hôn nhân", "lệ phí cấp bản sao trích lục"
            };
            String[] wards = {
                    "Phường Mỹ Bình", "Phường Mỹ Long", "Xã Vĩnh Tế", "Phường Châu Phú B", "Xã Bình Thạnh"
            };
            String[] categories = {
                    "Hộ tịch", "Đất đai", "Bảo trợ xã hội", "Cư trú", "Chứng thực"
            };

            Set<String> uniqueKeys = new HashSet<>();
            int totalGenerated = 0;

            for (String q : queries) {
                for (String w : wards) {
                    for (String c : categories) {
                        for (int variant = 0; variant < 5; variant++) {
                            String queryVar = q + " biến thể " + variant;
                            String key = cacheService.buildCacheKey(queryVar, w, c);
                            boolean added = uniqueKeys.add(key);
                            assertTrue(added, "SHA-256 prefix collision detected for: " + queryVar + " | " + w + " | " + c);
                            totalGenerated++;
                        }
                    }
                }
            }

            assertEquals(totalGenerated, uniqueKeys.size(), "All " + totalGenerated + " keys must be pairwise distinct");
        }

        @Test
        @DisplayName("3.4 Delimiter Spoofing Injection Immunity: Embedded punctuation cannot spoof delimiter '::'")
        void testDelimiterSpoofingImmunity() {
            // Attacker attempts to forge ward inside query string: "thủ tục::phường mỹ long"
            String forgedQueryKey = cacheService.buildCacheKey("thủ tục::phường mỹ long", "Phường Mỹ Bình", "Hộ tịch");
            String legitimateKey = cacheService.buildCacheKey("thủ tục", "phường mỹ long", "Hộ tịch");

            // Since buildCacheKey cleans punctuation via replaceAll("\\p{Punct}", ""),
            // "thủ tục::phường mỹ long" is sanitized to "thủ tụcphường mỹ long" before appending "::"
            // Thus forgedQueryKey is immune to boundary collision with legitimateKey
            assertThat(forgedQueryKey).isNotEqualTo(legitimateKey);
        }

        @Test
        @DisplayName("3.5 Idempotency: Keys already having prefix are returned unchanged")
        void testCacheKeyIdempotency() {
            String existingKey = "smartward:cache:rag:0123456789abcdef";
            String result = cacheService.buildCacheKey(existingKey);
            assertEquals(existingKey, result);
        }
    }

    // =========================================================================
    // 4. N+1 QUERY ELIMINATION TESTS (ProcedureService & LegalChunkRepository)
    // =========================================================================
    @Nested
    @DisplayName("Challenge 4: LegalChunkRepository & ProcedureService N+1 Query Elimination")
    class ProcedureServiceNPlusOneStressTest {

        @Mock
        private AdminProcedureRepository procedureRepository;

        @Mock
        private LegalChunkRepository chunkRepository;

        @Test
        @DisplayName("4.1 Massive Scale: Exactly 2 DB queries executed for N = 500 procedures")
        void testGetProcedures_massiveScaleNoNPlusOne() {
            ProcedureService procedureService = new ProcedureService(procedureRepository, chunkRepository);

            int n = 500;
            List<AdminProcedure> procedures = new ArrayList<>(n);
            List<Object[]> groupCounts = new ArrayList<>(n);

            for (long i = 1; i <= n; i++) {
                procedures.add(AdminProcedure.builder()
                        .id(i)
                        .procedureCode("TTHC-SCALE-" + i)
                        .procedureName("Thủ tục quy mô " + i)
                        .category("Hộ tịch")
                        .status("ACTIVE")
                        .build());
                // Alternate chunk count
                if (i % 3 == 0) {
                    groupCounts.add(new Object[]{i, (int) (i % 10)});
                }
            }

            when(procedureRepository.searchProcedures(any(), any())).thenReturn(procedures);
            when(chunkRepository.countChunksByProcedure()).thenReturn(groupCounts);

            List<ProcedureDto> dtos = procedureService.getProcedures(null, null);

            assertThat(dtos).hasSize(n);

            // VERIFICATION OF EXACT QUERY COUNT:
            // Query 1: searchProcedures
            verify(procedureRepository, times(1)).searchProcedures(any(), any());
            // Query 2: countChunksByProcedure (GROUP BY)
            verify(chunkRepository, times(1)).countChunksByProcedure();
            // NEVER called in loop: findByProcedureId
            verify(chunkRepository, never()).findByProcedureId(anyLong());

            // Validate mapped chunk counts
            for (ProcedureDto dto : dtos) {
                long id = Long.parseLong(dto.getProcedureCode().replace("TTHC-SCALE-", ""));
                if (id % 3 == 0) {
                    assertEquals((int) (id % 10), dto.getChunksCount());
                } else {
                    assertEquals(0, dto.getChunksCount());
                }
            }
        }

        @Test
        @DisplayName("4.2 Resilient Parsing of Count Results: Handles Long, Integer, BigInteger, null rows")
        void testCountResultsTypeResilience() {
            ProcedureService procedureService = new ProcedureService(procedureRepository, chunkRepository);

            AdminProcedure proc1 = AdminProcedure.builder().id(1L).procedureCode("TTHC-1").build();
            AdminProcedure proc2 = AdminProcedure.builder().id(2L).procedureCode("TTHC-2").build();
            AdminProcedure proc3 = AdminProcedure.builder().id(3L).procedureCode("TTHC-3").build();

            when(procedureRepository.searchProcedures(any(), any())).thenReturn(List.of(proc1, proc2, proc3));

            List<Object[]> diverseCounts = List.of(
                    new Object[]{1L, 5L},                      // Long, Long
                    new Object[]{2, 12},                       // Integer, Integer
                    new Object[]{3L, java.math.BigInteger.valueOf(25)} // Long, BigInteger (Number subtype)
            );
            when(chunkRepository.countChunksByProcedure()).thenReturn(diverseCounts);

            List<ProcedureDto> dtos = procedureService.getProcedures(null, null);
            assertThat(dtos).hasSize(3);
            assertEquals(5, dtos.get(0).getChunksCount());
            assertEquals(12, dtos.get(1).getChunksCount());
            assertEquals(25, dtos.get(2).getChunksCount());
        }
    }

    // =========================================================================
    // 5. VIETNAMESE TEXT NORMALIZER CONCURRENCY & PERFORMANCE STRESS TESTS
    // =========================================================================
    @Nested
    @DisplayName("Challenge 5: VietnameseTextNormalizer Concurrency & Thread-Safety Stress Test")
    class VietnameseTextNormalizerConcurrencyTest {

        private static final String[] TEST_CORPUS = {
                "xinchao tui muon lam gks cho con mới sanh o ubnd xa",
                "chaogf can tu van ve cccd va thuong tru tai phuong 25",
                "ho so dk tam tru va xac nhan gia thu can nhung giay to gi",
                "tui muon biet le phi sao y va chung thuc ban sao bhxh",
                "khai tuwr cho nguoi moi mat co can nop so ho khau goc khong",
                "toi muon lanh tien gia cho ba me gia o que nha",
                "howx troj ve viec lam giay to nha dat va tthc cap xa",
                "xinn huowngs daanx ve thu tuc ket hon voi nguoi nuoc ngoai",
                "ko biet la bay gio cmnd cu co con dc dung thay the cccd khong",
                "chaoof can giupf do ve thu tuc bhyt va gxn noi cu tru"
        };

        @Test
        @DisplayName("5.1 Thread-Safety Stress Test: 32 concurrent threads executing 50,000 normalizations")
        void testConcurrentNormalizationThreadSafety() throws Exception {
            int threadCount = 32;
            int iterationsPerThread = 1500; // total 48,000 operations
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);
            CountDownLatch readyLatch = new CountDownLatch(threadCount);
            CountDownLatch startLatch = new CountDownLatch(1);

            List<Future<Map<String, String>>> futures = new ArrayList<>();

            for (int t = 0; t < threadCount; t++) {
                futures.add(executor.submit(() -> {
                    readyLatch.countDown();
                    startLatch.await(); // simultaneous release

                    Map<String, String> results = new HashMap<>();
                    for (int i = 0; i < iterationsPerThread; i++) {
                        String sample = TEST_CORPUS[i % TEST_CORPUS.length];
                        String normalized = VietnameseTextNormalizer.normalize(sample);
                        results.put(sample, normalized);
                    }
                    return results;
                }));
            }

            readyLatch.await(5, TimeUnit.SECONDS);
            long startNano = System.nanoTime();
            startLatch.countDown(); // FIRE ALL THREADS

            // Verify each thread's results
            Map<String, String> referenceMap = null;
            for (Future<Map<String, String>> future : futures) {
                Map<String, String> threadResults = future.get(10, TimeUnit.SECONDS);
                assertNotNull(threadResults);
                assertEquals(TEST_CORPUS.length, threadResults.size());

                if (referenceMap == null) {
                    referenceMap = threadResults;
                } else {
                    // Assert exact deterministic equivalence across all concurrent threads
                    assertEquals(referenceMap, threadResults, "All threads must produce identical deterministic results");
                }
            }
            long endNano = System.nanoTime();
            executor.shutdown();

            long totalOps = (long) threadCount * iterationsPerThread;
            double elapsedSeconds = (endNano - startNano) / 1_000_000_000.0;
            double opsPerSec = totalOps / elapsedSeconds;
            double avgLatencyMicros = ((endNano - startNano) / (double) totalOps) / 1000.0;

            System.out.printf("Concurrent Normalization Stress Test Results:%n");
            System.out.printf("  Threads: %d, Total Operations: %d%n", threadCount, totalOps);
            System.out.printf("  Elapsed Time: %.3f seconds%n", elapsedSeconds);
            System.out.printf("  Concurrent Throughput: %.0f ops/second%n", opsPerSec);
            System.out.printf("  Average Latency: %.3f µs per operation (%.4f ms)%n", avgLatencyMicros, avgLatencyMicros / 1000.0);

            // Sub-millisecond requirement: avg latency per call must be well under 1.0 ms (1000 µs)
            assertThat(avgLatencyMicros / 1000.0).isLessThan(1.0);
            assertThat(opsPerSec).isGreaterThan(10_000.0);
        }

        @Test
        @DisplayName("5.2 RemoveAccents Utility Thread-Safety")
        void testRemoveAccentsThreadSafety() throws Exception {
            int threadCount = 16;
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);
            List<Callable<Boolean>> tasks = new ArrayList<>();

            for (int t = 0; t < threadCount; t++) {
                tasks.add(() -> {
                    for (int i = 0; i < 2000; i++) {
                        String withoutAccents = VietnameseTextNormalizer.removeAccents("Ủy ban nhân dân Phường Mỹ Bình Tỉnh An Giang Đắk Lắk");
                        if (!"Uy ban nhan dan Phuong My Binh Tinh An Giang Dak Lak".equals(withoutAccents)) {
                            return false;
                        }
                    }
                    return true;
                });
            }

            List<Future<Boolean>> results = executor.invokeAll(tasks, 5, TimeUnit.SECONDS);
            executor.shutdown();

            for (Future<Boolean> res : results) {
                assertTrue(res.get(), "Accents removal must be thread-safe and deterministic");
            }
        }
    }
}

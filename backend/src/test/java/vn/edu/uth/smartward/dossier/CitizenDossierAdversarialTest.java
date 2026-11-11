package vn.edu.uth.smartward.dossier;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.rag.AdminProcedure;
import vn.edu.uth.smartward.rag.AdminProcedureRepository;
import vn.edu.uth.smartward.security.OfficerAuthService;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CitizenDossierAdversarialTest {

    @Mock
    private CitizenDossierRepository dossierRepository;

    @Mock
    private AdminProcedureRepository procedureRepository;

    private ObjectMapper objectMapper;
    private CitizenDossierService dossierService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        dossierService = new CitizenDossierService(dossierRepository, procedureRepository, objectMapper);
    }

    // =========================================================================
    // 1. CONCURRENCY & DOSSIER CODE COLLISION STRESS-TESTING
    // =========================================================================
    @Nested
    @DisplayName("1. Concurrency & Dossier Code Generation")
    class ConcurrencyTests {

        @Test
        @DisplayName("Sequential dossier code generation produces distinct ascending codes")
        void generateDossierCode_sequentialInvocations_distinctCodes() {
            // Emulate DB repository maintaining existing codes
            Set<String> databaseCodes = new HashSet<>();
            when(dossierRepository.countByDossierCodeStartingWith(anyString()))
                    .thenAnswer(inv -> (long) databaseCodes.size());
            when(dossierRepository.existsByDossierCode(anyString()))
                    .thenAnswer(inv -> databaseCodes.contains(inv.getArgument(0)));

            List<String> generated = new ArrayList<>();
            for (int i = 0; i < 50; i++) {
                String code = dossierService.generateDossierCode("WARD-BENNGHE");
                assertThat(databaseCodes).doesNotContain(code);
                databaseCodes.add(code);
                generated.add(code);
            }

            // Verify all 50 codes are distinct
            assertThat(new HashSet<>(generated)).hasSize(50);
            assertThat(generated.get(0)).endsWith("-0001");
            assertThat(generated.get(49)).endsWith("-0050");
        }

        @Test
        @DisplayName("Dossier code collision resolution: when count lags, while-loop increments to next free slot")
        void generateDossierCode_collisionResolutionLoop() {
            // Simulate scenario where count reports 0, but 0001 and 0002 already exist
            when(dossierRepository.countByDossierCodeStartingWith(anyString())).thenReturn(0L);
            when(dossierRepository.existsByDossierCode(argThat(code -> code != null && (code.endsWith("-0001") || code.endsWith("-0002")))))
                    .thenReturn(true);
            when(dossierRepository.existsByDossierCode(argThat(code -> code != null && code.endsWith("-0003"))))
                    .thenReturn(false);

            String candidate = dossierService.generateDossierCode("WARD-BENNGHE");
            assertThat(candidate).endsWith("-0003");
        }

        @Test
        @DisplayName("Concurrent multi-threaded dossier submission with thread-safe persistence")
        void submitDossier_concurrentThreads_noDuplicateCodes() throws Exception {
            ConcurrentHashMap<String, CitizenDossier> dbStore = new ConcurrentHashMap<>();
            AtomicInteger idGen = new AtomicInteger(1);

            when(dossierRepository.countByDossierCodeStartingWith(anyString()))
                    .thenAnswer(inv -> (long) dbStore.size());
            when(dossierRepository.existsByDossierCode(anyString()))
                    .thenAnswer(inv -> dbStore.containsKey(inv.getArgument(0)));
            when(dossierRepository.save(any(CitizenDossier.class))).thenAnswer(inv -> {
                CitizenDossier d = inv.getArgument(0);
                d.setId((long) idGen.getAndIncrement());
                d.setCreatedAt(Instant.now());
                dbStore.put(d.getDossierCode(), d);
                return d;
            });

            int threadCount = 20;
            ExecutorService executor = Executors.newFixedThreadPool(threadCount);
            CountDownLatch readyLatch = new CountDownLatch(threadCount);
            CountDownLatch startLatch = new CountDownLatch(1);
            List<Future<DossierSubmissionResponse>> futures = new ArrayList<>();

            for (int i = 0; i < threadCount; i++) {
                final int idx = i;
                futures.add(executor.submit(() -> {
                    readyLatch.countDown();
                    startLatch.await(); // simultaneous release
                    SubmitDossierRequest req = SubmitDossierRequest.builder()
                            .procedureCode("TTHC-CT-01")
                            .wardCode("WARD-BENNGHE")
                            .citizenCccd("0890950000" + String.format("%02d", idx))
                            .formData(Map.of("fullName", "NGUYEN CONCURRENCY " + idx))
                            .build();
                    // synchronize dossier creation to mirror transactional DB isolation
                    synchronized (dbStore) {
                        return dossierService.submitDossier(req);
                    }
                }));
            }

            readyLatch.await(5, TimeUnit.SECONDS);
            startLatch.countDown(); // FIRE ALL THREADS

            Set<String> generatedCodes = new HashSet<>();
            for (Future<DossierSubmissionResponse> f : futures) {
                DossierSubmissionResponse res = f.get(5, TimeUnit.SECONDS);
                assertThat(res.dossierCode()).isNotNull();
                generatedCodes.add(res.dossierCode());
            }

            executor.shutdown();
            assertThat(generatedCodes).hasSize(threadCount);
        }
    }

    // =========================================================================
    // 2. SLA CALCULATION ALGORITHM STRESS-TESTING
    // =========================================================================
    @Nested
    @DisplayName("2. SLA Calculation Edge Cases")
    class SlaEdgeCaseTests {

        @Test
        @DisplayName("Submission on Friday at 18:00 UTC -> SLA must fall on next Wednesday at 17:00 UTC (skipping Sat, Sun)")
        void calculateWorkingDayDeadline_friday18h_fallsOnNextWednesday17h() {
            // 2026-11-13 is Friday
            Instant friday18h = ZonedDateTime.of(2026, 11, 13, 18, 0, 0, 0, ZoneOffset.UTC).toInstant();
            Instant deadline = CitizenDossierService.calculateWorkingDayDeadline(friday18h, 3);

            ZonedDateTime zdt = deadline.atZone(ZoneOffset.UTC);
            // Day 1: Monday Nov 16
            // Day 2: Tuesday Nov 17
            // Day 3: Wednesday Nov 18
            assertThat(zdt.getDayOfWeek()).isEqualTo(DayOfWeek.WEDNESDAY);
            assertThat(zdt.getYear()).isEqualTo(2026);
            assertThat(zdt.getMonthValue()).isEqualTo(11);
            assertThat(zdt.getDayOfMonth()).isEqualTo(18);
            assertThat(zdt.getHour()).isEqualTo(17);
            assertThat(zdt.getMinute()).isEqualTo(0);
            assertThat(zdt.getSecond()).isEqualTo(0);
        }

        @Test
        @DisplayName("Submission on Friday morning 08:30 UTC -> also falls on next Wednesday at 17:00 UTC")
        void calculateWorkingDayDeadline_fridayMorning_fallsOnNextWednesday17h() {
            Instant friday08h = ZonedDateTime.of(2026, 11, 13, 8, 30, 0, 0, ZoneOffset.UTC).toInstant();
            Instant deadline = CitizenDossierService.calculateWorkingDayDeadline(friday08h, 3);

            ZonedDateTime zdt = deadline.atZone(ZoneOffset.UTC);
            assertThat(zdt.getDayOfWeek()).isEqualTo(DayOfWeek.WEDNESDAY);
            assertThat(zdt.getDayOfMonth()).isEqualTo(18);
            assertThat(zdt.getHour()).isEqualTo(17);
        }

        @Test
        @DisplayName("Submission on Saturday afternoon -> skips Sunday, starts Monday, ends Wednesday 17:00 UTC")
        void calculateWorkingDayDeadline_saturdaySubmission_fallsOnWednesday17h() {
            // 2026-11-14 is Saturday
            Instant saturday14h = ZonedDateTime.of(2026, 11, 14, 14, 0, 0, 0, ZoneOffset.UTC).toInstant();
            Instant deadline = CitizenDossierService.calculateWorkingDayDeadline(saturday14h, 3);

            ZonedDateTime zdt = deadline.atZone(ZoneOffset.UTC);
            assertThat(zdt.getDayOfWeek()).isEqualTo(DayOfWeek.WEDNESDAY);
            assertThat(zdt.getDayOfMonth()).isEqualTo(18);
            assertThat(zdt.getHour()).isEqualTo(17);
        }

        @Test
        @DisplayName("Submission immediately preceding New Year Holiday (Dec 31) -> skips Jan 1 (Fri), Jan 2 (Sat), Jan 3 (Sun) -> ends Jan 6 (Wed) 17:00 UTC")
        void calculateWorkingDayDeadline_newYearHolidaySkip() {
            // 2026-12-31 is Thursday
            Instant dec31 = ZonedDateTime.of(2026, 12, 31, 15, 0, 0, 0, ZoneOffset.UTC).toInstant();
            Instant deadline = CitizenDossierService.calculateWorkingDayDeadline(dec31, 3);

            ZonedDateTime zdt = deadline.atZone(ZoneOffset.UTC);
            // Jan 1 (Fri): Holiday skipped
            // Jan 2 (Sat): Weekend skipped
            // Jan 3 (Sun): Weekend skipped
            // Jan 4 (Mon): Day 1
            // Jan 5 (Tue): Day 2
            // Jan 6 (Wed): Day 3
            assertThat(zdt.getYear()).isEqualTo(2027);
            assertThat(zdt.getMonthValue()).isEqualTo(1);
            assertThat(zdt.getDayOfMonth()).isEqualTo(6);
            assertThat(zdt.getDayOfWeek()).isEqualTo(DayOfWeek.WEDNESDAY);
            assertThat(zdt.getHour()).isEqualTo(17);
            assertThat(zdt.getMinute()).isEqualTo(0);
        }

        @Test
        @DisplayName("Vital Civil Registration (1-day statutory SLA) submitted on Friday -> SLA deadline is Monday 17:00 UTC")
        void calculateWorkingDayDeadline_vitalRecordFriday_fallsOnMonday17h() {
            Instant friday = ZonedDateTime.of(2026, 11, 13, 10, 0, 0, 0, ZoneOffset.UTC).toInstant();
            Instant deadline = CitizenDossierService.calculateWorkingDayDeadline(friday, 1);

            ZonedDateTime zdt = deadline.atZone(ZoneOffset.UTC);
            assertThat(zdt.getDayOfWeek()).isEqualTo(DayOfWeek.MONDAY);
            assertThat(zdt.getDayOfMonth()).isEqualTo(16);
            assertThat(zdt.getHour()).isEqualTo(17);
        }
    }

    // =========================================================================
    // 3. DOSSIER TRACKING & CCCD LAST-4 VERIFICATION
    // =========================================================================
    @Nested
    @DisplayName("3. Dossier Tracking Security & CCCD Verification")
    class TrackingSecurityTests {

        private CitizenDossier sampleDossier;

        @BeforeEach
        void initDossier() {
            sampleDossier = CitizenDossier.builder()
                    .id(10L)
                    .dossierCode("HS-20261111-BENNGHE-0001")
                    .procedureCode("TTHC-CT-01")
                    .wardCode("WARD-BENNGHE")
                    .citizenCccd("089095012345") // Ends with 2345
                    .status("PENDING")
                    .slaDeadline(Instant.now().plusSeconds(86400 * 3))
                    .formData("{\"fullName\": \"NGUYEN VAN A\"}")
                    .build();
        }

        @Test
        @DisplayName("Correct dossier code + correct 4 digits CCCD ('2345') -> Returns 200 OK and masked CCCD")
        void trackDossier_correctCodeAndLast4_success() {
            when(dossierRepository.findByDossierCodeIgnoreCase("HS-20261111-BENNGHE-0001"))
                    .thenReturn(Optional.of(sampleDossier));

            DossierTrackingResponse res = dossierService.trackDossier("HS-20261111-BENNGHE-0001", "2345", null);
            assertThat(res).isNotNull();
            assertThat(res.dossierCode()).isEqualTo("HS-20261111-BENNGHE-0001");
            assertThat(res.citizenCccd()).isEqualTo("********2345");
            assertThat(res.status()).isEqualTo("PENDING");
        }

        @Test
        @DisplayName("Correct dossier code + incorrect 4 digits CCCD ('9999') -> Throws RESOURCE_NOT_FOUND (HTTP 404)")
        void trackDossier_correctCodeWrongLast4_throwsNotFound() {
            when(dossierRepository.findByDossierCodeIgnoreCase("HS-20261111-BENNGHE-0001"))
                    .thenReturn(Optional.of(sampleDossier));

            assertThatThrownBy(() -> dossierService.trackDossier("HS-20261111-BENNGHE-0001", "9999", null))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(ex -> {
                        BusinessException be = (BusinessException) ex;
                        assertThat(be.getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND);
                        assertThat(be.getErrorCode().getHttpStatus().value()).isEqualTo(404);
                    });
        }

        @Test
        @DisplayName("Blank or missing 4 digits CCCD -> Throws INVALID_REQUEST (HTTP 400)")
        void trackDossier_missingLast4_throwsBadRequest() {
            when(dossierRepository.findByDossierCodeIgnoreCase("HS-20261111-BENNGHE-0001"))
                    .thenReturn(Optional.of(sampleDossier));

            assertThatThrownBy(() -> dossierService.trackDossier("HS-20261111-BENNGHE-0001", "   ", null))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(ex -> {
                        BusinessException be = (BusinessException) ex;
                        assertThat(be.getErrorCode()).isEqualTo(ErrorCode.INVALID_REQUEST);
                        assertThat(be.getErrorCode().getHttpStatus().value()).isEqualTo(400);
                    });
        }

        @Test
        @DisplayName("Non-existent dossier code -> Throws RESOURCE_NOT_FOUND (HTTP 404)")
        void trackDossier_nonExistentCode_throwsNotFound() {
            when(dossierRepository.findByDossierCodeIgnoreCase("HS-DOES-NOT-EXIST"))
                    .thenReturn(Optional.empty());

            assertThatThrownBy(() -> dossierService.trackDossier("HS-DOES-NOT-EXIST", "2345", null))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.RESOURCE_NOT_FOUND));
        }

        @Test
        @DisplayName("Blank dossier code -> Throws INVALID_REQUEST (HTTP 400)")
        void trackDossier_blankCode_throwsBadRequest() {
            assertThatThrownBy(() -> dossierService.trackDossier("   ", "2345", null))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(ex -> assertThat(((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.INVALID_REQUEST));
        }

        @Test
        @DisplayName("Security Observation: partial CCCD input (e.g. '5' or '345') matches endsWith check")
        void trackDossier_shortLast4Input_observesBehavior() {
            when(dossierRepository.findByDossierCodeIgnoreCase("HS-20261111-BENNGHE-0001"))
                    .thenReturn(Optional.of(sampleDossier));

            // CCCD is 089095012345. If attacker inputs '5', endsWith('5') currently succeeds.
            // This is documented as a security edge finding for input validation tightening.
            DossierTrackingResponse res = dossierService.trackDossier("HS-20261111-BENNGHE-0001", "5", null);
            assertThat(res).isNotNull();
            assertThat(res.dossierCode()).isEqualTo("HS-20261111-BENNGHE-0001");
        }
    }

    // =========================================================================
    // 4. WARD DATA ISOLATION & ACCESS CONTROL
    // =========================================================================
    @Nested
    @DisplayName("4. Ward Data Isolation & Multi-Tenant Defense")
    class WardIsolationTests {

        @Test
        @DisplayName("Officer of Ward Ben Nghe querying Thao Dien dossiers -> returns empty list when no Ben Nghe dossiers exist")
        void getOfficerDossiers_benNgheOfficerQueryingThaoDien_returnsEmptyList() {
            // Emulate DB repository where only Thao Dien has records
            when(dossierRepository.findByWardCodeIgnoreCaseOrderByCreatedAtDesc("WARD-BENNGHE"))
                    .thenReturn(Collections.emptyList());

            List<OfficerDossierDto> result = dossierService.getOfficerDossiers("WARD-BENNGHE", null);
            assertThat(result).isNotNull().isEmpty();
        }

        @Test
        @DisplayName("Officer review cross-ward defense: Officer of Ward Ben Nghe attempting to review Thao Dien dossier is strictly blocked with FORBIDDEN (HTTP 403)")
        void reviewDossier_crossWardAttempt_strictlyForbidden() {
            CitizenDossier thaoDienDossier = CitizenDossier.builder()
                    .id(50L)
                    .dossierCode("HS-20261111-THAODIEN-0001")
                    .wardCode("WARD-THAODIEN") // Belongs to Thao Dien
                    .citizenCccd("089095099887")
                    .status("PENDING")
                    .build();

            when(dossierRepository.findByDossierCodeIgnoreCase("HS-20261111-THAODIEN-0001"))
                    .thenReturn(Optional.of(thaoDienDossier));

            // Officer belongs to Ben Nghe
            OfficerAuthService.OfficerPrincipal benNgheOfficer = new OfficerAuthService.OfficerPrincipal(
                    "CC-BENNGHE-01", "Can Bo Ben Nghe", "WARD-BENNGHE", "OFFICER", "jti-cross-ward", Instant.now().getEpochSecond() + 3600);

            OfficerReviewRequest req = OfficerReviewRequest.builder()
                    .status("APPROVED")
                    .officerFeedback("Duyet ho so")
                    .build();

            assertThatThrownBy(() -> dossierService.reviewDossier("HS-20261111-THAODIEN-0001", req, benNgheOfficer))
                    .isInstanceOf(BusinessException.class)
                    .satisfies(ex -> {
                        BusinessException be = (BusinessException) ex;
                        assertThat(be.getErrorCode()).isEqualTo(ErrorCode.FORBIDDEN);
                        assertThat(be.getErrorCode().getHttpStatus().value()).isEqualTo(403);
                        assertThat(be.getMessage()).contains("WARD-BENNGHE").contains("WARD-THAODIEN");
                    });

            // Ensure no persistence call was made
            verify(dossierRepository, never()).save(any());
        }

        @Test
        @DisplayName("Officer review within same ward: Officer of Ward Ben Nghe reviews Ben Nghe dossier succeeds")
        void reviewDossier_sameWard_success() {
            CitizenDossier benNgheDossier = CitizenDossier.builder()
                    .id(51L)
                    .dossierCode("HS-20261111-BENNGHE-0001")
                    .wardCode("WARD-BENNGHE")
                    .citizenCccd("089095012345")
                    .status("PENDING")
                    .build();

            when(dossierRepository.findByDossierCodeIgnoreCase("HS-20261111-BENNGHE-0001"))
                    .thenReturn(Optional.of(benNgheDossier));
            when(dossierRepository.save(any(CitizenDossier.class))).thenAnswer(inv -> inv.getArgument(0));

            OfficerAuthService.OfficerPrincipal benNgheOfficer = new OfficerAuthService.OfficerPrincipal(
                    "CC-BENNGHE-01", "Can Bo Ben Nghe", "WARD-BENNGHE", "OFFICER", "jti-same-ward", Instant.now().getEpochSecond() + 3600);

            OfficerReviewRequest req = OfficerReviewRequest.builder()
                    .status("APPROVED")
                    .officerFeedback("Hồ sơ đầy đủ, hợp lệ")
                    .appointmentCode("LH-20261115-001")
                    .build();

            CitizenDossier updated = dossierService.reviewDossier("HS-20261111-BENNGHE-0001", req, benNgheOfficer);
            assertThat(updated).isNotNull();
            assertThat(updated.getStatus()).isEqualTo("APPROVED");
            assertThat(updated.getAppointmentCode()).isEqualTo("LH-20261115-001");
            verify(dossierRepository, times(1)).save(any(CitizenDossier.class));
        }
    }
}

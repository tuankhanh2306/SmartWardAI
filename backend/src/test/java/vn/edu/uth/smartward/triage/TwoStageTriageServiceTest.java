package vn.edu.uth.smartward.triage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import com.fasterxml.jackson.databind.ObjectMapper;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.geo.GeoValidatorService;
import vn.edu.uth.smartward.triage.dto.CivicReportRequest;
import vn.edu.uth.smartward.triage.dto.CivicReportResponse;
import vn.edu.uth.smartward.triage.dto.IssueClusterDto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TwoStageTriageServiceTest {

    @Mock
    private SpatialIndexService spatialIndexService;

    @Mock
    private IssueClusterRepository clusterRepository;

    @Mock
    private CivicReportRepository reportRepository;

    @Mock
    private AiModelClient aiModelClient;

    private TwoStageTriageService triageService;

    @BeforeEach
    void setUp() {
        triageService = new TwoStageTriageService(
                spatialIndexService,
                clusterRepository,
                reportRepository,
                aiModelClient
        );
        ReflectionTestUtils.setField(triageService, "defaultRadiusMeters", 75.0);
        ReflectionTestUtils.setField(triageService, "defaultSimilarityThreshold", 0.82);
        ReflectionTestUtils.setField(triageService, "activeWindowHours", 72);
    }

    @Test
    void testProcessReport_noNearbyCandidates_shouldCreateNewCluster() {
        // Given: Report at UTH Vo Oanh
        CivicReportRequest request = CivicReportRequest.builder()
                .category("ROAD_DAMAGE")
                .description("Ổ gà sâu trước số 15 Võ Oanh")
                .latitude(BigDecimal.valueOf(10.8035600))
                .longitude(BigDecimal.valueOf(106.7142160))
                .build();

        float[] mockVec = new float[768];
        mockVec[0] = 1.0f;
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(mockVec);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[1.0, 0.0]");

        // Phase 1 returns empty list
        when(spatialIndexService.findNearbyClusters(anyDouble(), anyDouble(), eq(75.0)))
                .thenReturn(Collections.emptyList());

        when(clusterRepository.save(any(IssueCluster.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        CivicReportResponse response = triageService.processReport(request);

        // Then
        assertNotNull(response);
        assertTrue(response.isNewCluster(), "Must create new cluster when no spatial candidates exist");
        assertEquals(1, response.getClusterReportCount());
        assertEquals("ROAD_DAMAGE", response.getCategory());
        verify(spatialIndexService).addClusterLocation(anyString(), eq(106.7142160), eq(10.8035600));
        verify(reportRepository).save(any(CivicReport.class));
    }

    @Test
    void testProcessReport_nearbyCandidateWithHighSimilarityAndMatchingCategory_shouldMerge() {
        // Given: Second report on the same pothole within 6.5 meters
        CivicReportRequest request = CivicReportRequest.builder()
                .category("ROAD_DAMAGE")
                .description("Hố sụt lún nguy hiểm trên đường Võ Oanh")
                .latitude(BigDecimal.valueOf(10.8034710))
                .longitude(BigDecimal.valueOf(106.7141780))
                .build();

        float[] incomingVec = new float[768];
        incomingVec[0] = 0.95f;
        incomingVec[1] = 0.31f; // unit norm ~ 1.0
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(incomingVec);

        // Existing cluster: CLUST-001
        float[] existingCentroid = new float[768];
        existingCentroid[0] = 0.94f;
        existingCentroid[1] = 0.34f;
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < 768; i++) {
            sb.append(existingCentroid[i]);
            if (i < 767) sb.append(", ");
        }
        sb.append("]");

        IssueCluster existingCluster = IssueCluster.builder()
                .id(1L)
                .clusterCode("CLUST_20261101_001")
                .category("ROAD_DAMAGE")
                .title("Ổ gà sâu đường Võ Oanh")
                .centerLatitude(BigDecimal.valueOf(10.8035600))
                .centerLongitude(BigDecimal.valueOf(106.7142160))
                .centerEmbedding(sb.toString())
                .reportCount(1)
                .status("OPEN")
                .lastReportedAt(OffsetDateTime.now().minusHours(2))
                .build();

        when(spatialIndexService.findNearbyClusters(anyDouble(), anyDouble(), eq(75.0)))
                .thenReturn(List.of(new SpatialCandidate("CLUST_20261101_001", 6.5)));

        when(clusterRepository.findByClusterCode("CLUST_20261101_001"))
                .thenReturn(Optional.of(existingCluster));

        when(clusterRepository.save(any(IssueCluster.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        CivicReportResponse response = triageService.processReport(request);

        // Then
        assertNotNull(response);
        assertFalse(response.isNewCluster(), "Must merge into existing cluster when spatial, category, and similarity match");
        assertEquals("CLUST_20261101_001", response.getClusterCode());
        assertEquals(2, response.getClusterReportCount());
        assertTrue(response.getSimilarityScore() >= 0.82);
        assertEquals(6.5, response.getDistanceToCenterMeters());
        verify(clusterRepository).save(existingCluster);
        verify(reportRepository).save(any(CivicReport.class));
    }

    @Test
    void testProcessReport_nearbyCandidateWithDifferentCategory_shouldNotMerge() {
        // Given: Flooding report at the same GPS coordinates as a Road Damage cluster
        CivicReportRequest request = CivicReportRequest.builder()
                .category("FLOODING")
                .description("Nước ngập sâu ngập bánh xe trước cổng trường")
                .latitude(BigDecimal.valueOf(10.8035600))
                .longitude(BigDecimal.valueOf(106.7142160))
                .build();

        float[] incomingVec = new float[768];
        incomingVec[0] = 1.0f;
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(incomingVec);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[1.0, 0.0]");

        // Existing cluster is ROAD_DAMAGE
        IssueCluster roadDamageCluster = IssueCluster.builder()
                .clusterCode("CLUST_ROAD_01")
                .category("ROAD_DAMAGE")
                .centerLatitude(BigDecimal.valueOf(10.8035600))
                .centerLongitude(BigDecimal.valueOf(106.7142160))
                .centerEmbedding("[1.0, 0.0]")
                .reportCount(1)
                .status("OPEN")
                .lastReportedAt(OffsetDateTime.now())
                .build();

        when(spatialIndexService.findNearbyClusters(anyDouble(), anyDouble(), eq(75.0)))
                .thenReturn(List.of(new SpatialCandidate("CLUST_ROAD_01", 1.0)));

        when(clusterRepository.findByClusterCode("CLUST_ROAD_01"))
                .thenReturn(Optional.of(roadDamageCluster));

        when(clusterRepository.save(any(IssueCluster.class))).thenAnswer(inv -> inv.getArgument(0));

        // When
        CivicReportResponse response = triageService.processReport(request);

        // Then: Must NOT merge despite 1.0m distance because categories differ!
        assertNotNull(response);
        assertTrue(response.isNewCluster(), "Must create separate cluster when categories differ");
        assertEquals("FLOODING", response.getCategory());
        assertNotEquals("CLUST_ROAD_01", response.getClusterCode());
    }

    @Test
    void testWarmUpSpatialIndexFromDatabase_shouldSyncActiveClustersWithinWindow() {
        IssueCluster activeCluster = IssueCluster.builder()
                .clusterCode("CLUST_ACTIVE_01")
                .category("ROAD_DAMAGE")
                .centerLatitude(BigDecimal.valueOf(10.8035600))
                .centerLongitude(BigDecimal.valueOf(106.7142160))
                .status("OPEN")
                .lastReportedAt(OffsetDateTime.now().minusHours(12))
                .build();

        IssueCluster expiredCluster = IssueCluster.builder()
                .clusterCode("CLUST_EXPIRED_02")
                .category("FLOODING")
                .centerLatitude(BigDecimal.valueOf(10.8040000))
                .centerLongitude(BigDecimal.valueOf(106.7150000))
                .status("IN_PROGRESS")
                .lastReportedAt(OffsetDateTime.now().minusHours(100)) // Older than 72h window
                .build();

        when(clusterRepository.findByStatus("OPEN"))
                .thenReturn(List.of(activeCluster));
        when(clusterRepository.findByStatus("IN_PROGRESS"))
                .thenReturn(List.of(expiredCluster));

        int syncedCount = triageService.warmUpSpatialIndexFromDatabase();

        assertEquals(1, syncedCount, "Should only sync active clusters within the 72h window");
        verify(spatialIndexService, times(1)).addClusterLocation(eq("CLUST_ACTIVE_01"), eq(106.7142160), eq(10.8035600));
        verify(spatialIndexService, never()).addClusterLocation(eq("CLUST_EXPIRED_02"), anyDouble(), anyDouble());
    }

    @Test
    void testProcessReport_unconfirmedWardDefaultLocation_shouldThrowBusinessException() {
        CivicReportRequest request = CivicReportRequest.builder()
                .category("ROAD_DAMAGE")
                .description("Sự cố chưa xác nhận vị trí")
                .latitude(BigDecimal.valueOf(10.8035600))
                .longitude(BigDecimal.valueOf(106.7142160))
                .locationSource("WARD_DEFAULT")
                .build();

        vn.edu.uth.smartward.common.BusinessException ex = assertThrows(
                vn.edu.uth.smartward.common.BusinessException.class,
                () -> triageService.processReport(request)
        );
        assertTrue(ex.getMessage().contains("chưa được xác nhận"));
    }

    @Test
    void testProcessReport_withAddressAndPinLocation_shouldPersistCorrectly() {
        CivicReportRequest request = CivicReportRequest.builder()
                .category("ENVIRONMENT")
                .description("Đống rác tự phát lớn trước ngõ")
                .latitude(BigDecimal.valueOf(10.8035600))
                .longitude(BigDecimal.valueOf(106.7142160))
                .addressText("Số 15 Võ Oanh, Phường 25")
                .locationSource("PIN_DRAGGED")
                .locationAccuracyM(5.0)
                .build();

        float[] mockVec = new float[768];
        mockVec[0] = 1.0f;
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(mockVec);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[1.0, 0.0]");
        when(spatialIndexService.findNearbyClusters(anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(Collections.emptyList());
        when(clusterRepository.save(any(IssueCluster.class))).thenAnswer(inv -> inv.getArgument(0));

        CivicReportResponse resp = triageService.processReport(request);
        assertNotNull(resp);
        assertEquals("Số 15 Võ Oanh, Phường 25", resp.getAddressText());

        org.mockito.ArgumentCaptor<CivicReport> reportCaptor = org.mockito.ArgumentCaptor.forClass(CivicReport.class);
        verify(reportRepository).save(reportCaptor.capture());
        CivicReport saved = reportCaptor.getValue();
        assertEquals("Số 15 Võ Oanh, Phường 25", saved.getAddressText());
        assertEquals("PIN_DRAGGED", saved.getLocationSource());
        assertEquals(5.0, saved.getLocationAccuracyM());
    }

    @Test
    void testGetActiveClusters_returnsRealLocationMetadataWithoutHardcodingGps() {
        IssueCluster pinCluster = IssueCluster.builder()
                .id(10L)
                .clusterCode("CLUST_PIN_01")
                .category("ROAD_DAMAGE")
                .title("Ổ gà đường Trần Hưng Đạo")
                .centerLatitude(new BigDecimal("10.3839650"))
                .centerLongitude(new BigDecimal("105.4267160"))
                .reportCount(1)
                .status("OPEN")
                .reports(List.of(CivicReport.builder()
                        .reportCode("RPT_PIN_01")
                        .category("ROAD_DAMAGE")
                        .addressText("Số 18 Trần Hưng Đạo, Phường Long Xuyên")
                        .locationSource("PIN_DRAGGED")
                        .locationAccuracyM(6.5)
                        .build()))
                .build();

        IssueCluster nullSourceCluster = IssueCluster.builder()
                .id(11L)
                .clusterCode("CLUST_NULL_SRC")
                .category("FLOODING")
                .title("Ngập nước hẻm nhỏ")
                .centerLatitude(new BigDecimal("10.3840000"))
                .centerLongitude(new BigDecimal("105.4268000"))
                .reportCount(1)
                .status("OPEN")
                .reports(List.of(CivicReport.builder()
                        .reportCode("RPT_NULL_01")
                        .category("FLOODING")
                        .addressText("Hẻm 2, Phường Long Xuyên")
                        .locationSource(null)
                        .locationAccuracyM(null)
                        .build()))
                .build();

        when(clusterRepository.findByStatus("OPEN")).thenReturn(List.of(pinCluster, nullSourceCluster));

        List<IssueClusterDto> dtos = triageService.getActiveClusters("OPEN", null);
        assertEquals(2, dtos.size());

        IssueClusterDto pinDto = dtos.get(0);
        assertEquals("Số 18 Trần Hưng Đạo, Phường Long Xuyên", pinDto.getAddressText());
        assertEquals("PIN_DRAGGED", pinDto.getLocationSource());
        assertEquals(6.5, pinDto.getLocationAccuracyM());

        IssueClusterDto nullDto = dtos.get(1);
        assertEquals("Hẻm 2, Phường Long Xuyên", nullDto.getAddressText());
        assertNull(nullDto.getLocationSource(), "Must NOT hardcode 'GPS' when report locationSource is null");
        assertNull(nullDto.getLocationAccuracyM());
    }

    @Test
    void testFlow01_webLightingAndMobileLightingElectricalWithin25m_mustMergeIntoSingleCluster() {
        ReflectionTestUtils.setField(triageService, "defaultRadiusMeters", 25.0);

        float[] vec = new float[768];
        vec[0] = 1.0f;
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(vec);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[1.0, 0.0]");
        when(spatialIndexService.findNearbyClusters(anyDouble(), anyDouble(), eq(25.0)))
                .thenReturn(Collections.emptyList())
                .thenReturn(List.of(new SpatialCandidate("CLUST_LIGHT_01", 8.0)));
        when(clusterRepository.save(any(IssueCluster.class))).thenAnswer(inv -> inv.getArgument(0));

        // 1. Report from Web using legacy alias category "LIGHTING"
        CivicReportRequest webReq = CivicReportRequest.builder()
                .category("LIGHTING")
                .description("Đèn đường số 12 bị tắt cả tuần nay")
                .latitude(new BigDecimal("10.3839650"))
                .longitude(new BigDecimal("105.4267160"))
                .locationSource("GPS")
                .build();
        CivicReportResponse webResp = triageService.processReport(webReq);
        assertTrue(webResp.isNewCluster());
        assertEquals("LIGHTING_ELECTRICAL", webResp.getCategory());

        IssueCluster createdCluster = IssueCluster.builder()
                .id(1L)
                .clusterCode("CLUST_LIGHT_01")
                .category(webResp.getCategory())
                .title("Đèn đường số 12 bị tắt cả tuần nay")
                .centerLatitude(new BigDecimal("10.3839650"))
                .centerLongitude(new BigDecimal("105.4267160"))
                .centerEmbedding("[1.0, 0.0]")
                .reportCount(1)
                .status("OPEN")
                .lastReportedAt(OffsetDateTime.now())
                .build();
        when(clusterRepository.findByClusterCode("CLUST_LIGHT_01")).thenReturn(Optional.of(createdCluster));

        // 2. Report from Mobile using canonical "LIGHTING_ELECTRICAL" within 8m <= 25m
        CivicReportRequest mobileReq = CivicReportRequest.builder()
                .category("LIGHTING_ELECTRICAL")
                .description("Trụ đèn đường số 12 không sáng vào ban đêm")
                .latitude(new BigDecimal("10.3840100"))
                .longitude(new BigDecimal("105.4267500"))
                .locationSource("PIN_DRAGGED")
                .build();
        CivicReportResponse mobileResp = triageService.processReport(mobileReq);

        assertFalse(mobileResp.isNewCluster(), "Web LIGHTING and Mobile LIGHTING_ELECTRICAL within R<=25m must merge into 1 cluster");
        assertEquals("CLUST_LIGHT_01", mobileResp.getClusterCode());
        assertEquals(2, mobileResp.getClusterReportCount());
        assertEquals("LIGHTING_ELECTRICAL", mobileResp.getCategory());
    }

    @Test
    void testSec02_publicSanitizesCoordinatesAndOfficerIsolatesByWard() {
        GeoValidatorService realGeoValidator = new GeoValidatorService(new ObjectMapper());
        realGeoValidator.init();

        TwoStageTriageService geoAwareTriage = new TwoStageTriageService(
                spatialIndexService,
                clusterRepository,
                reportRepository,
                aiModelClient,
                realGeoValidator
        );

        IssueCluster longXuyenCluster = IssueCluster.builder()
                .id(1L)
                .clusterCode("CLUST_LX_01")
                .category("ROAD_DAMAGE")
                .title("Sụt lún đường Trần Hưng Đạo")
                .centerLatitude(new BigDecimal("10.3839651"))
                .centerLongitude(new BigDecimal("105.4267162"))
                .reportCount(2)
                .status("OPEN")
                .reports(List.of(CivicReport.builder()
                        .reportCode("RPT_LX_01")
                        .category("ROAD_DAMAGE")
                        .addressText("Số 18 Trần Hưng Đạo, Phường Long Xuyên")
                        .locationSource("PIN_DRAGGED")
                        .locationAccuracyM(5.0)
                        .build()))
                .build();

        when(clusterRepository.findByStatus("OPEN")).thenReturn(List.of(longXuyenCluster));

        // 1. Public view: coords rounded to 3 decimals, no addressText, no accuracy, no locationSource
        List<IssueClusterDto> publicDtos = geoAwareTriage.getPublicActiveClusters("OPEN", null);
        assertEquals(1, publicDtos.size());
        IssueClusterDto pub = publicDtos.get(0);
        assertEquals(new BigDecimal("10.384"), pub.getCenterLatitude());
        assertEquals(new BigDecimal("105.427"), pub.getCenterLongitude());
        assertNull(pub.getAddressText());
        assertNull(pub.getLocationAccuracyM());
        assertNull(pub.getLocationSource());

        // 2. Long Xuyên officer sees full 7-decimal coords and address details
        List<IssueClusterDto> lxOfficerDtos = geoAwareTriage.getOfficerClusters("OPEN", null, "AG_P_LONGXUYEN");
        assertEquals(1, lxOfficerDtos.size());
        IssueClusterDto lxDto = lxOfficerDtos.get(0);
        assertEquals(new BigDecimal("10.3839651"), lxDto.getCenterLatitude());
        assertEquals(new BigDecimal("105.4267162"), lxDto.getCenterLongitude());
        assertEquals("Số 18 Trần Hưng Đạo, Phường Long Xuyên", lxDto.getAddressText());
        assertEquals("PIN_DRAGGED", lxDto.getLocationSource());
        assertEquals(5.0, lxDto.getLocationAccuracyM());

        // 3. Châu Đốc officer cannot see Long Xuyên cluster
        List<IssueClusterDto> cdOfficerDtos = geoAwareTriage.getOfficerClusters("OPEN", null, "AG_P_CHAUDOC");
        assertTrue(cdOfficerDtos.isEmpty(), "Officer of Châu Đốc must NOT see Long Xuyên clusters");
    }

    @Test
    void testProcessReport_duplicateIdempotencyKey_returnsCachedResponseWithoutDuplicateSave() {
        CivicReportRequest request = CivicReportRequest.builder()
                .category("FLOODING")
                .description("Ngập sâu 35cm trước cổng chợ Long Xuyên")
                .latitude(new BigDecimal("10.3839650"))
                .longitude(new BigDecimal("105.4267160"))
                .locationSource("GPS")
                .wardCode("AG_P_LONGXUYEN")
                .build();

        float[] mockVec = new float[768];
        mockVec[0] = 1.0f;
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(mockVec);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[1.0, 0.0]");
        when(spatialIndexService.findNearbyClusters(anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(Collections.emptyList());
        when(clusterRepository.save(any(IssueCluster.class))).thenAnswer(inv -> inv.getArgument(0));

        CivicReportResponse first = triageService.processReport(request, "OFFLINE_INC_DUP_001");
        CivicReportResponse second = triageService.processReport(request, "OFFLINE_INC_DUP_001");

        assertNotNull(first);
        assertEquals(first.getReportCode(), second.getReportCode());
        assertEquals(first.getClusterCode(), second.getClusterCode());
        verify(clusterRepository, times(1)).save(any(IssueCluster.class));
        verify(reportRepository, times(1)).save(any(CivicReport.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void testProcessReport_redisIdempotencyHit_shortCircuitsProcessing() throws Exception {
        StringRedisTemplate redisTemplate = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);

        ObjectMapper mapper = new ObjectMapper();
        CivicReportResponse stored = CivicReportResponse.builder()
                .reportCode("RPT_REDIS_HIT_001")
                .clusterCode("CLUST_REDIS_HIT_001")
                .newCluster(true)
                .category("ROAD_DAMAGE")
                .clusterReportCount(1)
                .build();
        when(valueOps.get("smartward:triage:idempotency:OFFLINE_INC_REDIS_1"))
                .thenReturn(mapper.writeValueAsString(stored));

        triageService.setIdempotencyDependencies(redisTemplate, mapper);

        CivicReportRequest request = CivicReportRequest.builder()
                .category("ROAD_DAMAGE")
                .description("Hố ga mất nắp nguy hiểm cho người đi bộ")
                .latitude(new BigDecimal("10.3839650"))
                .longitude(new BigDecimal("105.4267160"))
                .locationSource("GPS")
                .build();

        CivicReportResponse replayed = triageService.processReport(request, "OFFLINE_INC_REDIS_1");

        assertEquals("RPT_REDIS_HIT_001", replayed.getReportCode());
        assertEquals("CLUST_REDIS_HIT_001", replayed.getClusterCode());
        verifyNoInteractions(aiModelClient, reportRepository, clusterRepository);
    }

    @Test
    void testProcessReport_idempotencyCacheIsBoundedAt1000() {
        CivicReportRequest request = CivicReportRequest.builder()
                .category("ENVIRONMENT")
                .description("Rác sinh hoạt tồn đọng 3 ngày chưa thu gom")
                .latitude(new BigDecimal("10.3839650"))
                .longitude(new BigDecimal("105.4267160"))
                .locationSource("GPS")
                .build();

        float[] mockVec = new float[768];
        mockVec[0] = 1.0f;
        when(aiModelClient.generateEmbedding(anyString())).thenReturn(mockVec);
        when(aiModelClient.toPgVectorString(any())).thenReturn("[1.0, 0.0]");
        when(spatialIndexService.findNearbyClusters(anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(Collections.emptyList());
        when(clusterRepository.save(any(IssueCluster.class))).thenAnswer(inv -> inv.getArgument(0));

        for (int i = 0; i < 1050; i++) {
            triageService.processReport(request, "OFFLINE_INC_CAP_" + i);
        }

        assertTrue(triageService.getIdempotencyCacheSize() <= TwoStageTriageService.MAX_IDEMPOTENCY_CACHE_SIZE,
                "In-memory idempotencyCache must remain bounded at <= 1000 entries");
    }
}

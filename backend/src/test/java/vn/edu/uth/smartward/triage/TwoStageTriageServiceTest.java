package vn.edu.uth.smartward.triage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.triage.dto.CivicReportRequest;
import vn.edu.uth.smartward.triage.dto.CivicReportResponse;

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
}

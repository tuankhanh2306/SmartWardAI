package vn.edu.uth.smartward.triage;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.uth.smartward.security.OfficerAuthService.OfficerPrincipal;
import vn.edu.uth.smartward.triage.dto.CivicReportRequest;
import vn.edu.uth.smartward.triage.dto.CivicReportResponse;
import vn.edu.uth.smartward.triage.dto.IssueClusterDto;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TriageController.class)
@AutoConfigureMockMvc(addFilters = false)
class TriageControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private TwoStageTriageService triageService;

    @Test
    void testReportIssue_success() throws Exception {
        CivicReportResponse mockResponse = CivicReportResponse.builder()
                .reportCode("RPT_20261104_001")
                .clusterCode("CLUST_20261104_001")
                .newCluster(true)
                .category("ROAD_DAMAGE")
                .clusterReportCount(1)
                .distanceToCenterMeters(0.0)
                .similarityScore(1.0)
                .message("Đã khởi tạo cụm sự cố mới.")
                .build();

        when(triageService.processReport(any(CivicReportRequest.class))).thenReturn(mockResponse);

        CivicReportRequest request = CivicReportRequest.builder()
                .category("ROAD_DAMAGE")
                .description("Đường Võ Oanh bị sụt lún nguy hiểm")
                .latitude(BigDecimal.valueOf(10.80356))
                .longitude(BigDecimal.valueOf(106.714216))
                .build();

        mockMvc.perform(post("/api/v1/issues/report")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reportCode").value("RPT_20261104_001"))
                .andExpect(jsonPath("$.data.clusterCode").value("CLUST_20261104_001"))
                .andExpect(jsonPath("$.data.newCluster").value(true));
    }

    @Test
    void testGetClusters_publicSanitizesCoordinatesAndSensitiveMetadata() throws Exception {
        IssueClusterDto dto = IssueClusterDto.builder()
                .id(1L)
                .clusterCode("CLUST_001")
                .category("ROAD_DAMAGE")
                .title("Hố sụt lún đường Trần Hưng Đạo")
                .centerLatitude(new BigDecimal("10.3839654"))
                .centerLongitude(new BigDecimal("105.4267168"))
                .addressText("Số 18 Trần Hưng Đạo, Phường Long Xuyên")
                .locationSource("PIN_DRAGGED")
                .locationAccuracyM(5.0)
                .reportCount(3)
                .status("OPEN")
                .build();

        when(triageService.getActiveClusters(anyString(), any())).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/issues/clusters")
                        .param("status", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].clusterCode").value("CLUST_001"))
                .andExpect(jsonPath("$.data[0].reportCount").value(3))
                .andExpect(jsonPath("$.data[0].centerLatitude").value(10.384))
                .andExpect(jsonPath("$.data[0].centerLongitude").value(105.427))
                .andExpect(jsonPath("$.data[0].addressText").doesNotExist())
                .andExpect(jsonPath("$.data[0].locationAccuracyM").doesNotExist())
                .andExpect(jsonPath("$.data[0].locationSource").doesNotExist());
    }

    @Test
    void testGetOfficerClusters_returnsFullDetailForOwnWardAndBlocksCrossWard() throws Exception {
        IssueClusterDto detailed = IssueClusterDto.builder()
                .id(1L)
                .clusterCode("CLUST_LX_01")
                .category("ROAD_DAMAGE")
                .title("Hố sụt lún đường Trần Hưng Đạo")
                .centerLatitude(new BigDecimal("10.3839654"))
                .centerLongitude(new BigDecimal("105.4267168"))
                .addressText("Số 18 Trần Hưng Đạo, Phường Long Xuyên")
                .locationSource("PIN_DRAGGED")
                .locationAccuracyM(6.5)
                .wardCode("AG_P_LONGXUYEN")
                .reportCount(2)
                .status("OPEN")
                .build();

        when(triageService.getOfficerClusters(eq("OPEN"), any(), eq("AG_P_LONGXUYEN")))
                .thenReturn(List.of(detailed));

        OfficerPrincipal lxOfficer = new OfficerPrincipal(
                "CC-AG-8942", "Trần Quốc Bảo", "AG_P_LONGXUYEN", "OFFICER", "jti-1", 9999999999L
        );

        mockMvc.perform(get("/api/v1/issues/officer/clusters")
                        .param("status", "OPEN")
                        .requestAttr("officerPrincipal", lxOfficer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].centerLatitude").value(10.3839654))
                .andExpect(jsonPath("$.data[0].centerLongitude").value(105.4267168))
                .andExpect(jsonPath("$.data[0].addressText").value("Số 18 Trần Hưng Đạo, Phường Long Xuyên"))
                .andExpect(jsonPath("$.data[0].locationAccuracyM").value(6.5))
                .andExpect(jsonPath("$.data[0].locationSource").value("PIN_DRAGGED"));

        // Cross-ward request must be rejected with HTTP 403 FORBIDDEN
        mockMvc.perform(get("/api/v1/issues/officer/clusters")
                        .param("wardCode", "AG_P_CHAUDOC")
                        .requestAttr("officerPrincipal", lxOfficer))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void testReportIssue_withIdempotencyKeyHeader_forwardsKeyToService() throws Exception {
        CivicReportResponse mockResponse = CivicReportResponse.builder()
                .reportCode("RPT_20261123_001")
                .clusterCode("CLUST_20261123_001")
                .newCluster(true)
                .category("ROAD_DAMAGE")
                .clusterReportCount(1)
                .build();

        when(triageService.processReport(any(CivicReportRequest.class), eq("OFFLINE_INC_TEST_001")))
                .thenReturn(mockResponse);

        CivicReportRequest request = CivicReportRequest.builder()
                .category("ROAD_DAMAGE")
                .description("Mặt đường sụt lún đoạn qua chợ Long Xuyên")
                .latitude(BigDecimal.valueOf(10.3839650))
                .longitude(BigDecimal.valueOf(105.4267160))
                .locationSource("GPS")
                .build();

        mockMvc.perform(post("/api/v1/issues/report")
                        .header("Idempotency-Key", "OFFLINE_INC_TEST_001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reportCode").value("RPT_20261123_001"));

        verify(triageService).processReport(any(CivicReportRequest.class), eq("OFFLINE_INC_TEST_001"));
    }
}

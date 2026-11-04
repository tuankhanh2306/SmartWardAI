package vn.edu.uth.smartward.triage;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.uth.smartward.triage.dto.CivicReportRequest;
import vn.edu.uth.smartward.triage.dto.CivicReportResponse;
import vn.edu.uth.smartward.triage.dto.IssueClusterDto;

import java.math.BigDecimal;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TriageController.class)
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
    void testGetClusters_success() throws Exception {
        IssueClusterDto dto = IssueClusterDto.builder()
                .id(1L)
                .clusterCode("CLUST_001")
                .category("ROAD_DAMAGE")
                .title("Hố sụt lún đường Võ Oanh")
                .centerLatitude(BigDecimal.valueOf(10.80356))
                .centerLongitude(BigDecimal.valueOf(106.714216))
                .reportCount(3)
                .status("OPEN")
                .build();

        when(triageService.getActiveClusters(anyString(), any())).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/issues/clusters")
                        .param("status", "OPEN"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].clusterCode").value("CLUST_001"))
                .andExpect(jsonPath("$.data[0].reportCount").value(3));
    }
}

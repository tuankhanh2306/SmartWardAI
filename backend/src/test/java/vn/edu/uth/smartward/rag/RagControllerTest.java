package vn.edu.uth.smartward.rag;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.uth.smartward.rag.dto.LegalCitationDto;
import vn.edu.uth.smartward.rag.dto.RagAskRequest;
import vn.edu.uth.smartward.rag.dto.RagAskResponse;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RagController.class)
class RagControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private RagQueryService ragQueryService;

    @Test
    void testAskQuestion_success() throws Exception {
        RagAskResponse mockResponse = RagAskResponse.builder()
                .answer("Hồ sơ khai sinh cần giấy chứng sinh.")
                .abstained(false)
                .maxSimilarity(0.89)
                .appliedThreshold(0.78)
                .citations(List.of(
                        LegalCitationDto.builder()
                                .chunkCode("KS-01-DK")
                                .procedureName("Đăng ký khai sinh")
                                .legalReference("Điều 15 Luật Hộ tịch")
                                .similarityScore(0.89)
                                .build()
                ))
                .disclaimer(RagQueryService.LEGAL_DISCLAIMER)
                .responseTimeMs(55)
                .build();

        when(ragQueryService.askQuestion(any(RagAskRequest.class), anyString())).thenReturn(mockResponse);

        RagAskRequest request = RagAskRequest.builder()
                .question("Tôi muốn làm khai sinh cho con")
                .topK(3)
                .similarityThreshold(0.78)
                .build();

        mockMvc.perform(post("/api/v1/rag/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request))
                        .header("X-Forwarded-For", "203.162.0.1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.answer").value("Hồ sơ khai sinh cần giấy chứng sinh."))
                .andExpect(jsonPath("$.data.abstained").value(false))
                .andExpect(jsonPath("$.data.maxSimilarity").value(0.89))
                .andExpect(jsonPath("$.data.citations[0].chunkCode").value("KS-01-DK"));
    }

    @Test
    void testAskQuestion_validationFailed_whenQuestionIsBlank() throws Exception {
        RagAskRequest request = RagAskRequest.builder()
                .question("   ")
                .build();

        mockMvc.perform(post("/api/v1/rag/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("SW_422"));
    }

    @Test
    void testAskQuestion_successWithQueryAlias() throws Exception {
        RagAskResponse mockResponse = RagAskResponse.builder()
                .answer("Hồ sơ khai sinh cần giấy chứng sinh.")
                .abstained(false)
                .maxSimilarity(0.89)
                .disclaimer(RagQueryService.LEGAL_DISCLAIMER)
                .build();

        when(ragQueryService.askQuestion(any(RagAskRequest.class), anyString())).thenReturn(mockResponse);

        String jsonWithQuery = "{\"query\":\"Tôi muốn làm khai sinh cho con\",\"topK\":3,\"wardName\":\"Xã An Phú\"}";

        mockMvc.perform(post("/api/v1/rag/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonWithQuery))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.answer").value("Hồ sơ khai sinh cần giấy chứng sinh."));
    }
}

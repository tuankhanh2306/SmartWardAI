package vn.edu.uth.smartward.dossier;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CitizenDossierControllerTest {

    private MockMvc mockMvc;

    @Mock
    private CitizenDossierService dossierService;

    @InjectMocks
    private CitizenDossierController dossierController;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(dossierController).build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("POST /api/v1/dossiers returns HTTP 201 Created")
    void submitDossier_returns201() throws Exception {
        DossierSubmissionResponse res = DossierSubmissionResponse.builder()
                .dossierCode("HS-20261111-BENNGHE-0001")
                .procedureCode("TTHC-CT-01")
                .wardCode("WARD-AG-01")
                .status("PENDING")
                .slaDeadline(Instant.now().plusSeconds(86400 * 3))
                .createdAt(Instant.now())
                .build();

        when(dossierService.submitDossier(any(SubmitDossierRequest.class))).thenReturn(res);

        SubmitDossierRequest req = SubmitDossierRequest.builder()
                .procedureCode("TTHC-CT-01")
                .wardCode("WARD-AG-01")
                .citizenCccd("089095012345")
                .formData(Map.of("fullName", "NGUYEN VAN A"))
                .build();

        mockMvc.perform(post("/api/v1/dossiers")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.dossierCode").value("HS-20261111-BENNGHE-0001"))
                .andExpect(jsonPath("$.data.status").value("PENDING"));
    }

    @Test
    @DisplayName("GET /api/v1/dossiers/track returns HTTP 200 OK")
    void trackDossier_returns200() throws Exception {
        DossierTrackingResponse res = DossierTrackingResponse.builder()
                .dossierCode("HS-20261111-BENNGHE-0001")
                .procedureCode("TTHC-CR-01")
                .procedureName("Đăng ký khai sinh")
                .wardCode("WARD-AG-01")
                .citizenCccd("********2345")
                .status("PENDING")
                .slaDeadline(Instant.now().plusSeconds(86400 * 3))
                .build();

        when(dossierService.trackDossier(eq("HS-20261111-BENNGHE-0001"), eq("2345"), any()))
                .thenReturn(res);

        mockMvc.perform(get("/api/v1/dossiers/track")
                        .param("dossierCode", "HS-20261111-BENNGHE-0001")
                        .param("last4Cccd", "2345")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.dossierCode").value("HS-20261111-BENNGHE-0001"))
                .andExpect(jsonPath("$.data.citizenCccd").value("********2345"));
    }

    @Test
    @DisplayName("GET /api/v1/dossiers/officer/list returns HTTP 200 OK")
    void getOfficerDossiers_returns200() throws Exception {
        OfficerDossierDto item = OfficerDossierDto.builder()
                .id(1L)
                .dossierCode("HS-001")
                .procedureCode("TTHC-CT-01")
                .procedureName("Đăng ký thường trú")
                .wardCode("WARD-AG-01")
                .citizenCccd("089095012345")
                .citizenName("NGUYEN VAN A")
                .status("PENDING")
                .build();

        when(dossierService.getOfficerDossiers(eq("WARD-AG-01"), any()))
                .thenReturn(List.of(item));

        mockMvc.perform(get("/api/v1/dossiers/officer/list")
                        .param("wardCode", "WARD-AG-01")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].dossierCode").value("HS-001"))
                .andExpect(jsonPath("$.data[0].citizenName").value("NGUYEN VAN A"));
    }

    @Test
    @DisplayName("PUT /api/v1/dossiers/{code}/review returns HTTP 200 OK")
    void reviewDossier_returns200() throws Exception {
        CitizenDossier mockSaved = CitizenDossier.builder()
                .id(1L)
                .dossierCode("HS-001")
                .procedureCode("TTHC-CT-01")
                .wardCode("WARD-AG-01")
                .citizenCccd("089095012345")
                .status("APPROVED")
                .officerFeedback("Hồ sơ hợp lệ")
                .appointmentCode("LH-20261112-001")
                .build();

        OfficerDossierDto mappedDto = OfficerDossierDto.builder()
                .id(1L)
                .dossierCode("HS-001")
                .procedureCode("TTHC-CT-01")
                .wardCode("WARD-AG-01")
                .citizenCccd("089095012345")
                .status("APPROVED")
                .officerFeedback("Hồ sơ hợp lệ")
                .appointmentCode("LH-20261112-001")
                .build();

        when(dossierService.reviewDossier(eq("HS-001"), any(OfficerReviewRequest.class), any()))
                .thenReturn(mockSaved);
        when(dossierService.mapToOfficerDto(mockSaved)).thenReturn(mappedDto);

        OfficerReviewRequest req = OfficerReviewRequest.builder()
                .status("APPROVED")
                .officerFeedback("Hồ sơ hợp lệ")
                .appointmentCode("LH-20261112-001")
                .build();

        mockMvc.perform(put("/api/v1/dossiers/HS-001/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("APPROVED"))
                .andExpect(jsonPath("$.data.appointmentCode").value("LH-20261112-001"));
    }
}

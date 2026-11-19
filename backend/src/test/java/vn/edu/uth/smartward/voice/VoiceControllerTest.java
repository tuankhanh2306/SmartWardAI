package vn.edu.uth.smartward.voice;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VoiceController.class)
@AutoConfigureMockMvc(addFilters = false)
class VoiceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private VoiceService voiceService;

    @Test
    @DisplayName("POST /api/v1/voice/synthesize returns 200 with audio/wav when synthesis succeeds")
    void synthesize_success() throws Exception {
        byte[] fakeWav = new byte[]{0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00}; // RIFF...
        when(voiceService.synthesize(anyString())).thenReturn(fakeWav);

        VoiceSynthesizeRequest request = VoiceSynthesizeRequest.builder()
                .text("Xin chào công dân.")
                .build();

        mockMvc.perform(post("/api/v1/voice/synthesize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "audio/wav"))
                .andExpect(header().string("Cache-Control", "public, max-age=86400"))
                .andExpect(content().bytes(fakeWav));
    }

    @Test
    @DisplayName("POST /api/v1/voice/synthesize returns 422 when text is empty")
    void synthesize_emptyText_returnsUnprocessableEntity() throws Exception {
        VoiceSynthesizeRequest request = VoiceSynthesizeRequest.builder()
                .text("   ")
                .build();

        mockMvc.perform(post("/api/v1/voice/synthesize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("POST /api/v1/voice/synthesize returns 503 when sidecar is unavailable")
    void synthesize_sidecarUnavailable_returns503() throws Exception {
        when(voiceService.synthesize(anyString())).thenThrow(new RuntimeException("Sidecar connection timeout"));

        VoiceSynthesizeRequest request = VoiceSynthesizeRequest.builder()
                .text("Thủ tục đăng ký khai sinh.")
                .build();

        mockMvc.perform(post("/api/v1/voice/synthesize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error").exists());
    }
}

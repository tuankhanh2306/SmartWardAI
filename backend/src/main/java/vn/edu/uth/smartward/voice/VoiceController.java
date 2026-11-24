package vn.edu.uth.smartward.voice;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * REST controller for citizen speech synthesis using offline AI Piper TTS.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/voice")
@RequiredArgsConstructor
@Tag(name = "Voice Synthesis", description = "Dịch vụ phát âm thanh giọng đọc AI tiếng Việt offline")
public class VoiceController {

    private final VoiceService voiceService;

    @PostMapping("/synthesize")
    @Operation(
            summary = "Chuyển đổi văn bản hành chính thành giọng nói tiếng Việt",
            description = "Sử dụng mô hình Piper TTS ONNX tiếng Việt chạy trực tiếp trong cụm container để sinh âm thanh WAV."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Sinh âm thanh thành công (audio/wav)"),
            @ApiResponse(responseCode = "422", description = "Dữ liệu văn bản không hợp lệ"),
            @ApiResponse(responseCode = "503", description = "Dịch vụ giọng nói sidecar tạm thời không khả dụng")
    })
    public ResponseEntity<?> synthesize(
            @Valid @RequestBody VoiceSynthesizeRequest request,
            HttpServletRequest httpRequest
    ) {
        log.info("Received voice synthesize request, text length: {}", request.getText().length());
        try {
            byte[] wavBytes = voiceService.synthesize(request.getText());

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType("audio/wav"));
            headers.setContentLength(wavBytes.length);
            headers.setCacheControl("public, max-age=86400"); // Cache audio for 24h

            return new ResponseEntity<>(wavBytes, headers, HttpStatus.OK);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            log.warn("Voice synthesis failed: {}", ex.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("error", "Dịch vụ giọng nói AI tạm thời không khả dụng: " + ex.getMessage()));
        }
    }
}

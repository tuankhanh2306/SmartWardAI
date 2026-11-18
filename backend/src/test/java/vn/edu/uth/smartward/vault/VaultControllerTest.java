package vn.edu.uth.smartward.vault;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ClientIpResolver;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.common.RedisRateLimiter;
import vn.edu.uth.smartward.vault.dto.VaultUploadResponse;

import java.time.OffsetDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VaultController.class)
@AutoConfigureMockMvc(addFilters = false)
class VaultControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ZeroTrustVaultService vaultService;

    @MockBean
    private RedisRateLimiter rateLimiter;

    @MockBean
    private ClientIpResolver clientIpResolver;

    @Test
    void testUploadDocument_success() throws Exception {
        when(clientIpResolver.resolve(any())).thenReturn("198.51.100.10");
        when(rateLimiter.allowVaultUpload(eq("198.51.100.10"), any())).thenReturn(true);

        VaultUploadResponse mockResponse = VaultUploadResponse.builder()
                .documentCode("DOC_20261104_001")
                .oneTimeToken("OTT_123456789")
                .viewUrl("/api/v1/vault/view/OTT_123456789")
                .expiresAt(OffsetDateTime.now().plusHours(24))
                .watermarkApplied(true)
                .encryptionAlgorithm("AES/GCM/NoPadding (256-bit)")
                .message("Tài liệu đã được bảo mật thành công.")
                .build();

        when(vaultService.storeDocument(any(), anyString())).thenReturn(mockResponse);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "cccd_scan.png",
                "image/png",
                new byte[]{1, 2, 3, 4}
        );

        mockMvc.perform(multipart("/api/v1/vault/upload")
                        .file(file)
                        .param("documentType", "CCCD_FRONT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.documentCode").value("DOC_20261104_001"))
                .andExpect(jsonPath("$.data.oneTimeToken").value("OTT_123456789"))
                .andExpect(jsonPath("$.data.watermarkApplied").value(true));
    }

    @Test
    void testViewDocumentOnce_success() throws Exception {
        byte[] fakeDecryptedBytes = new byte[]{10, 20, 30};
        when(vaultService.consumeOneTimeDocument("OTT_valid_token")).thenReturn(fakeDecryptedBytes);

        mockMvc.perform(get("/api/v1/vault/view/OTT_valid_token"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(content().bytes(fakeDecryptedBytes));
    }

    @Test
    void testViewDocumentOnce_secondTime_shouldReturnHttp410Gone() throws Exception {
        when(vaultService.consumeOneTimeDocument("OTT_consumed_token"))
                .thenThrow(new BusinessException(ErrorCode.TOKEN_EXPIRED_OR_CONSUMED, "Liên kết đã hết hạn hoặc đã được sử dụng một lần."));

        mockMvc.perform(get("/api/v1/vault/view/OTT_consumed_token"))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("SW_410"));
    }

    @Test
    void testViewDocumentOnce_withPdfMagicBytes_shouldReturnApplicationPdf() throws Exception {
        byte[] pdfBytes = new byte[]{0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34}; // %PDF-1.4
        when(vaultService.consumeOneTimeDocument("OTT_pdf_token")).thenReturn(pdfBytes);

        mockMvc.perform(get("/api/v1/vault/view/OTT_pdf_token"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", "inline; filename=\"vault_document.pdf\""))
                .andExpect(content().bytes(pdfBytes));
    }

    @Test
    void testViewDocumentOnce_withJpegMagicBytes_shouldReturnImageJpeg() throws Exception {
        byte[] jpegBytes = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0x00, 0x10};
        when(vaultService.consumeOneTimeDocument("OTT_jpeg_token")).thenReturn(jpegBytes);

        mockMvc.perform(get("/api/v1/vault/view/OTT_jpeg_token"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_JPEG))
                .andExpect(header().string("Content-Disposition", "inline; filename=\"vault_document.jpg\""))
                .andExpect(content().bytes(jpegBytes));
    }

    @Test
    void testUploadDocument_rateLimitExceeded_returns429() throws Exception {
        when(clientIpResolver.resolve(any())).thenReturn("198.51.100.10");
        when(rateLimiter.allowVaultUpload("198.51.100.10", "sess-01")).thenReturn(false);

        MockMultipartFile file = new MockMultipartFile(
                "file", "cccd_scan.png", "image/png", new byte[]{1, 2, 3, 4});

        mockMvc.perform(multipart("/api/v1/vault/upload")
                        .file(file)
                        .header("X-Upload-Session", "sess-01")
                        .param("documentType", "CCCD_FRONT"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.errorCode").value("SW_429"));
    }

    @Test
    void testUploadDocument_exceeding5MbLimit_returns422BeforeReadingStream() throws Exception {
        when(clientIpResolver.resolve(any())).thenReturn("198.51.100.10");
        when(rateLimiter.allowVaultUpload(anyString(), any())).thenReturn(true);

        byte[] oversized = new byte[(5 * 1024 * 1024) + 128];
        MockMultipartFile file = new MockMultipartFile(
                "file", "huge_scan.png", "image/png", oversized);

        mockMvc.perform(multipart("/api/v1/vault/upload")
                        .file(file)
                        .param("documentType", "CCCD_FRONT"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("SW_422"));
    }
}

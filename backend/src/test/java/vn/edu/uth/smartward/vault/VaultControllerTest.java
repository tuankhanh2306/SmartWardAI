package vn.edu.uth.smartward.vault;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.vault.dto.VaultUploadResponse;

import java.time.OffsetDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(VaultController.class)
class VaultControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ZeroTrustVaultService vaultService;

    @Test
    void testUploadDocument_success() throws Exception {
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
}

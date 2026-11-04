package vn.edu.uth.smartward.formcheck;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.uth.smartward.formcheck.dto.ExtractedFormFields;
import vn.edu.uth.smartward.formcheck.dto.FormPrecheckReport;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FormCheckController.class)
class FormCheckControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FormPrecheckService formPrecheckService;

    @Test
    void testPrecheckForm_success() throws Exception {
        FormPrecheckReport mockReport = FormPrecheckReport.builder()
                .submissionCode("FORM_20261104_TEST01")
                .formType("CT01_RESIDENCE_DECLARATION")
                .valid(true)
                .overallConfidence(0.96)
                .extractedFields(ExtractedFormFields.builder()
                        .fullName("NGUYỄN VĂN AN")
                        .cccdNumber("079095012345")
                        .build())
                .issues(Collections.emptyList())
                .summaryMessage("Biểu mẫu hợp lệ.")
                .disclaimer(FormPrecheckService.LEGAL_DISCLAIMER)
                .build();

        when(formPrecheckService.precheckForm(any(), anyString())).thenReturn(mockReport);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "form_ct01.png",
                "image/png",
                new byte[]{1, 2, 3, 4}
        );

        mockMvc.perform(multipart("/api/v1/forms/precheck")
                        .file(file)
                        .param("formType", "CT01_RESIDENCE_DECLARATION"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.submissionCode").value("FORM_20261104_TEST01"))
                .andExpect(jsonPath("$.data.valid").value(true))
                .andExpect(jsonPath("$.data.extractedFields.fullName").value("NGUYỄN VĂN AN"));
    }
}

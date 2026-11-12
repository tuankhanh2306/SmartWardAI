package vn.edu.uth.smartward.rag;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import vn.edu.uth.smartward.rag.dto.ProcedureDetailDto;
import vn.edu.uth.smartward.rag.dto.ProcedureDto;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProcedureController.class)
class ProcedureControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProcedureService procedureService;

    @Test
    void testGetProcedures_success() throws Exception {
        ProcedureDto dto = ProcedureDto.builder()
                .procedureCode("TTHC-HT-01")
                .officialPortalCode("1.000874")
                .procedureName("Thủ tục đăng ký khai sinh")
                .category("Hộ tịch")
                .agency("Ủy ban nhân dân cấp xã / phường")
                .processingTime("Trong ngày làm việc")
                .fee("Miễn phí")
                .status("ACTIVE")
                .chunksCount(4)
                .build();

        when(procedureService.getProcedures(any(), any())).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/procedures")
                        .param("category", "Hộ tịch")
                        .param("keyword", "khai sinh")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].procedureCode").value("TTHC-HT-01"))
                .andExpect(jsonPath("$.data[0].procedureName").value("Thủ tục đăng ký khai sinh"))
                .andExpect(jsonPath("$.data[0].category").value("Hộ tịch"))
                .andExpect(jsonPath("$.data[0].chunksCount").value(4));
    }

    @Test
    void testGetProcedureByCode_success() throws Exception {
        ProcedureDetailDto detail = ProcedureDetailDto.builder()
                .procedureCode("TTHC-HT-01")
                .officialPortalCode("1.000874")
                .procedureName("Thủ tục đăng ký khai sinh")
                .category("Hộ tịch")
                .agency("Ủy ban nhân dân cấp xã / phường")
                .processingTime("Trong ngày làm việc")
                .fee("Miễn phí")
                .status("ACTIVE")
                .process("Bước 1: Nộp hồ sơ...")
                .sourceUrl("https://dichvucong.gov.vn")
                .chunks(List.of(
                        ProcedureDetailDto.ProcedureChunkDto.builder()
                                .chunkId("TTHC-HT-01_CHUNK_001")
                                .chunkType("OVERVIEW")
                                .title("Tổng quan khai sinh")
                                .content("Nội dung...")
                                .build()
                ))
                .build();

        when(procedureService.getProcedureByCode(eq("TTHC-HT-01"))).thenReturn(detail);

        mockMvc.perform(get("/api/v1/procedures/TTHC-HT-01")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.procedureCode").value("TTHC-HT-01"))
                .andExpect(jsonPath("$.data.process").value("Bước 1: Nộp hồ sơ..."))
                .andExpect(jsonPath("$.data.chunks[0].chunkId").value("TTHC-HT-01_CHUNK_001"));
    }
}

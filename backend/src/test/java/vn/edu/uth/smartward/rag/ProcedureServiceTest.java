package vn.edu.uth.smartward.rag;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.rag.dto.ProcedureDetailDto;
import vn.edu.uth.smartward.rag.dto.ProcedureDto;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProcedureServiceTest {

    @Mock
    private AdminProcedureRepository procedureRepository;

    @Mock
    private LegalChunkRepository chunkRepository;

    private ProcedureService procedureService;

    @BeforeEach
    void setUp() {
        procedureService = new ProcedureService(procedureRepository, chunkRepository);
    }

    @Test
    void testGetProcedures_shouldReturnMappedDtos() {
        AdminProcedure proc1 = AdminProcedure.builder()
                .id(1L)
                .procedureCode("TTHC-HT-01")
                .portalCode("1.000874")
                .procedureName("Thủ tục đăng ký khai sinh")
                .category("Hộ tịch")
                .agency("Ủy ban nhân dân cấp xã / phường")
                .processingTime("Trong ngày")
                .fee("Miễn phí")
                .status("ACTIVE")
                .build();

        when(procedureRepository.searchProcedures(any(), any())).thenReturn(List.of(proc1));
        when(chunkRepository.findByProcedureId(1L)).thenReturn(List.of(
                LegalChunk.builder().id(101L).chunkCode("TTHC-HT-01_CHUNK_001").build()
        ));

        List<ProcedureDto> result = procedureService.getProcedures("Hộ tịch", "khai sinh");

        assertNotNull(result);
        assertEquals(1, result.size());
        ProcedureDto dto = result.get(0);
        assertEquals("TTHC-HT-01", dto.getProcedureCode());
        assertEquals("Thủ tục đăng ký khai sinh", dto.getProcedureName());
        assertEquals(1, dto.getChunksCount());
        verify(procedureRepository, times(1)).searchProcedures("Hộ tịch", "khai sinh");
    }

    @Test
    void testGetProcedureByCode_whenFound_shouldReturnDetailWithChunks() {
        AdminProcedure proc = AdminProcedure.builder()
                .id(1L)
                .procedureCode("TTHC-HT-01")
                .portalCode("1.000874")
                .procedureName("Thủ tục đăng ký khai sinh")
                .category("Hộ tịch")
                .agency("Ủy ban nhân dân cấp xã / phường")
                .processingTime("Trong ngày")
                .fee("Miễn phí")
                .sourceUrl("https://dichvucong.gov.vn")
                .status("ACTIVE")
                .build();

        LegalChunk processChunk = LegalChunk.builder()
                .id(101L)
                .chunkCode("TTHC-HT-01_CHUNK_002")
                .chunkType("PROCESS_STEP")
                .title("Trình tự thực hiện")
                .content("Bước 1 nộp hồ sơ...")
                .legalReference("Điều 15 Luật Hộ tịch")
                .build();

        when(procedureRepository.findByProcedureCode("TTHC-HT-01")).thenReturn(Optional.of(proc));
        when(chunkRepository.findByProcedureId(1L)).thenReturn(List.of(processChunk));

        ProcedureDetailDto detail = procedureService.getProcedureByCode("TTHC-HT-01");

        assertNotNull(detail);
        assertEquals("TTHC-HT-01", detail.getProcedureCode());
        assertEquals("Bước 1 nộp hồ sơ...", detail.getProcess());
        assertEquals("https://dichvucong.gov.vn", detail.getSourceUrl());
        assertEquals(1, detail.getChunks().size());
        assertEquals("TTHC-HT-01_CHUNK_002", detail.getChunks().get(0).getChunkId());
    }

    @Test
    void testGetProcedureByCode_whenNotFound_shouldThrowResourceNotFound() {
        when(procedureRepository.findByProcedureCode("TTHC-INVALID")).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class, () ->
                procedureService.getProcedureByCode("TTHC-INVALID")
        );

        assertEquals(ErrorCode.RESOURCE_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    void testGetProcedureByCode_whenCodeIsBlank_shouldThrowInvalidRequest() {
        BusinessException ex = assertThrows(BusinessException.class, () ->
                procedureService.getProcedureByCode("   ")
        );

        assertEquals(ErrorCode.INVALID_REQUEST, ex.getErrorCode());
    }
}

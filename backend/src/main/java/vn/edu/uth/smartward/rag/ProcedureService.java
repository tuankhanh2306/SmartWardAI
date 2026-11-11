package vn.edu.uth.smartward.rag;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.rag.dto.ProcedureDetailDto;
import vn.edu.uth.smartward.rag.dto.ProcedureDto;

import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProcedureService {

    private final AdminProcedureRepository procedureRepository;
    private final LegalChunkRepository chunkRepository;

    @Transactional(readOnly = true)
    public List<ProcedureDto> getProcedures(String category, String keyword) {
        log.debug("Querying procedures with category='{}', keyword='{}'", category, keyword);
        List<AdminProcedure> procedures = procedureRepository.searchProcedures(category, keyword);
        return procedures.stream().map(p -> {
            List<LegalChunk> chunks = chunkRepository.findByProcedureId(p.getId());
            return ProcedureDto.builder()
                    .procedureCode(p.getProcedureCode())
                    .officialPortalCode(p.getPortalCode())
                    .procedureName(p.getProcedureName())
                    .category(p.getCategory())
                    .agency(p.getAgency())
                    .processingTime(p.getProcessingTime())
                    .fee(p.getFee())
                    .status(p.getStatus())
                    .chunksCount(chunks != null ? chunks.size() : 0)
                    .build();
        }).toList();
    }

    @Transactional(readOnly = true)
    public ProcedureDetailDto getProcedureByCode(String procedureCode) {
        if (procedureCode == null || procedureCode.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã thủ tục không được để trống");
        }

        AdminProcedure proc = procedureRepository.findByProcedureCode(procedureCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy thủ tục với mã: " + procedureCode));

        List<LegalChunk> chunks = chunkRepository.findByProcedureId(proc.getId());

        String process = null;
        if (chunks != null) {
            process = chunks.stream()
                    .filter(c -> "PROCESS_STEP".equalsIgnoreCase(c.getChunkType()))
                    .map(LegalChunk::getContent)
                    .findFirst()
                    .orElse(null);
        }

        List<ProcedureDetailDto.ProcedureChunkDto> chunkDtos = (chunks == null || chunks.isEmpty())
                ? Collections.emptyList()
                : chunks.stream().map(c ->
                ProcedureDetailDto.ProcedureChunkDto.builder()
                        .chunkId(c.getChunkCode())
                        .chunkType(c.getChunkType())
                        .title(c.getTitle())
                        .content(c.getContent())
                        .legalReference(c.getLegalReference())
                        .build()
        ).toList();

        return ProcedureDetailDto.builder()
                .procedureCode(proc.getProcedureCode())
                .officialPortalCode(proc.getPortalCode())
                .procedureName(proc.getProcedureName())
                .category(proc.getCategory())
                .agency(proc.getAgency())
                .processingTime(proc.getProcessingTime())
                .fee(proc.getFee())
                .status(proc.getStatus())
                .chunksCount(chunks != null ? chunks.size() : 0)
                .process(process)
                .sourceUrl(proc.getSourceUrl())
                .chunks(chunkDtos)
                .build();
    }
}

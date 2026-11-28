package vn.edu.uth.smartward.dossier.dto;

import lombok.Builder;

import java.time.Instant;
import java.util.List;

@Builder
public record DossierSubmissionResponse(
        String dossierCode,
        String procedureCode,
        String wardCode,
        String status,
        Instant slaDeadline,
        Instant createdAt,
        List<String> vaultDocIds,
        String routingChannel,
        String qrKind,
        boolean receiptVerified
) {
    public DossierSubmissionResponse(
            String dossierCode,
            String procedureCode,
            String wardCode,
            String status,
            Instant slaDeadline,
            Instant createdAt
    ) {
        this(dossierCode, procedureCode, wardCode, status, slaDeadline, createdAt, List.of(), "TTPVHCC_UBND", "SW_DRAFT", false);
    }

    public DossierSubmissionResponse(
            String dossierCode,
            String procedureCode,
            String wardCode,
            String status,
            Instant slaDeadline,
            Instant createdAt,
            List<String> vaultDocIds
    ) {
        this(dossierCode, procedureCode, wardCode, status, slaDeadline, createdAt, vaultDocIds, "TTPVHCC_UBND", "SW_DRAFT", false);
    }
}

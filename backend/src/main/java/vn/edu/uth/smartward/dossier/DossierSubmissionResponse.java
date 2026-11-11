package vn.edu.uth.smartward.dossier;

import lombok.Builder;

import java.time.Instant;

@Builder
public record DossierSubmissionResponse(
        String dossierCode,
        String procedureCode,
        String wardCode,
        String status,
        Instant slaDeadline,
        Instant createdAt
) {}

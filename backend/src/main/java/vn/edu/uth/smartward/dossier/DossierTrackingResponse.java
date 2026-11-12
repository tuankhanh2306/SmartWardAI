package vn.edu.uth.smartward.dossier;

import lombok.Builder;

import java.time.Instant;

@Builder
public record DossierTrackingResponse(
        String dossierCode,
        String procedureCode,
        String procedureName,
        String wardCode,
        String citizenCccd,
        String status,
        Instant slaDeadline,
        String officerFeedback,
        String appointmentCode,
        Object precheckReport,
        Object vaultDocIds,
        Instant createdAt,
        Instant updatedAt
) {}

package vn.edu.uth.smartward.dossier.dto;

import lombok.Builder;

import java.time.Instant;
import java.util.List;

@Builder
public record OfficerDossierDto(
        Long id,
        String dossierCode,
        String procedureCode,
        String procedureName,
        String wardCode,
        String citizenCccd,
        String citizenName,
        String status,
        Instant slaDeadline,
        String officerFeedback,
        String appointmentCode,
        Object formData,
        Object precheckReport,
        Object vaultDocIds,
        Instant createdAt,
        Instant updatedAt,
        List<String> requestedSupplementItems,
        Instant supplementedAt,
        Integer supplementCount
) {}

package vn.edu.uth.smartward.dossier.dto;

import lombok.Builder;
import vn.edu.uth.smartward.dossier.DossierEvent;

import java.time.Instant;
import java.util.List;

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
        Instant updatedAt,
        List<DossierEvent> timeline,
        List<String> requestedSupplementItems,
        Instant supplementedAt,
        Integer supplementCount,
        String routingChannel,
        String receivingAgency,
        String officialReceiptNo,
        Instant receiptVerifiedAt,
        String qrKind,
        boolean receiptVerified
) {}

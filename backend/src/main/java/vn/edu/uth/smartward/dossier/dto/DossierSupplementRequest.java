package vn.edu.uth.smartward.dossier.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;

import java.util.List;
import java.util.Map;

@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record DossierSupplementRequest(
        String last4Cccd,
        String citizenNote,
        Map<String, Object> updatedFields,
        List<String> additionalVaultDocIds,
        String idempotencyKey
) {}

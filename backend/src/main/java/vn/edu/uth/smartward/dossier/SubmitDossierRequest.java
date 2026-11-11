package vn.edu.uth.smartward.dossier;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import lombok.Builder;

import java.util.List;

@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record SubmitDossierRequest(
        String dossierCode,
        @NotBlank(message = "Mã thủ tục hành chính không được để trống") String procedureCode,
        @NotBlank(message = "Mã đơn vị hành chính xã/phường không được để trống") String wardCode,
        @NotBlank(message = "Số định danh/CCCD công dân không được để trống") String citizenCccd,
        Object formData,
        Object precheckReport,
        List<String> vaultDocIds
) {}

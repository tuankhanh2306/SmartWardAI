package vn.edu.uth.smartward.dossier.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Builder;

/**
 * SEC-04: Secure dossier tracking payload.
 * Requires dossierCode and exactly 4-digit last4Cccd; citizenCccd is strictly removed.
 */
@Builder
public record DossierTrackingRequest(
        @NotBlank(message = "Mã hồ sơ không được để trống")
        @Schema(description = "Mã tra cứu hồ sơ (ví dụ: HS-20261116-AG-0001-A1B2)", example = "HS-20261116-AG-0001-A1B2")
        String dossierCode,

        @NotBlank(message = "Vui lòng nhập 4 số cuối CCCD")
        @Pattern(regexp = "^\\d{4}$", message = "4 số cuối CCCD phải là đúng 4 chữ số (0-9)")
        @Schema(description = "4 chữ số cuối trên thẻ Căn cước công dân", example = "2345")
        String last4Cccd
) {}

package vn.edu.uth.smartward.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

/**
 * Verifies conditional delegated signing authority before permitting center-level signing:
 * checks wardCode, procedureCode, matching delegateBadgeId or delegateTitle, active status,
 * and validFrom <= signingTime <= validTo.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SigningDelegationService {

    private final SigningDelegationRepository delegationRepository;

    public SigningDelegation verifyDelegatedSigningAuthority(
            OfficerAuthService.OfficerPrincipal principal,
            String procedureCode,
            Instant atTime
    ) {
        if (principal == null) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED,
                    "Yêu cầu xác thực danh tính người ký để kiểm tra thẩm quyền ủy quyền.");
        }
        if ("ADMIN".equalsIgnoreCase(principal.role())) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Quản trị viên cấp tỉnh không có thẩm quyền ký ủy quyền giải quyết thủ tục tại cấp xã.");
        }
        String wardCode = principal.wardCode() != null ? principal.wardCode().trim() : "";
        String procCode = procedureCode != null ? procedureCode.trim().toUpperCase(Locale.ROOT) : "";
        if (wardCode.isEmpty() || procCode.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    "Thiếu mã đơn vị hoặc mã thủ tục khi kiểm tra văn bản ủy quyền ký.");
        }

        if (delegationRepository == null) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Chưa cấu hình kho kiểm tra văn bản ủy quyền ký tại đơn vị " + wardCode + ".");
        }

        List<SigningDelegation> candidates =
                delegationRepository.findByWardCodeIgnoreCaseAndProcedureCodeIgnoreCaseAndActiveTrue(
                        wardCode, procCode
                );
        if (candidates == null || candidates.isEmpty()) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Đơn vị " + wardCode + " chưa có văn bản ủy quyền ký còn hiệu lực cho thủ tục "
                            + procCode + ". Vui lòng trình Lãnh đạo UBND cấp xã ký.");
        }

        Instant effectiveNow = atTime != null ? atTime : Instant.now();
        String badge = principal.badgeId() != null ? principal.badgeId().trim() : "";
        String fullNameLower = principal.fullName() != null
                ? principal.fullName().toLowerCase(Locale.ROOT)
                : "";

        boolean sawExpiredOrFuture = false;
        boolean sawWrongIdentity = false;

        for (SigningDelegation d : candidates) {
            if (Boolean.FALSE.equals(d.getActive())) continue;

            boolean withinWindow = d.getValidFrom() != null && d.getValidTo() != null
                    && !effectiveNow.isBefore(d.getValidFrom())
                    && !effectiveNow.isAfter(d.getValidTo());
            if (!withinWindow) {
                sawExpiredOrFuture = true;
                continue;
            }

            boolean hasBadgeConstraint = d.getDelegateBadgeId() != null && !d.getDelegateBadgeId().isBlank();
            boolean hasTitleConstraint = d.getDelegateTitle() != null && !d.getDelegateTitle().isBlank();
            if (!hasBadgeConstraint && !hasTitleConstraint) {
                sawWrongIdentity = true;
                continue;
            }

            boolean badgeMatch = hasBadgeConstraint
                    && badge.equalsIgnoreCase(d.getDelegateBadgeId().trim());
            boolean titleMatch = hasTitleConstraint
                    && fullNameLower.contains(d.getDelegateTitle().trim().toLowerCase(Locale.ROOT));

            if (badgeMatch || titleMatch) {
                log.info("[SIGNING_DELEGATION] Verified authority: badge={}, ward={}, proc={}, decision={}",
                        badge, wardCode, procCode, d.getDecisionNumber());
                return d;
            }
            sawWrongIdentity = true;
        }

        if (sawExpiredOrFuture && !sawWrongIdentity) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Văn bản ủy quyền ký cho thủ tục " + procCode + " tại " + wardCode
                            + " đã hết hiệu lực hoặc chưa đến thời điểm áp dụng.");
        }
        throw new BusinessException(ErrorCode.FORBIDDEN,
                "Tài khoản '" + badge + "' không trùng đúng người hoặc chức danh được ủy quyền ký thủ tục "
                        + procCode + " tại đơn vị " + wardCode + ".");
    }
}

package vn.edu.uth.smartward.security;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Conditional delegation authority record enabling authorized TTPVHCC officials
 * to sign specific procedures within a specific administrative unit and valid decision window
 * (e.g., Decision 989/QD-UBND at AG_DK_KIENHAI under Decree 280/2025/ND-CP).
 */
@Entity
@Table(name = "signing_delegations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SigningDelegation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ward_code", nullable = false, length = 64)
    private String wardCode;

    @Column(name = "procedure_code", nullable = false, length = 64)
    private String procedureCode;

    @Column(name = "delegate_badge_id", length = 64)
    private String delegateBadgeId;

    @Column(name = "delegate_title", length = 160)
    private String delegateTitle;

    @Column(name = "decision_number", nullable = false, length = 128)
    private String decisionNumber;

    @Column(name = "seal_type", nullable = false, length = 32)
    @Builder.Default
    private String sealType = "TTPVHCC_SEAL";

    @Column(name = "valid_from", nullable = false)
    private Instant validFrom;

    @Column(name = "valid_to", nullable = false)
    private Instant validTo;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

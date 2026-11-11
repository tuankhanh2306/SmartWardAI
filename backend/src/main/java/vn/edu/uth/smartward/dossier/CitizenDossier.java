package vn.edu.uth.smartward.dossier;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "citizen_dossiers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CitizenDossier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dossier_code", nullable = false, unique = true, length = 64)
    private String dossierCode;

    @Column(name = "procedure_code", nullable = false, length = 64)
    private String procedureCode;

    @Column(name = "ward_code", nullable = false, length = 64)
    private String wardCode;

    @Column(name = "citizen_cccd", nullable = false, length = 12)
    private String citizenCccd;

    @Column(name = "form_data", nullable = false, columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String formData;

    @Column(name = "precheck_report", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    private String precheckReport;

    @Column(name = "vault_doc_ids", columnDefinition = "jsonb")
    @JdbcTypeCode(SqlTypes.JSON)
    @Builder.Default
    private String vaultDocIds = "[]";

    @Column(name = "status", nullable = false, length = 32)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "sla_deadline", nullable = false)
    private Instant slaDeadline;

    @Column(name = "officer_feedback", columnDefinition = "TEXT")
    private String officerFeedback;

    @Column(name = "appointment_code", length = 64)
    private String appointmentCode;

    @Version
    @Column(name = "version")
    @Builder.Default
    private Long version = 0L;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

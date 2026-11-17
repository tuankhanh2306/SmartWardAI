package vn.edu.uth.smartward.rag;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(
        name = "procedure_versions",
        uniqueConstraints = {
                @UniqueConstraint(name = "uq_procedure_version_no", columnNames = {"procedure_id", "version_no"})
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProcedureVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "procedure_id", nullable = false)
    private AdminProcedure procedure;

    @Column(name = "version_no", nullable = false)
    private Integer versionNo;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "content", columnDefinition = "jsonb", nullable = false)
    private String content;

    @Column(name = "content_hash", nullable = false, length = 64)
    private String contentHash;

    @Column(name = "state", nullable = false, length = 32)
    @Builder.Default
    private String state = "DRAFT";

    @Column(name = "created_by", nullable = false, length = 64)
    private String createdBy;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "submitted_at")
    private OffsetDateTime submittedAt;

    @Column(name = "reviewed_by", length = 64)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private OffsetDateTime reviewedAt;

    @Column(name = "review_note", columnDefinition = "TEXT")
    private String reviewNote;

    @Column(name = "published_at")
    private OffsetDateTime publishedAt;

    @Column(name = "source", nullable = false, length = 32)
    @Builder.Default
    private String source = "MANUAL";

    @Column(name = "source_ref", columnDefinition = "TEXT")
    private String sourceRef;
}

package vn.edu.uth.smartward.formcheck;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "form_submissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FormSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "submission_code", nullable = false, unique = true, length = 50)
    private String submissionCode;

    @Column(name = "form_type", nullable = false, length = 50)
    private String formType;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "ocr_raw_result", columnDefinition = "jsonb")
    private String ocrRawResult;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "validation_report", columnDefinition = "jsonb")
    private String validationReport;

    @Column(name = "is_valid", nullable = false)
    @Builder.Default
    private Boolean isValid = false;

    @Column(name = "confidence_score", precision = 4, scale = 3)
    private BigDecimal confidenceScore;

    @CreationTimestamp
    @Column(name = "submitted_at", nullable = false, updatable = false)
    private OffsetDateTime submittedAt;
}

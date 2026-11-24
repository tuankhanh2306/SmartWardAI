package vn.edu.uth.smartward.rag;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnTransformer;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "legal_chunks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LegalChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "procedure_id", nullable = false)
    private AdminProcedure procedure;

    @Column(name = "chunk_code", nullable = false, unique = true, length = 50)
    private String chunkCode;

    @Column(name = "chunk_type", nullable = false, length = 50)
    private String chunkType;

    @Column(name = "title", nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "legal_reference", columnDefinition = "TEXT")
    private String legalReference;

    @Column(name = "embedding", columnDefinition = "vector(768)")
    @ColumnTransformer(write = "CAST(? AS vector)")
    private String embedding;

    @Column(name = "embedding_model", nullable = false, length = 100)
    @Builder.Default
    private String embeddingModel = "bkai_pho_bert_ft_v1";

    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private String status = "ACTIVE";

    @Column(name = "header_path")
    private String headerPath;

    @Column(name = "section_name", length = 100)
    private String sectionName;

    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    @Column(name = "scraped_at")
    private OffsetDateTime scrapedAt;

    @Column(name = "content_hash", length = 64)
    private String contentHash;

    @Column(name = "pipeline_version", length = 50)
    @Builder.Default
    private String pipelineVersion = "1.0";

    @Column(name = "effective_date", nullable = false)
    @Builder.Default
    private LocalDate effectiveDate = LocalDate.now();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

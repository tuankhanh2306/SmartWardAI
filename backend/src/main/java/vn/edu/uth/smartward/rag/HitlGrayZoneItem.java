package vn.edu.uth.smartward.rag;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Persistent entity for Human-in-the-Loop (HITL) gray-zone RAG inquiries
 * so pending citizen questions survive backend restarts.
 */
@Entity
@Table(name = "hitl_gray_zone_queue")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class HitlGrayZoneItem {

    @Id
    @Column(name = "id", length = 64, nullable = false)
    private String id;

    @Column(name = "query", nullable = false, columnDefinition = "TEXT")
    private String query;

    @Column(name = "ward_name", nullable = false, length = 120)
    private String wardName;

    @Column(name = "similarity_score", nullable = false)
    private double similarityScore;

    @Column(name = "candidate_chunk_code", length = 120)
    private String candidateChunkCode;

    @Column(name = "candidate_procedure_name", columnDefinition = "TEXT")
    private String candidateProcedureName;

    @Column(name = "legal_reference", columnDefinition = "TEXT")
    private String legalReference;

    @Column(name = "suggested_answer", nullable = false, columnDefinition = "TEXT")
    private String suggestedAnswer;

    @Column(name = "status", nullable = false, length = 32)
    @Builder.Default
    private String status = "PENDING";

    @Column(name = "created_at", nullable = false, length = 64)
    private String createdAt;

    @Column(name = "resolved_by", length = 120)
    private String resolvedBy;

    @CreationTimestamp
    @Column(name = "created_at_ts", nullable = false, updatable = false)
    private Instant createdAtTs;
}

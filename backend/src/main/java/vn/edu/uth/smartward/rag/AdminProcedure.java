package vn.edu.uth.smartward.rag;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "admin_procedures")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminProcedure {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "procedure_code", nullable = false, unique = true, length = 50)
    private String procedureCode;

    @Column(name = "portal_code", length = 50)
    private String portalCode;

    @Column(name = "portal_id", length = 100)
    private String portalId;

    @Column(name = "procedure_name", nullable = false, length = 500)
    private String procedureName;

    @Column(name = "category", nullable = false, length = 100)
    private String category;

    @Column(name = "agency", length = 500)
    private String agency;

    @Column(name = "processing_time", columnDefinition = "TEXT")
    private String processingTime;

    @Column(name = "fee", columnDefinition = "TEXT")
    private String fee;

    @Column(name = "source_url", length = 1000)
    private String sourceUrl;

    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private String status = "ACTIVE";

    @OneToMany(mappedBy = "procedure", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<LegalChunk> chunks = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

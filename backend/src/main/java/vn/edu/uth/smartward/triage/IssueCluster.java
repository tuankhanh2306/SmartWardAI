package vn.edu.uth.smartward.triage;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "issue_clusters")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IssueCluster {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cluster_code", nullable = false, unique = true, length = 50)
    private String clusterCode;

    @Column(name = "category", nullable = false, length = 50)
    private String category;

    @Column(name = "title", nullable = false, length = 500)
    private String title;

    @Column(name = "center_latitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal centerLatitude;

    @Column(name = "center_longitude", nullable = false, precision = 10, scale = 7)
    private BigDecimal centerLongitude;

    @Column(name = "center_embedding", columnDefinition = "vector(768)")
    private String centerEmbedding;

    @Column(name = "report_count", nullable = false)
    @Builder.Default
    private Integer reportCount = 1;

    @Column(name = "status", nullable = false, length = 50)
    @Builder.Default
    private String status = "OPEN";

    @OneToMany(mappedBy = "cluster", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    @Builder.Default
    private List<CivicReport> reports = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "first_reported_at", nullable = false, updatable = false)
    private OffsetDateTime firstReportedAt;

    @UpdateTimestamp
    @Column(name = "last_reported_at", nullable = false)
    private OffsetDateTime lastReportedAt;
}

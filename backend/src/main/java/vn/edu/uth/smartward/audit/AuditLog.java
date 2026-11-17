package vn.edu.uth.smartward.audit;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "audit_log")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "who", nullable = false, length = 64, updatable = false)
    private String who;

    @Column(name = "ward", nullable = false, length = 64, updatable = false)
    private String ward;

    @Column(name = "action", nullable = false, length = 64, updatable = false)
    private String action;

    @Column(name = "entity", nullable = false, length = 64, updatable = false)
    private String entity;

    @Column(name = "entity_id", length = 64, updatable = false)
    private String entityId;

    @Column(name = "version_no", updatable = false)
    private Integer versionNo;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "before_snapshot", columnDefinition = "jsonb", updatable = false)
    private String beforeSnapshot;

    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.JSON)
    @Column(name = "after_snapshot", columnDefinition = "jsonb", updatable = false)
    private String afterSnapshot;

    @Column(name = "ip", length = 64, updatable = false)
    private String ip;

    @Column(name = "user_agent", columnDefinition = "TEXT", updatable = false)
    private String userAgent;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

package vn.edu.uth.smartward.agent;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "agent_traces")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentTrace {

    @Id
    @Column(name = "trace_id", nullable = false, length = 64)
    private String traceId;

    @Column(name = "correlation_id", nullable = false, length = 64)
    private String correlationId;

    @Column(name = "actor_role", nullable = false, length = 20)
    private String actorRole;

    @Column(name = "ward_code", length = 64)
    private String wardCode;

    @Column(name = "user_prompt_masked", columnDefinition = "TEXT")
    private String userPromptMasked;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "steps_json", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private String stepsJson = "[]";

    @Column(name = "latency_ms", nullable = false)
    @Builder.Default
    private Long latencyMs = 0L;

    @Column(name = "token_usage", nullable = false)
    @Builder.Default
    private Integer tokenUsage = 0;

    @Column(name = "injection_flagged", nullable = false)
    @Builder.Default
    private Boolean injectionFlagged = false;

    @Column(name = "injection_reason", length = 120)
    private String injectionReason;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}

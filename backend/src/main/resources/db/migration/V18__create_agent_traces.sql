-- Flyway V18: Civic AI Agent execution trace table for full auditability & prompt injection tracking (TASK-039)
CREATE TABLE IF NOT EXISTS agent_traces (
    trace_id VARCHAR(64) PRIMARY KEY,
    correlation_id VARCHAR(64) NOT NULL,
    actor_role VARCHAR(20) NOT NULL,
    ward_code VARCHAR(64),
    user_prompt_masked TEXT,
    steps_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    latency_ms BIGINT NOT NULL DEFAULT 0,
    token_usage INTEGER NOT NULL DEFAULT 0,
    injection_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    injection_reason VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_traces_correlation_id
    ON agent_traces (correlation_id);

CREATE INDEX IF NOT EXISTS idx_agent_traces_ward_created
    ON agent_traces (ward_code, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_traces_injection_flagged
    ON agent_traces (injection_flagged)
    WHERE injection_flagged = TRUE;

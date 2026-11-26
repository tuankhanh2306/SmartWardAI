package vn.edu.uth.smartward.agent.connector;

import java.util.List;

/**
 * Pluggable ingestion connector contract for SmartWard Civic AI Agent Platform (TASK-041).
 * Enables plugging external data sources (National DVC Portal, webhooks, MinIO, local JSON)
 * without modifying CivicSupervisorAgent or RAG core.
 */
public interface CivicDataConnector {

    String sourceId();

    String sourceName();

    List<CivicDocumentRecord> fetchDocuments(int limit);

    boolean isHealthy();
}

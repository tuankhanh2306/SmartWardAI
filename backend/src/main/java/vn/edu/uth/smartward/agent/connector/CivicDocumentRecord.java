package vn.edu.uth.smartward.agent.connector;

import java.util.Map;

/**
 * Standardized document record produced by CivicDataConnector implementations (TASK-041).
 */
public record CivicDocumentRecord(
        String documentId,
        String title,
        String content,
        String sourceUri,
        String visibilityScope,
        String wardCode,
        Map<String, String> metadata
) {}

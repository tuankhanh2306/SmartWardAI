package vn.edu.uth.smartward.agent;

import java.util.Map;

/**
 * UI action card emitted by a tool (e.g. OPEN_PREFILLED_FORM, DOSSIER_STATUS, WARD_ANALYTICS).
 */
public record AgentActionCard(
        String type,
        String title,
        String subtitle,
        Map<String, Object> payload
) {}

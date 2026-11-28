package vn.edu.uth.smartward.dossier.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;

import java.util.List;

@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public record OfficerReviewRequest(
        String status,
        String reviewStatus,
        String officerFeedback,
        String feedbackReason,
        String appointmentCode,
        List<String> requestedItems,
        String receivingAgency,
        String officialReceiptNo
) {
    public OfficerReviewRequest(
            String status,
            String reviewStatus,
            String officerFeedback,
            String feedbackReason,
            String appointmentCode) {
        this(status, reviewStatus, officerFeedback, feedbackReason, appointmentCode, null, null, null);
    }

    public OfficerReviewRequest(
            String status,
            String reviewStatus,
            String officerFeedback,
            String feedbackReason,
            String appointmentCode,
            List<String> requestedItems) {
        this(status, reviewStatus, officerFeedback, feedbackReason, appointmentCode, requestedItems, null, null);
    }
    public String getEffectiveStatus() {
        if (status != null && !status.isBlank()) {
            return status.trim().toUpperCase();
        }
        if (reviewStatus != null && !reviewStatus.isBlank()) {
            return reviewStatus.trim().toUpperCase();
        }
        return null;
    }

    public String getEffectiveFeedback() {
        if (officerFeedback != null && !officerFeedback.isBlank()) {
            return officerFeedback.trim();
        }
        if (feedbackReason != null && !feedbackReason.isBlank()) {
            return feedbackReason.trim();
        }
        return null;
    }
}

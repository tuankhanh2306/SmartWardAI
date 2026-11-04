package vn.edu.uth.smartward.formcheck;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.formcheck.dto.ExtractedFormFields;
import vn.edu.uth.smartward.formcheck.dto.FormPrecheckReport;
import vn.edu.uth.smartward.formcheck.dto.FormValidationIssue;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Deterministic Form Precheck Service for Administrative Declaration Forms.
 * Coordinates OCR extraction, rule-based validations (CCCD, Date Logic, Mandatory fields),
 * low-confidence warnings, and persistence of the precheck audit trail.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FormPrecheckService {

    private final OcrExtractionClient ocrExtractionClient;
    private final MandatoryFieldValidator mandatoryFieldValidator;
    private final CccdValidator cccdValidator;
    private final DateLogicValidator dateLogicValidator;
    private final FormSubmissionRepository submissionRepository;
    private final ObjectMapper objectMapper;

    public static final double CONFIDENCE_THRESHOLD = 0.70;

    public static final String LEGAL_DISCLAIMER =
            "Hệ thống SmartWard AI chỉ thực hiện sơ duyệt và cảnh báo lỗi logic để hỗ trợ công dân hoàn thiện hồ sơ giấy trước khi nộp. " +
            "Hệ thống không tự ý sửa đổi hồ sơ và không thay thế quyết định thẩm tra chính thức của cán bộ Một cửa theo Nghị định 13/2023/NĐ-CP.";

    /**
     * Executes end-to-end precheck on an uploaded declaration form image.
     */
    @Transactional
    public FormPrecheckReport precheckForm(MultipartFile file, String formType) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Tệp hình ảnh biểu mẫu không được để trống.");
        }

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            log.error("Failed to read uploaded file bytes: {}", e.getMessage());
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Không thể đọc dữ liệu tệp hình ảnh tải lên.");
        }

        String mimeType = file.getContentType() != null ? file.getContentType() : "image/png";
        return precheckFormBytes(bytes, mimeType, file.getOriginalFilename(), formType);
    }

    /**
     * Executes precheck directly from raw image bytes.
     */
    @Transactional
    public FormPrecheckReport precheckFormBytes(byte[] imageBytes, String mimeType, String originalFilename, String formType) {
        String effectiveFormType = (formType != null && !formType.isBlank()) ? formType : "CT01_RESIDENCE_DECLARATION";
        String submissionCode = generateSubmissionCode();

        // 1. OCR Extraction
        ExtractedFormFields fields = ocrExtractionClient.extractFields(imageBytes, mimeType);

        // 2. Run Deterministic Rule Engine
        List<FormValidationIssue> issues = new ArrayList<>();

        // 2.1. Mandatory Fields Check
        issues.addAll(mandatoryFieldValidator.validate(fields));

        // 2.2. CCCD 12-digit Rules Check
        issues.addAll(cccdValidator.validate(fields.getCccdNumber(), fields.getBirthDate(), fields.getGender()));

        // 2.3. Temporal & Age Logic Check
        issues.addAll(dateLogicValidator.validate(fields.getBirthDate(), fields.getIssueDate()));

        // 2.4. Low Confidence Warning Check (< 0.70)
        if (fields.getFieldConfidences() != null) {
            for (Map.Entry<String, Double> entry : fields.getFieldConfidences().entrySet()) {
                if (entry.getValue() != null && entry.getValue() < CONFIDENCE_THRESHOLD) {
                    issues.add(FormValidationIssue.builder()
                            .field(entry.getKey())
                            .errorType("MANUAL_REVIEW_REQUIRED")
                            .message(String.format(Locale.US,
                                    "Độ tin cậy nhận diện trường '%s' thấp (%.2f < %.2f). Cần đối chiếu kiểm tra thủ công.",
                                    entry.getKey(), entry.getValue(), CONFIDENCE_THRESHOLD))
                            .severity("WARNING")
                            .build());
                }
            }
        }

        // 3. Determine Overall Validity (Valid iff no ERROR severity issues)
        long errorCount = issues.stream().filter(i -> "ERROR".equalsIgnoreCase(i.getSeverity())).count();
        boolean isValid = (errorCount == 0);

        double overallConfidence = fields.getOverallConfidence() != null ? fields.getOverallConfidence() : 0.95;

        String summary = isValid
                ? "Biểu mẫu hợp lệ. Các thông tin định danh, ngày cấp và nơi thường trú khớp đúng quy chuẩn hành chính."
                : String.format("Phát hiện %d lỗi sai định dạng hoặc không nhất quán thông tin. Vui lòng sửa lại trên biểu mẫu giấy trước khi nộp tại UBND.", errorCount);

        FormPrecheckReport report = FormPrecheckReport.builder()
                .submissionCode(submissionCode)
                .formType(effectiveFormType)
                .valid(isValid)
                .overallConfidence(overallConfidence)
                .extractedFields(fields)
                .issues(issues)
                .summaryMessage(summary)
                .disclaimer(LEGAL_DISCLAIMER)
                .build();

        // 4. Persist Audit Record into FormSubmission entity
        try {
            FormSubmission submission = FormSubmission.builder()
                    .submissionCode(submissionCode)
                    .formType(effectiveFormType)
                    .filePath(originalFilename != null ? originalFilename : "uploaded_form.png")
                    .ocrRawResult(objectMapper.writeValueAsString(fields))
                    .validationReport(objectMapper.writeValueAsString(issues))
                    .isValid(isValid)
                    .confidenceScore(BigDecimal.valueOf(overallConfidence).setScale(3, RoundingMode.HALF_UP))
                    .build();

            submissionRepository.save(submission);
            log.info("Persisted FormSubmission [{}] - Valid: {}, Errors: {}", submissionCode, isValid, errorCount);
        } catch (Exception e) {
            log.warn("Failed to persist FormSubmission audit log: {}", e.getMessage());
        }

        return report;
    }

    private String generateSubmissionCode() {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String rand = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        return "FORM_" + timestamp + "_" + rand;
    }
}

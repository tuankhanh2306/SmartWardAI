package vn.edu.uth.smartward.formcheck.strategy;

import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckRequest;
import vn.edu.uth.smartward.formcheck.dto.StructuredFormPrecheckResponse.FieldValidationItem;

import java.util.List;
import java.util.Map;

/**
 * GoF Strategy Pattern interface for domain-specific administrative form validation.
 */
public interface FormPrecheckStrategy {

    boolean supports(String formType);

    void validate(
            StructuredFormPrecheckRequest req,
            Map<String, String> data,
            List<FieldValidationItem> validations,
            List<String> warnings
    );
}

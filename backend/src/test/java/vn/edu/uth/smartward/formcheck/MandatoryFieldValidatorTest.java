package vn.edu.uth.smartward.formcheck;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.edu.uth.smartward.formcheck.dto.ExtractedFormFields;
import vn.edu.uth.smartward.formcheck.dto.FormValidationIssue;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class MandatoryFieldValidatorTest {

    private MandatoryFieldValidator validator;

    @BeforeEach
    void setUp() {
        validator = new MandatoryFieldValidator();
    }

    @Test
    void testValidate_allFieldsPresent() {
        ExtractedFormFields fields = ExtractedFormFields.builder()
                .fullName("NGUYỄN VĂN AN")
                .birthDate("15/08/1995")
                .gender("Nam")
                .cccdNumber("079095012345")
                .permanentAddress("Số 15 Võ Oanh, Phường 25, Bình Thạnh")
                .build();

        List<FormValidationIssue> issues = validator.validate(fields);
        assertTrue(issues.isEmpty(), "When all mandatory fields are present, no issues expected");
    }

    @Test
    void testValidate_missingPermanentAddress() {
        ExtractedFormFields fields = ExtractedFormFields.builder()
                .fullName("HOÀNG PHƯƠNG THẢO")
                .birthDate("03/03/2001")
                .gender("Nữ")
                .cccdNumber("074301547879")
                .permanentAddress("") // empty
                .build();

        List<FormValidationIssue> issues = validator.validate(fields);
        assertEquals(1, issues.size());
        assertEquals("permanentAddress", issues.get(0).getField());
        assertEquals("MISSING_MANDATORY_FIELD", issues.get(0).getErrorType());
    }
}

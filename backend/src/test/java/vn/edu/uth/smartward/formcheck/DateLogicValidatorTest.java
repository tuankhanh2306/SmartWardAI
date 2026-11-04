package vn.edu.uth.smartward.formcheck;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.edu.uth.smartward.formcheck.dto.FormValidationIssue;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class DateLogicValidatorTest {

    private DateLogicValidator validator;

    @BeforeEach
    void setUp() {
        validator = new DateLogicValidator();
    }

    @Test
    void testValidate_validDates() {
        List<FormValidationIssue> issues = validator.validate("15/08/1995", "20/09/2021");
        assertTrue(issues.isEmpty(), "Valid birth and issue dates should have 0 issues");
    }

    @Test
    void testValidate_futureIssueDate() {
        String futureDate = LocalDate.now().plusYears(1).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        List<FormValidationIssue> issues = validator.validate("15/08/1995", futureDate);
        assertEquals(1, issues.size());
        assertEquals("INVALID_DATE_LOGIC", issues.get(0).getErrorType());
        assertTrue(issues.get(0).getMessage().contains("tương lai"));
    }

    @Test
    void testValidate_issueDateBeforeBirthDate() {
        // Born 2004, issued 2002
        List<FormValidationIssue> issues = validator.validate("09/08/2004", "10/05/2002");
        assertEquals(1, issues.size());
        assertEquals("INVALID_DATE_LOGIC", issues.get(0).getErrorType());
        assertTrue(issues.get(0).getMessage().contains("trước ngày sinh"));
    }

    @Test
    void testValidate_under14YearsOldAtIssuance() {
        // Born 2015, issued 2021 (6 years old, not allowed for CCCD)
        List<FormValidationIssue> issues = validator.validate("15/08/2015", "20/09/2021");
        assertEquals(1, issues.size());
        assertEquals("INVALID_DATE_LOGIC", issues.get(0).getErrorType());
        assertTrue(issues.get(0).getMessage().contains("chưa đủ 14 tuổi"));
    }
}

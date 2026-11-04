package vn.edu.uth.smartward.formcheck;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.edu.uth.smartward.formcheck.dto.FormValidationIssue;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class CccdValidatorTest {

    private CccdValidator validator;

    @BeforeEach
    void setUp() {
        validator = new CccdValidator();
    }

    @Test
    void testValidate_validCccd() {
        // Female born 1984 in Da Nang (048), century/gender=1, year=84
        List<FormValidationIssue> issues = validator.validate("048184451695", "13/07/1984", "Nữ");
        assertTrue(issues.isEmpty(), "Valid CCCD should have 0 issues");
    }

    @Test
    void testValidate_validCccd2000s() {
        // Female born 2000 in HCMC (079), century/gender=3, year=00
        List<FormValidationIssue> issues = validator.validate("079300703189", "05/05/2000", "Nữ");
        assertTrue(issues.isEmpty(), "Valid CCCD of 2000s female should have 0 issues");
    }

    @Test
    void testValidate_invalidLength() {
        List<FormValidationIssue> issues = validator.validate("079095012", "15/08/1995", "Nam");
        assertEquals(1, issues.size());
        assertEquals("INVALID_CCCD_LENGTH", issues.get(0).getErrorType());
        assertTrue(issues.get(0).getMessage().contains("12 chữ số"));
    }

    @Test
    void testValidate_invalidProvince() {
        // Province "999" does not exist in Vietnam's 63 provinces
        List<FormValidationIssue> issues = validator.validate("999095531586", "10/02/1995", "Nam");
        assertEquals(1, issues.size());
        assertEquals("INVALID_CCCD_PROVINCE", issues.get(0).getErrorType());
        assertTrue(issues.get(0).getMessage().contains("999"));
    }

    @Test
    void testValidate_invalidCenturyGender() {
        // Female born 1993 should have gender digit 1, but CCCD has 2 (which is Male 2000s)
        List<FormValidationIssue> issues = validator.validate("075293840819", "18/08/1993", "Nữ");
        assertEquals(1, issues.size());
        assertEquals("INVALID_CCCD_CENTURY_GENDER", issues.get(0).getErrorType());
    }

    @Test
    void testValidate_invalidBirthYear() {
        // Born 2004 (should be 04), but CCCD has 88
        List<FormValidationIssue> issues = validator.validate("048288444054", "23/06/2004", "Nam");
        assertEquals(1, issues.size());
        assertEquals("INVALID_CCCD_YEAR", issues.get(0).getErrorType());
        assertTrue(issues.get(0).getMessage().contains("88"));
    }

    @Test
    void testValidate_missingCccd() {
        List<FormValidationIssue> issues = validator.validate("", "15/08/1995", "Nam");
        assertEquals(1, issues.size());
        assertEquals("MISSING_MANDATORY_FIELD", issues.get(0).getErrorType());
    }
}

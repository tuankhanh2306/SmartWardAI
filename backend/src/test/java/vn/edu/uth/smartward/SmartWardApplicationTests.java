package vn.edu.uth.smartward;

import org.junit.jupiter.api.Test;
import vn.edu.uth.smartward.common.ApiResponse;
import vn.edu.uth.smartward.common.ErrorCode;

import static org.junit.jupiter.api.Assertions.*;

class SmartWardApplicationTests {

    @Test
    void testApiResponseOk() {
        ApiResponse<String> response = ApiResponse.ok("Hello UTH SmartWard");
        assertTrue(response.success());
        assertEquals("Hello UTH SmartWard", response.data());
        assertNotNull(response.timestamp());
    }

    @Test
    void testApiResponseError() {
        ApiResponse<Void> response = ApiResponse.error("Something went wrong", ErrorCode.INVALID_REQUEST.getCode());
        assertFalse(response.success());
        assertEquals("SW_400", response.errorCode());
    }
}

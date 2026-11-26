package vn.edu.uth.smartward.notification;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.uth.smartward.common.ApiResponse;

import java.util.Map;

/**
 * TASK-023: Mobile Push Notifications Registration API.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final PushNotificationService pushNotificationService;

    @PostMapping("/register-device")
    public ResponseEntity<ApiResponse<DeviceRegistrationResponse>> registerDevice(
            @Valid @RequestBody RegisterDeviceRequest request
    ) {
        DeviceRegistrationResponse response = pushNotificationService.registerDevice(request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping("/unregister-device")
    public ResponseEntity<ApiResponse<Map<String, Object>>> unregisterDevice(
            @RequestBody Map<String, String> payload
    ) {
        String token = payload != null ? payload.get("expoPushToken") : null;
        boolean deactivated = pushNotificationService.unregisterDevice(token);
        return ResponseEntity.ok(ApiResponse.ok(Map.of("unregistered", deactivated)));
    }
}

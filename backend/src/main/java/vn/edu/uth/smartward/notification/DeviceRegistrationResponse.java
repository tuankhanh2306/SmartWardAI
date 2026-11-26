package vn.edu.uth.smartward.notification;

import java.time.Instant;

public record DeviceRegistrationResponse(
        boolean registered,
        Long deviceId,
        String platform,
        String wardCode,
        String dossierCode,
        Instant updatedAt
) {}

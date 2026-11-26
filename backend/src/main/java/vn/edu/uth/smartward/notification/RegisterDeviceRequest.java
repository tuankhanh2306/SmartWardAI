package vn.edu.uth.smartward.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterDeviceRequest(
        @NotBlank(message = "Expo push token không được để trống.")
        @Size(max = 255, message = "Expo push token tối đa 255 ký tự.")
        String expoPushToken,

        @Size(max = 20)
        String platform,

        @Size(max = 64)
        String wardCode,

        @Size(max = 64)
        String dossierCode,

        @Size(max = 120)
        String deviceLabel
) {}

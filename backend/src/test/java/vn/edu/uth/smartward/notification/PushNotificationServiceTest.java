package vn.edu.uth.smartward.notification;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.dossier.CitizenDossier;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PushNotificationServiceTest {

    private NotificationDeviceTokenRepository tokenRepo;
    private NotificationDeliveryLogRepository logRepo;
    private PushNotificationService service;

    @BeforeEach
    void setUp() {
        tokenRepo = mock(NotificationDeviceTokenRepository.class);
        logRepo = mock(NotificationDeliveryLogRepository.class);
        service = new PushNotificationService(tokenRepo, logRepo, new ObjectMapper(), false);
    }

    @Test
    void registerDevice_acceptsValidExpoTokenAndNormalizesDossierCode() {
        when(tokenRepo.findByExpoPushToken("ExponentPushToken[abc123XYZ]")).thenReturn(Optional.empty());
        when(tokenRepo.save(any(NotificationDeviceToken.class))).thenAnswer(inv -> {
            NotificationDeviceToken e = inv.getArgument(0);
            e.setId(42L);
            e.setUpdatedAt(Instant.now());
            return e;
        });

        RegisterDeviceRequest req = new RegisterDeviceRequest(
                "ExponentPushToken[abc123XYZ]",
                "Android",
                "AG_P_LONGXUYEN",
                "hs-2026-0001",
                "Pixel 8"
        );

        DeviceRegistrationResponse res = service.registerDevice(req);
        assertTrue(res.registered());
        assertEquals(42L, res.deviceId());
        assertEquals("android", res.platform());
        assertEquals("HS-2026-0001", res.dossierCode());
    }

    @Test
    void registerDevice_rejectsInvalidTokenFormat() {
        RegisterDeviceRequest bad = new RegisterDeviceRequest(
                "invalid-raw-token", "ios", "AG_P_LONGXUYEN", "HS-1", null
        );
        assertThrows(BusinessException.class, () -> service.registerDevice(bad));
    }

    @Test
    void notifyDossierStatusChanged_redactsCccdAndRecordsDeliveryLog() {
        NotificationDeviceToken target = NotificationDeviceToken.builder()
                .id(1L)
                .expoPushToken("ExponentPushToken[citizenDevice01]")
                .dossierCode("HS-2026-8888")
                .active(true)
                .build();
        when(tokenRepo.findByDossierCodeIgnoreCaseAndActiveTrue("HS-2026-8888"))
                .thenReturn(List.of(target));

        CitizenDossier dossier = CitizenDossier.builder()
                .dossierCode("HS-2026-8888")
                .status("NEED_SUPPLEMENT")
                .build();

        int count = service.notifyDossierStatusChanged(
                dossier, "PENDING", "Vui lòng đối chiếu số CCCD 089200012345 bản gốc"
        );

        assertEquals(1, count);
        ArgumentCaptor<NotificationDeliveryLog> captor = ArgumentCaptor.forClass(NotificationDeliveryLog.class);
        verify(logRepo).save(captor.capture());
        NotificationDeliveryLog savedLog = captor.getValue();
        assertEquals("SKIPPED_MOCK", savedLog.getStatus());
        assertFalse(savedLog.getBody().contains("089200012345"), "PII CCCD must be redacted from push body");
        assertTrue(savedLog.getBody().contains("***"));
    }
}

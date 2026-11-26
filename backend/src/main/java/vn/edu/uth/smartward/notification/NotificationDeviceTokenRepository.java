package vn.edu.uth.smartward.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NotificationDeviceTokenRepository extends JpaRepository<NotificationDeviceToken, Long> {

    Optional<NotificationDeviceToken> findByExpoPushToken(String expoPushToken);

    List<NotificationDeviceToken> findByDossierCodeIgnoreCaseAndActiveTrue(String dossierCode);
}

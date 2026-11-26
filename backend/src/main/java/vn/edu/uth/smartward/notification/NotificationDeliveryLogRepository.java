package vn.edu.uth.smartward.notification;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationDeliveryLogRepository extends JpaRepository<NotificationDeliveryLog, Long> {

    List<NotificationDeliveryLog> findTop20ByDossierCodeIgnoreCaseOrderByCreatedAtDesc(String dossierCode);
}

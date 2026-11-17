package vn.edu.uth.smartward.audit;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findByWhoOrderByCreatedAtDesc(String who);
    List<AuditLog> findByWardOrderByCreatedAtDesc(String ward);
}

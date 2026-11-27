package vn.edu.uth.smartward.audit;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    @Autowired
    public AuditService(@Autowired(required = false) AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logAction(String who, String ward, String action, String entity, String entityId, String ip, String userAgent) {
        logProcedureAction(who, ward, action, entity, entityId, null, null, null, ip, userAgent);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logProcedureAction(String who,
                                   String ward,
                                   String action,
                                   String entity,
                                   String entityId,
                                   Integer versionNo,
                                   String beforeSnapshot,
                                   String afterSnapshot,
                                   String ip,
                                   String userAgent) {
        try {
            if (auditLogRepository != null) {
                AuditLog logEntry = AuditLog.builder()
                        .who(who != null && !who.isBlank() ? who : "ANONYMOUS")
                        .ward(ward != null && !ward.isBlank() ? ward : "SYSTEM")
                        .action(action)
                        .entity(entity)
                        .entityId(entityId)
                        .versionNo(versionNo)
                        .beforeSnapshot(beforeSnapshot)
                        .afterSnapshot(afterSnapshot)
                        .ip(ip != null && !ip.isBlank() ? ip : "127.0.0.1")
                        .userAgent(userAgent)
                        .build();
                auditLogRepository.save(logEntry);
            }
            log.info("[AUDIT] who='{}' ward='{}' action='{}' entity='{}' entityId='{}' versionNo={} ip='{}'",
                    who, ward, action, entity, entityId, versionNo, ip);
        } catch (Exception e) {
            log.warn("Failed to persist audit log entry: {}", e.getMessage());
        }
    }
}

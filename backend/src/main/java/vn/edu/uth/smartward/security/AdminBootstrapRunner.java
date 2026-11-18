package vn.edu.uth.smartward.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import vn.edu.uth.smartward.audit.AuditService;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.AclEntry;
import java.nio.file.attribute.AclEntryPermission;
import java.nio.file.attribute.AclEntryType;
import java.nio.file.attribute.AclFileAttributeView;
import java.nio.file.attribute.PosixFilePermissions;
import java.nio.file.attribute.UserPrincipal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;

/**
 * Production bootstrap runner for first-time Provincial Admin accounts (ADM-AG-0001, ADM-AG-0002).
 * - Activated only when smartward.bootstrap.init-admins=true (SMARTWARD_BOOTSTRAP_INIT=true).
 * - Writes 16-char CSPRNG Base32 one-time PINs (24h TTL) to an external operator-controlled volume or tmpfs
 *   with strict 0600 (POSIX) / owner-only ACL (Windows). Never logs any PIN to stdout/stderr/logs.
 * - Rejects secret file paths inside the repository or application working directory.
 * - Allows safe re-run ONLY when a pending 24h bootstrap PIN has expired without being changed;
 *   never overwrites an Admin account that already completed first-login PIN change (must_change_pin=false).
 */
@Slf4j
@Component
@Order(10)
public class AdminBootstrapRunner implements CommandLineRunner {

    private final OfficerRepository officerRepository;
    private final OfficerAuthService officerAuthService;
    private final AuditService auditService;

    @Value("${smartward.bootstrap.init-admins:false}")
    private boolean initAdmins;

    @Value("${smartward.bootstrap.purge-secret-file:false}")
    private boolean purgeSecretFile;

    @Value("${smartward.bootstrap.secret-file:}")
    private String secretFilePath;

    private record AdminSpec(String badgeId, String fullName) {}

    private static final List<AdminSpec> ADMIN_SPECS = List.of(
            new AdminSpec("ADM-AG-0001", "Lê Văn Quản Trị — Quản trị viên Hệ thống Tỉnh"),
            new AdminSpec("ADM-AG-0002", "Phạm Minh Quân — Phó Quản trị viên Kiểm soát TTHC")
    );

    @Autowired
    public AdminBootstrapRunner(@Autowired(required = false) OfficerRepository officerRepository,
                                OfficerAuthService officerAuthService,
                                @Autowired(required = false) AuditService auditService) {
        this.officerRepository = officerRepository;
        this.officerAuthService = officerAuthService;
        this.auditService = auditService;
    }

    @Override
    public void run(String... args) {
        if (purgeSecretFile) {
            purgeSecretFileQuietly();
        }
        if (!initAdmins) {
            return;
        }
        executeBootstrap();
    }

    public List<String> executeBootstrap() {
        if (officerRepository == null) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR, "OfficerRepository is required for admin bootstrap.");
        }
        Path validatedSecretFile = validateSecretFilePath(secretFilePath);
        Instant now = Instant.now();
        Instant expiresAt = now.plus(Duration.ofHours(24));

        List<String> issuedLines = new ArrayList<>();
        List<String> provisionedBadges = new ArrayList<>();

        for (AdminSpec spec : ADMIN_SPECS) {
            Officer officer = officerRepository.findByBadgeIdIgnoreCase(spec.badgeId()).orElse(null);
            boolean isNew = (officer == null);
            boolean isRevoked = !isNew && OfficerAuthService.isCompromisedOrRevokedHash(officer.getPasswordHash());
            boolean isExpiredPending = !isNew
                    && Boolean.TRUE.equals(officer.getMustChangePin())
                    && officer.getPinExpiresAt() != null
                    && officer.getPinExpiresAt().isBefore(now);

            if (!isNew && Boolean.FALSE.equals(officer.getMustChangePin()) && !isRevoked) {
                log.info("[BOOTSTRAP] Admin {} already completed PIN setup (must_change_pin=false); skipping.", spec.badgeId());
                continue;
            }
            if (!isNew && !isRevoked && !isExpiredPending) {
                log.info("[BOOTSTRAP] Admin {} already has an active unexpired bootstrap PIN (expiresAt={}); skipping.",
                        spec.badgeId(), officer.getPinExpiresAt());
                continue;
            }

            String oneTimePin = OfficerAuthService.generateCsprngBase32Pin(16);
            String encoded = officerAuthService.encodePassword(oneTimePin);

            if (isNew) {
                officer = Officer.builder()
                        .badgeId(spec.badgeId())
                        .fullName(spec.fullName())
                        .wardCode("AG_PROVINCE")
                        .role("ADMIN")
                        .passwordHash(encoded)
                        .mustChangePin(true)
                        .pinExpiresAt(expiresAt)
                        .failedAttempts(0)
                        .active(true)
                        .build();
            } else {
                officer.setWardCode("AG_PROVINCE");
                officer.setRole("ADMIN");
                officer.setPasswordHash(encoded);
                officer.setMustChangePin(true);
                officer.setPinExpiresAt(expiresAt);
                officer.setFailedAttempts(0);
                officer.setLockedUntil(null);
                officer.setActive(true);
            }
            officerRepository.save(officer);

            String auditEvent = isExpiredPending ? "ADMIN_BOOTSTRAP_RENEWED_EXPIRED" : "ADMIN_BOOTSTRAP_ISSUED";
            if (auditService != null) {
                auditService.logAction("SYSTEM_BOOTSTRAP", "AG_PROVINCE", auditEvent, "OFFICER", spec.badgeId(), "127.0.0.1", null);
            }

            issuedLines.add(spec.badgeId() + "=" + oneTimePin);
            provisionedBadges.add(spec.badgeId());
        }

        if (!issuedLines.isEmpty()) {
            writeRestrictedSecretFile(validatedSecretFile, issuedLines, expiresAt);
            log.info("[BOOTSTRAP] Provisioned 24h one-time bootstrap PINs for {} to restricted file {} (expiresAt={}).",
                    provisionedBadges, validatedSecretFile, expiresAt);
        }
        return provisionedBadges;
    }

    public static Path validateSecretFilePath(String rawPath) {
        if (rawPath == null || rawPath.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    "SMARTWARD_BOOTSTRAP_SECRET_FILE must be set to an operator-controlled volume or tmpfs path.");
        }
        Path candidate = Path.of(rawPath.trim()).toAbsolutePath().normalize();
        Path workDir = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();

        if (candidate.startsWith(workDir)) {
            throw new BusinessException(ErrorCode.FORBIDDEN,
                    "Bootstrap secret file must reside on an external volume or tmpfs, NEVER inside working directory: " + workDir);
        }
        if ("backend".equalsIgnoreCase(workDir.getFileName() != null ? workDir.getFileName().toString() : "")) {
            Path repoRoot = workDir.getParent();
            if (repoRoot != null && candidate.startsWith(repoRoot)) {
                throw new BusinessException(ErrorCode.FORBIDDEN,
                        "Bootstrap secret file must reside outside repository directory: " + repoRoot);
            }
        }
        return candidate;
    }

    private void writeRestrictedSecretFile(Path secretFile, List<String> lines, Instant expiresAt) {
        try {
            Path parent = secretFile.getParent();
            if (parent != null) {
                Files.createDirectories(parent);
            }
            StringBuilder content = new StringBuilder();
            content.append("# SmartWard AI One-Time Admin Bootstrap PINs (expiresAt=").append(expiresAt).append(")\n");
            for (String line : lines) {
                content.append(line).append("\n");
            }

            if (Files.exists(secretFile)) {
                Files.deleteIfExists(secretFile);
            }
            if (FileSystems.getDefault().supportedFileAttributeViews().contains("posix")) {
                Files.createFile(secretFile, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
                Files.writeString(secretFile, content.toString(), StandardCharsets.UTF_8, StandardOpenOption.TRUNCATE_EXISTING);
            } else {
                Files.writeString(secretFile, content.toString(), StandardCharsets.UTF_8,
                        StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
                applyWindowsOwnerOnlyAcl(secretFile);
            }
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INTERNAL_SERVER_ERROR,
                    "Không thể ghi tệp bootstrap admin an toàn: " + e.getMessage());
        }
    }

    private void applyWindowsOwnerOnlyAcl(Path file) {
        try {
            AclFileAttributeView aclView = Files.getFileAttributeView(file, AclFileAttributeView.class);
            if (aclView != null) {
                String currentUserName = System.getProperty("user.name");
                UserPrincipal currentUser = (currentUserName != null && !currentUserName.isBlank())
                        ? file.getFileSystem().getUserPrincipalLookupService().lookupPrincipalByName(currentUserName)
                        : Files.getOwner(file);
                Files.setOwner(file, currentUser);
                AclEntry entry = AclEntry.newBuilder()
                        .setType(AclEntryType.ALLOW)
                        .setPrincipal(currentUser)
                        .setPermissions(EnumSet.allOf(AclEntryPermission.class))
                        .build();
                aclView.setAcl(List.of(entry));
            }
        } catch (Exception e) {
            log.warn("Could not tighten Windows ACL on bootstrap secret file: {}", e.getMessage());
        }
    }

    private void purgeSecretFileQuietly() {
        if (secretFilePath == null || secretFilePath.isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(Path.of(secretFilePath.trim()).toAbsolutePath().normalize());
            log.info("[BOOTSTRAP] Purged bootstrap secret file.");
        } catch (Exception e) {
            log.warn("[BOOTSTRAP] Failed to purge secret file: {}", e.getMessage());
        }
    }
}

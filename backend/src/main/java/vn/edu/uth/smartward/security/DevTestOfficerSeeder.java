package vn.edu.uth.smartward.security;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

/**
 * Seeds sample officer and admin accounts strictly in 'dev' and 'test' profiles.
 * Never loaded in production. Dynamically hashes a dev/test PIN (>= 6 chars) at runtime
 * so no compromised seed hash or short 4-digit PIN works in production.
 */
@Slf4j
@Component
@Profile({"dev", "test"})
@Order(20)
@RequiredArgsConstructor
public class DevTestOfficerSeeder implements CommandLineRunner {

    private final OfficerRepository officerRepository;
    private final OfficerAuthService officerAuthService;

    @Value("${smartward.dev-seed.pin:SmartWardDev2026!}")
    private String devDefaultPin;

    private record SeedAccountSpec(String badgeId, String fullName, String wardCode, String role) {}

    private static final List<SeedAccountSpec> DEV_ACCOUNTS = List.of(
            new SeedAccountSpec("CC-AG-8942", "Trần Quốc Bảo — Cán bộ Tư pháp - Hộ tịch", "AG_P_LONGXUYEN", "OFFICER"),
            new SeedAccountSpec("CC-AG-1001", "Nguyễn Thị Minh Khai — Cán bộ Địa chính - Đô thị", "AG_P_LONGXUYEN", "OFFICER"),
            new SeedAccountSpec("ADM-AG-0001", "Lê Văn Quản Trị — Quản trị viên Hệ thống Tỉnh", "AG_PROVINCE", "ADMIN"),
            new SeedAccountSpec("ADM-AG-0002", "Phạm Minh Quân — Phó Quản trị viên Kiểm soát TTHC", "AG_PROVINCE", "ADMIN")
    );

    @Override
    public void run(String... args) {
        if (officerRepository == null) {
            return;
        }
        String effectivePin = (devDefaultPin != null && devDefaultPin.trim().length() >= 6)
                ? devDefaultPin.trim()
                : "SmartWardDev2026!";

        int seededCount = 0;
        for (SeedAccountSpec spec : DEV_ACCOUNTS) {
            try {
                Officer existing = officerRepository.findByBadgeIdIgnoreCase(spec.badgeId()).orElse(null);
                if (existing == null) {
                    Officer created = Officer.builder()
                            .badgeId(spec.badgeId())
                            .fullName(spec.fullName())
                            .wardCode(spec.wardCode())
                            .role(spec.role())
                            .passwordHash(officerAuthService.encodePassword(effectivePin))
                            .mustChangePin(true)
                            .pinExpiresAt(Instant.now().plus(Duration.ofHours(24)))
                            .failedAttempts(0)
                            .active(true)
                            .build();
                    officerRepository.save(created);
                    seededCount++;
                } else if (OfficerAuthService.isCompromisedOrRevokedHash(existing.getPasswordHash())) {
                    existing.setPasswordHash(officerAuthService.encodePassword(effectivePin));
                    existing.setMustChangePin(true);
                    existing.setPinExpiresAt(Instant.now().plus(Duration.ofHours(24)));
                    existing.setFailedAttempts(0);
                    existing.setLockedUntil(null);
                    officerRepository.save(existing);
                    seededCount++;
                }
            } catch (Exception e) {
                log.debug("DevTestOfficerSeeder skipped {} during non-DB test context: {}", spec.badgeId(), e.getMessage());
            }
        }
        if (seededCount > 0) {
            log.info("[DEV/TEST SEEDER] Provisioned {} sample accounts in dev/test profile.", seededCount);
        }
    }
}

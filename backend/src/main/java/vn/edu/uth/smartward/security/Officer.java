package vn.edu.uth.smartward.security;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "officers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Officer {

    @Id
    @Column(name = "badge_id", length = 32)
    private String badgeId;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(name = "ward_code", nullable = false, length = 64)
    private String wardCode;

    @Column(name = "role", nullable = false, length = 32)
    @Builder.Default
    private String role = "OFFICER";

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "failed_attempts", nullable = false)
    @Builder.Default
    private Integer failedAttempts = 0;

    @Column(name = "locked_until")
    private Instant lockedUntil;

    @Column(name = "last_login")
    private Instant lastLogin;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "must_change_pin", nullable = false)
    @Builder.Default
    private Boolean mustChangePin = false;

    @Column(name = "pin_expires_at")
    private Instant pinExpiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}

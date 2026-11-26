package vn.edu.uth.smartward.ward;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "ward_registry")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WardRegistry {

    @Id
    @Column(name = "ward_code", length = 64)
    private String wardCode;

    @Column(name = "name", nullable = false, length = 160)
    private String name;

    @Column(name = "ward_type", nullable = false, length = 40)
    private String wardType;

    @Column(name = "area", length = 160)
    private String area;

    @Column(name = "province", nullable = false, length = 100)
    private String province;

    @Column(name = "office_address", nullable = false, columnDefinition = "TEXT")
    private String officeAddress;

    @Column(name = "phone_number", length = 40)
    private String phoneNumber;

    @Column(name = "lat", nullable = false)
    private double lat;

    @Column(name = "lon", nullable = false)
    private double lon;

    @Column(name = "working_hours", length = 200)
    private String workingHours;

    @Column(name = "online_services_json", columnDefinition = "TEXT")
    private String onlineServicesJson;

    @Column(name = "boundary_json", columnDefinition = "TEXT")
    private String boundaryJson;

    @Column(name = "coord_source", length = 40)
    private String coordSource;

    @Column(name = "accuracy_note", columnDefinition = "TEXT")
    private String accuracyNote;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    public void touch() {
        this.updatedAt = Instant.now();
    }
}

package vn.edu.uth.smartward.vault;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "vault_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VaultDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_code", nullable = false, unique = true, length = 50)
    private String documentCode;

    @Column(name = "minio_object_path", nullable = false, length = 500)
    private String minioObjectPath;

    @Column(name = "encryption_algorithm", nullable = false, length = 50)
    @Builder.Default
    private String encryptionAlgorithm = "AES/GCM/NoPadding";

    @Column(name = "watermark_content", length = 255)
    private String watermarkContent;

    @Column(name = "one_time_token", unique = true, length = 100)
    private String oneTimeToken;

    @Column(name = "is_viewed", nullable = false)
    @Builder.Default
    private Boolean isViewed = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;
}

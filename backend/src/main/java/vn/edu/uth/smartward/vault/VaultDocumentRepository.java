package vn.edu.uth.smartward.vault;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VaultDocumentRepository extends JpaRepository<VaultDocument, Long> {

    Optional<VaultDocument> findByDocumentCode(String documentCode);

    Optional<VaultDocument> findByOneTimeToken(String oneTimeToken);

    List<VaultDocument> findByExpiresAtBefore(OffsetDateTime cutoff);
}

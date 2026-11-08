package vn.edu.uth.smartward.vault;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VaultDocumentRepository extends JpaRepository<VaultDocument, Long> {

    Optional<VaultDocument> findByDocumentCode(String documentCode);

    Optional<VaultDocument> findByOneTimeToken(String oneTimeToken);

    List<VaultDocument> findByExpiresAtBefore(OffsetDateTime cutoff);

    @Modifying
    @Query("UPDATE VaultDocument v SET v.isViewed = true WHERE v.documentCode = :docCode AND v.isViewed = false")
    int markAsViewedAtomically(@Param("docCode") String documentCode);
}

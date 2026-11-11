package vn.edu.uth.smartward.dossier;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CitizenDossierRepository extends JpaRepository<CitizenDossier, Long> {

    Optional<CitizenDossier> findByDossierCode(String dossierCode);

    Optional<CitizenDossier> findByDossierCodeIgnoreCase(String dossierCode);

    boolean existsByDossierCode(String dossierCode);

    long countByDossierCodeStartingWith(String prefix);

    List<CitizenDossier> findByWardCodeIgnoreCaseOrderByCreatedAtDesc(String wardCode);

    List<CitizenDossier> findByWardCodeIgnoreCaseAndStatusIgnoreCaseOrderByCreatedAtDesc(String wardCode, String status);

    List<CitizenDossier> findByStatusIgnoreCaseOrderByCreatedAtDesc(String status);

    List<CitizenDossier> findAllByOrderByCreatedAtDesc();

    @Query("SELECT d FROM CitizenDossier d WHERE LOWER(d.dossierCode) = LOWER(:dossierCode) AND TRIM(d.citizenCccd) LIKE CONCAT('%', :last4Cccd)")
    Optional<CitizenDossier> findByDossierCodeAndLast4Cccd(@Param("dossierCode") String dossierCode, @Param("last4Cccd") String last4Cccd);
}

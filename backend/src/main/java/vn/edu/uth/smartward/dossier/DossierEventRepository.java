package vn.edu.uth.smartward.dossier;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DossierEventRepository extends JpaRepository<DossierEvent, Long> {
    List<DossierEvent> findByDossierCodeOrderByCreatedAtAsc(String dossierCode);
}

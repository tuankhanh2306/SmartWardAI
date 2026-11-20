package vn.edu.uth.smartward.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HitlGrayZoneRepository extends JpaRepository<HitlGrayZoneItem, String> {

    boolean existsByQueryIgnoreCase(String query);

    List<HitlGrayZoneItem> findAllByOrderByCreatedAtTsDesc();
}

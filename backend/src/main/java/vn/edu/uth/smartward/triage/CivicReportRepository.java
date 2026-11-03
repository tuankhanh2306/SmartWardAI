package vn.edu.uth.smartward.triage;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CivicReportRepository extends JpaRepository<CivicReport, Long> {

    Optional<CivicReport> findByReportCode(String reportCode);

    List<CivicReport> findByClusterId(Long clusterId);

    List<CivicReport> findByCategory(String category);
}

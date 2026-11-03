package vn.edu.uth.smartward.triage;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IssueClusterRepository extends JpaRepository<IssueCluster, Long> {

    Optional<IssueCluster> findByClusterCode(String clusterCode);

    List<IssueCluster> findByCategoryAndStatus(String category, String status);

    List<IssueCluster> findByStatus(String status);
}

package vn.edu.uth.smartward.agent;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgentTraceRepository extends JpaRepository<AgentTrace, String> {

    List<AgentTrace> findByCorrelationId(String correlationId);

    List<AgentTrace> findTop20ByOrderByCreatedAtDesc();
}

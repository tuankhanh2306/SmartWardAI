package vn.edu.uth.smartward.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdminProcedureRepository extends JpaRepository<AdminProcedure, Long> {

    Optional<AdminProcedure> findByProcedureCode(String procedureCode);

    List<AdminProcedure> findByCategory(String category);

    List<AdminProcedure> findByStatus(String status);
}

package vn.edu.uth.smartward.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AdminProcedureRepository extends JpaRepository<AdminProcedure, Long> {

    Optional<AdminProcedure> findByProcedureCode(String procedureCode);

    List<AdminProcedure> findByCategory(String category);

    List<AdminProcedure> findByStatus(String status);

    @Query("""
        SELECT p FROM AdminProcedure p
        WHERE (:category IS NULL OR :category = '' OR :category = 'ALL' OR LOWER(p.category) = LOWER(:category))
          AND (:keyword IS NULL OR :keyword = '' OR 
               LOWER(p.procedureName) LIKE LOWER(CONCAT('%', :keyword, '%')) OR 
               LOWER(p.procedureCode) LIKE LOWER(CONCAT('%', :keyword, '%')) OR
               LOWER(COALESCE(p.portalCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
        ORDER BY p.procedureCode ASC
    """)
    List<AdminProcedure> searchProcedures(@Param("category") String category, @Param("keyword") String keyword);
}

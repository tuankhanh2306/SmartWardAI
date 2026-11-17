package vn.edu.uth.smartward.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProcedureVersionRepository extends JpaRepository<ProcedureVersion, Long> {

    List<ProcedureVersion> findByProcedureIdOrderByVersionNoDesc(Long procedureId);

    Optional<ProcedureVersion> findByProcedureIdAndState(Long procedureId, String state);

    Optional<ProcedureVersion> findByProcedureIdAndVersionNo(Long procedureId, Integer versionNo);

    List<ProcedureVersion> findByStateOrderBySubmittedAtDescCreatedAtDesc(String state);

    @Query("SELECT COALESCE(MAX(pv.versionNo), 0) FROM ProcedureVersion pv WHERE pv.procedure.id = :procedureId")
    int findMaxVersionNoByProcedureId(@Param("procedureId") Long procedureId);
}

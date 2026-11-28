package vn.edu.uth.smartward.security;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SigningDelegationRepository extends JpaRepository<SigningDelegation, Long> {

    List<SigningDelegation> findByWardCodeIgnoreCaseAndProcedureCodeIgnoreCaseAndActiveTrue(
            String wardCode,
            String procedureCode
    );
}

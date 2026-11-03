package vn.edu.uth.smartward.formcheck;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FormSubmissionRepository extends JpaRepository<FormSubmission, Long> {

    Optional<FormSubmission> findBySubmissionCode(String submissionCode);

    List<FormSubmission> findByFormType(String formType);

    List<FormSubmission> findByIsValid(Boolean isValid);
}

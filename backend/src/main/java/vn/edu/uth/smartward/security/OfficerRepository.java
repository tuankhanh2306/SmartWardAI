package vn.edu.uth.smartward.security;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OfficerRepository extends JpaRepository<Officer, String> {
    Optional<Officer> findByBadgeIdIgnoreCase(String badgeId);
}

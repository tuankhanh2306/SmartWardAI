package vn.edu.uth.smartward.ward;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WardRegistryRepository extends JpaRepository<WardRegistry, String> {

    List<WardRegistry> findByActiveTrueOrderByNameAsc();

    Optional<WardRegistry> findByWardCodeIgnoreCaseAndActiveTrue(String wardCode);

    long countByActiveTrue();
}

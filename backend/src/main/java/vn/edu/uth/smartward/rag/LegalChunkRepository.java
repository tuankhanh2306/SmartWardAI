package vn.edu.uth.smartward.rag;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LegalChunkRepository extends JpaRepository<LegalChunk, Long> {

    Optional<LegalChunk> findByChunkCode(String chunkCode);

    List<LegalChunk> findByProcedureId(Long procedureId);

    /**
     * Top-K Cosine Similarity retrieval using pgvector HNSW index.
     * Distance (c.embedding <=> :embedding) is in range [0, 2].
     * Cosine Similarity = 1 - (distance).
     */
    @Query(value = """
        SELECT c.*, 
               (1.0 - (c.embedding <=> cast(:queryVector as vector))) AS similarity_score
        FROM legal_chunks c
        WHERE c.status = 'ACTIVE' 
          AND c.effective_date <= CURRENT_DATE
          AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> cast(:queryVector as vector) ASC
        LIMIT :topK
        """, nativeQuery = true)
    List<LegalChunk> findTopKSimilarChunks(@Param("queryVector") String queryVector, @Param("topK") int topK);
}

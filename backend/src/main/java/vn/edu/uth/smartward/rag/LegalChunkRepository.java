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

    List<LegalChunk> findByEmbeddingIsNull();

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

    /**
     * Top-K Cosine Similarity retrieval joined with AdminProcedure metadata.
     * Projects directly into LegalChunkMatch interface.
     */
    @Query(value = """
        SELECT c.id AS id,
               c.chunk_code AS chunkCode,
               c.chunk_type AS chunkType,
               c.title AS title,
               c.content AS content,
               c.legal_reference AS legalReference,
               p.procedure_code AS procedureCode,
               p.procedure_name AS procedureName,
               (1.0 - (c.embedding <=> cast(:queryVector as vector))) AS similarityScore
        FROM legal_chunks c
        JOIN admin_procedures p ON c.procedure_id = p.id
        WHERE c.status = 'ACTIVE' 
          AND c.effective_date <= CURRENT_DATE
          AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> cast(:queryVector as vector) ASC
        LIMIT :topK
        """, nativeQuery = true)
    List<LegalChunkMatch> findTopKSimilarChunksWithMetadata(@Param("queryVector") String queryVector, @Param("topK") int topK);
}

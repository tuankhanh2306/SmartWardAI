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

    @Query("SELECT c.procedure.id, COUNT(c) FROM LegalChunk c GROUP BY c.procedure.id")
    List<Object[]> countChunksByProcedure();

    List<LegalChunk> findByEmbeddingIsNull();

    List<LegalChunk> findByEmbeddingIsNullOrEmbeddingModelNot(String embeddingModel);

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

    /**
     * Vector-space isolated Top-K Cosine Similarity retrieval.
     * Strictly restricts comparison to rows embedded by the exact same embedding_model
     * (e.g., gemini-embedding-001 vs bkai_pho_bert_ft_v1 vs deterministic-mock-v1).
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
          AND c.embedding_model = :embeddingModel
        ORDER BY c.embedding <=> cast(:queryVector as vector) ASC
        LIMIT :topK
        """, nativeQuery = true)
    List<LegalChunkMatch> findTopKSimilarChunksWithMetadata(
            @Param("queryVector") String queryVector,
            @Param("embeddingModel") String embeddingModel,
            @Param("topK") int topK
    );

    /**
     * TASK-033: ACL-enforced pgvector Cosine retrieval.
     * Citizens (includeOfficerScope = false) can NEVER retrieve OFFICER_ONLY chunks.
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
          AND (:embeddingModel IS NULL OR :embeddingModel = '' OR c.embedding_model = :embeddingModel)
          AND (c.visibility_scope = 'PUBLIC' OR (:includeOfficerScope = TRUE AND c.visibility_scope = 'OFFICER_ONLY'))
          AND (c.ward_code IS NULL OR :wardCode IS NULL OR :wardCode = '' OR UPPER(c.ward_code) = UPPER(:wardCode))
        ORDER BY c.embedding <=> cast(:queryVector as vector) ASC
        LIMIT :topK
        """, nativeQuery = true)
    List<LegalChunkMatch> findTopKSimilarChunksWithAcl(
            @Param("queryVector") String queryVector,
            @Param("embeddingModel") String embeddingModel,
            @Param("includeOfficerScope") boolean includeOfficerScope,
            @Param("wardCode") String wardCode,
            @Param("topK") int topK
    );

    /**
     * TASK-033: ACL-enforced PostgreSQL Full-Text Search (tsvector + GIN) for Hybrid RRF.
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
               CAST(LEAST(0.95, 0.55 + ts_rank_cd(c.search_vector, plainto_tsquery('simple', :queryText))) AS DOUBLE PRECISION) AS similarityScore
        FROM legal_chunks c
        JOIN admin_procedures p ON c.procedure_id = p.id
        WHERE c.status = 'ACTIVE'
          AND c.effective_date <= CURRENT_DATE
          AND c.search_vector @@ plainto_tsquery('simple', :queryText)
          AND (c.visibility_scope = 'PUBLIC' OR (:includeOfficerScope = TRUE AND c.visibility_scope = 'OFFICER_ONLY'))
          AND (c.ward_code IS NULL OR :wardCode IS NULL OR :wardCode = '' OR UPPER(c.ward_code) = UPPER(:wardCode))
        ORDER BY ts_rank_cd(c.search_vector, plainto_tsquery('simple', :queryText)) DESC
        LIMIT :topK
        """, nativeQuery = true)
    List<LegalChunkMatch> findTopKFullTextChunksWithAcl(
            @Param("queryText") String queryText,
            @Param("includeOfficerScope") boolean includeOfficerScope,
            @Param("wardCode") String wardCode,
            @Param("topK") int topK
    );
}

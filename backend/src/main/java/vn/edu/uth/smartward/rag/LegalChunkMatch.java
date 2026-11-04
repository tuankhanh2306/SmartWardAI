package vn.edu.uth.smartward.rag;

/**
 * Projection interface for pgvector HNSW search results.
 * Contains both chunk details, joined procedure metadata, and computed Cosine Similarity score.
 */
public interface LegalChunkMatch {

    Long getId();

    String getChunkCode();

    String getChunkType();

    String getTitle();

    String getContent();

    String getLegalReference();

    String getProcedureCode();

    String getProcedureName();

    Double getSimilarityScore();
}

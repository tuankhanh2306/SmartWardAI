package vn.edu.uth.smartward.ai;

/**
 * Common abstraction for AI model operations across the SmartWard AI platform.
 * Decouples domain logic from specific LLM providers (Gemini vs Offline Deterministic Mock).
 */
public interface AiModelClient {

    /**
     * Immutable embedding generation result containing vector, model ID, and dimension (6.3).
     * Eliminates shared state between concurrent threads.
     */
    record EmbeddingResult(float[] vector, String modelId, int dim) {}

    /**
     * Generates a 768-dimensional normalized embedding vector for the given text.
     *
     * @param text input text to embed
     * @return 768-dimensional float array with unit L2 norm
     */
    float[] generateEmbedding(String text);

    /**
     * Generates atomic EmbeddingResult with vector, canonical model ID, and dimension.
     */
    default EmbeddingResult generateEmbeddingResult(String text) {
        float[] vector = generateEmbedding(text);
        float[] normalized = normalizeL2(vector);
        return new EmbeddingResult(normalized, getEmbeddingModelId(), normalized != null ? normalized.length : 0);
    }

    /**
     * Normalizes an embedding vector to unit L2 norm.
     */
    static float[] normalizeL2(float[] vector) {
        if (vector == null || vector.length == 0) return vector;
        double sumSq = 0.0;
        for (float v : vector) {
            sumSq += v * v;
        }
        if (sumSq == 0.0) return vector;
        float norm = (float) Math.sqrt(sumSq);
        float[] normalized = new float[vector.length];
        for (int i = 0; i < vector.length; i++) {
            normalized[i] = vector[i] / norm;
        }
        return normalized;
    }

    /**
     * Computes cosine similarity between two float vectors.
     */
    static double cosineSimilarity(float[] v1, float[] v2) {
        if (v1 == null || v2 == null || v1.length != v2.length || v1.length == 0) {
            return 0.0;
        }
        double dot = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
            normA += v1[i] * v1[i];
            normB += v2[i] * v2[i];
        }
        if (normA == 0.0 || normB == 0.0) return 0.0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Returns the canonical identifier of the embedding model that produced the vector space
     * (e.g., "gemini-embedding-001", "bkai_pho_bert_ft_v1", or "deterministic-mock-v1").
     * Used to isolate pgvector cosine comparisons strictly within the same vector space.
     *
     * @return embedding model identifier
     */
    default String getEmbeddingModelId() {
        return "bkai_pho_bert_ft_v1";
    }

    /**
     * Converts a float array embedding into the pgvector string representation "[v1, v2, ...]".
     *
     * @param vector embedding array
     * @return pgvector compatible string format
     */
    default String toPgVectorString(float[] vector) {
        if (vector == null || vector.length == 0) {
            return "[]";
        }
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vector.length; i++) {
            sb.append(vector[i]);
            if (i < vector.length - 1) {
                sb.append(", ");
            }
        }
        sb.append("]");
        return sb.toString();
    }

    /**
     * Generates text response using Chat completion model.
     *
     * @param systemPrompt guardrails and context instructions
     * @param userPrompt   user query or question
     * @return generated answer with strict factual citations
     */
    String generateChatResponse(String systemPrompt, String userPrompt);

    /**
     * Performs multimodal vision OCR on administrative declaration form image.
     *
     * @param imageBytes raw image bytes
     * @param mimeType   image mime type (e.g., image/png, image/jpeg)
     * @return structured JSON string of extracted fields
     */
    String performVisionOcr(byte[] imageBytes, String mimeType);
}

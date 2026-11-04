package vn.edu.uth.smartward.ai;

/**
 * Common abstraction for AI model operations across the SmartWard AI platform.
 * Decouples domain logic from specific LLM providers (Gemini vs Offline Deterministic Mock).
 */
public interface AiModelClient {

    /**
     * Generates a 768-dimensional normalized embedding vector for the given text.
     *
     * @param text input text to embed
     * @return 768-dimensional float array with unit L2 norm
     */
    float[] generateEmbedding(String text);

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

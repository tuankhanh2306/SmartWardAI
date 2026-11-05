package vn.edu.uth.smartward.ml;

import ai.djl.huggingface.tokenizers.Encoding;
import ai.djl.huggingface.tokenizers.HuggingFaceTokenizer;
import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtSession;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

public class JavaTokenizerCheck {

    public static void main(String[] args) {
        System.out.println("===========================================================================");
        System.out.println("STEP C1: JAVA DJL TOKENIZER & ONNX RUNTIME VERIFICATION");
        System.out.println("===========================================================================");

        try {
            Path tokenizerPath = Paths.get("ml/models/tokenizer/tokenizer.json");
            Path onnxPath = Paths.get("ml/models/biencoder_base.onnx");
            File testSuiteFile = new File("ml/java-check/test_suite_105.json");

            if (!tokenizerPath.toFile().exists()) {
                System.err.println("Error: tokenizer.json not found at " + tokenizerPath.toAbsolutePath());
                System.exit(1);
            }
            if (!onnxPath.toFile().exists()) {
                System.err.println("Error: ONNX model not found at " + onnxPath.toAbsolutePath());
                System.exit(1);
            }

            System.out.println("1. Loading DJL HuggingFaceTokenizer from: " + tokenizerPath);
            HuggingFaceTokenizer tokenizer = HuggingFaceTokenizer.newInstance(tokenizerPath);
            System.out.println("   -> DJL Tokenizer loaded successfully!");

            System.out.println("2. Loading ONNX Runtime Environment & Session from: " + onnxPath);
            OrtEnvironment env = OrtEnvironment.getEnvironment();
            OrtSession.SessionOptions opts = new OrtSession.SessionOptions();
            OrtSession session = env.createSession(onnxPath.toString(), opts);
            System.out.println("   -> ONNX Runtime session initialized successfully!");

            System.out.println("3. Reading test cases from: " + testSuiteFile.getPath());
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(testSuiteFile);

            int totalTests = root.size();
            int matchedTokenIds = 0;
            int mismatchedTokenIds = 0;
            List<Double> cosineSimilarities = new ArrayList<>();
            List<Double> mses = new ArrayList<>();

            for (JsonNode item : root) {
                int id = item.get("id").asInt();
                String text = item.get("text").asText();
                JsonNode pyTokensNode = item.get("token_ids");
                JsonNode pyEmbNode = item.get("embedding");

                // 1. Tokenize in Java DJL
                Encoding encoding = tokenizer.encode(text);
                long[] javaIds = encoding.getIds();
                long[] javaAttention = encoding.getAttentionMask();

                // Compare Token IDs
                boolean tokensMatch = true;
                if (javaIds.length != pyTokensNode.size()) {
                    tokensMatch = false;
                } else {
                    for (int i = 0; i < javaIds.length; i++) {
                        if (javaIds[i] != pyTokensNode.get(i).asLong()) {
                            tokensMatch = false;
                            break;
                        }
                    }
                }

                if (tokensMatch) {
                    matchedTokenIds++;
                } else {
                    mismatchedTokenIds++;
                    if (mismatchedTokenIds <= 3) {
                        System.out.println("   [Mismatch at ID " + id + "] Text: " + text);
                        System.out.println("     Java IDs (" + javaIds.length + "): " + Arrays.toString(javaIds));
                        System.out.println("     Py   IDs (" + pyTokensNode.size() + "): " + pyTokensNode);
                    }
                }

                // 2. Run ONNX Inference in Java
                long[][] batchInputIds = new long[1][javaIds.length];
                long[][] batchAttentionMask = new long[1][javaAttention.length];
                System.arraycopy(javaIds, 0, batchInputIds[0], 0, javaIds.length);
                System.arraycopy(javaAttention, 0, batchAttentionMask[0], 0, javaAttention.length);

                OnnxTensor tensorInputIds = OnnxTensor.createTensor(env, batchInputIds);
                OnnxTensor tensorAttentionMask = OnnxTensor.createTensor(env, batchAttentionMask);

                Map<String, OnnxTensor> inputs = new HashMap<>();
                inputs.put("input_ids", tensorInputIds);
                inputs.put("attention_mask", tensorAttentionMask);

                try (OrtSession.Result result = session.run(inputs)) {
                    float[][] embResult = (float[][]) result.get(0).getValue();
                    float[] javaEmb = embResult[0];

                    // Normalize Java Embedding
                    double norm = 0.0;
                    for (float v : javaEmb) {
                        norm += v * v;
                    }
                    norm = Math.sqrt(norm);
                    for (int i = 0; i < javaEmb.length; i++) {
                        javaEmb[i] = (float) (javaEmb[i] / (norm > 0 ? norm : 1.0));
                    }

                    // Compare with Python Embedding
                    double dot = 0.0;
                    double mse = 0.0;
                    int dim = javaEmb.length;
                    for (int i = 0; i < dim; i++) {
                        double pyVal = pyEmbNode.get(i).asDouble();
                        double diff = javaEmb[i] - pyVal;
                        dot += javaEmb[i] * pyVal;
                        mse += diff * diff;
                    }
                    mse = mse / dim;
                    cosineSimilarities.add(dot);
                    mses.add(mse);
                }
            }

            double avgCos = cosineSimilarities.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            double avgMse = mses.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);

            System.out.println("\n--- VERIFICATION RESULTS ---");
            System.out.println("  Total sentences tested: " + totalTests);
            System.out.println("  Exact Token ID Matches: " + matchedTokenIds + " / " + totalTests + " (" + String.format(Locale.US, "%.2f%%", (double) matchedTokenIds / totalTests * 100) + ")");
            System.out.println("  Token ID Mismatches:    " + mismatchedTokenIds);
            System.out.println("  Avg Cosine Similarity:  " + String.format(Locale.US, "%.8f", avgCos) + " (Target >= 0.9999)");
            System.out.println("  Avg Mean Squared Error: " + String.format(Locale.US, "%.2e", avgMse) + " (Target <= 1e-5)");

            boolean pass = (mismatchedTokenIds == 0 && avgCos >= 0.9999);
            System.out.println("  OVERALL VERIFICATION STATUS: " + (pass ? "PASSED (ĐẠT HOÀN TOÀN)" : "FAILED (LỆCH - CẦN ĐIỀU CHỈNH)"));

            // Save JSON report
            Map<String, Object> rep = new HashMap<>();
            rep.put("total_sentences_tested", totalTests);
            rep.put("exact_token_id_matches", matchedTokenIds);
            rep.put("mismatched_token_ids", mismatchedTokenIds);
            rep.put("avg_cosine_similarity", avgCos);
            rep.put("avg_mse", avgMse);
            rep.put("status_passed", pass);

            mapper.writerWithDefaultPrettyPrinter().writeValue(new File("ml/runs/java_cross_runtime_check_report.json"), rep);
            System.out.println("Saved Java check report to ml/runs/java_cross_runtime_check_report.json");

            if (!pass) {
                System.exit(1);
            }
        } catch (Exception e) {
            e.printStackTrace();
            System.exit(1);
        }
    }
}

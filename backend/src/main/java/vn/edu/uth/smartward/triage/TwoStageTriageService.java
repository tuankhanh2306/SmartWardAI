package vn.edu.uth.smartward.triage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.triage.dto.CivicReportRequest;
import vn.edu.uth.smartward.triage.dto.CivicReportResponse;
import vn.edu.uth.smartward.triage.dto.IssueClusterDto;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Two-Stage Spatial-Semantic Incident Triage Engine.
 * Phase 1: Spatial Candidate Discovery via Redis GEO (Radius R meters)
 * Phase 2: Category Match & Cosine Semantic Similarity (Threshold tau)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TwoStageTriageService {

    private final SpatialIndexService spatialIndexService;
    private final IssueClusterRepository clusterRepository;
    private final CivicReportRepository reportRepository;
    private final AiModelClient aiModelClient;

    @Value("${smartward.triage.default-radius-meters:75.0}")
    private double defaultRadiusMeters;

    @Value("${smartward.triage.default-similarity-threshold:0.82}")
    private double defaultSimilarityThreshold;

    @Value("${smartward.triage.active-window-hours:72}")
    private int activeWindowHours;

    /**
     * Triages an incoming citizen report into an existing cluster or spawns a new one.
     */
    @Transactional
    public CivicReportResponse processReport(CivicReportRequest request) {
        log.info("Processing civic report in category '{}' at [{}, {}]",
                request.getCategory(), request.getLatitude(), request.getLongitude());

        String reportCode = generateReportCode();
        double lon = request.getLongitude().doubleValue();
        double lat = request.getLatitude().doubleValue();

        // 1. Compute Semantic Vector for the report description
        float[] reportEmbedding = aiModelClient.generateEmbedding(request.getDescription());
        String reportVectorStr = aiModelClient.toPgVectorString(reportEmbedding);

        // 2. PHASE 1: Spatial Filter (Redis GEO search within R meters)
        List<SpatialCandidate> spatialCandidates = spatialIndexService.findNearbyClusters(lon, lat, defaultRadiusMeters);
        log.debug("Phase 1 Spatial Filter found {} candidates within {}m", spatialCandidates.size(), defaultRadiusMeters);

        // 3. PHASE 2: Category Match & Semantic Similarity Filter (tau)
        IssueCluster bestCluster = null;
        double bestSimilarity = -1.0;
        double bestDistance = 0.0;

        OffsetDateTime cutoffTime = OffsetDateTime.now().minusHours(activeWindowHours);

        for (SpatialCandidate candidate : spatialCandidates) {
            Optional<IssueCluster> clusterOpt = clusterRepository.findByClusterCode(candidate.clusterCode());
            if (clusterOpt.isEmpty()) continue;

            IssueCluster cluster = clusterOpt.get();

            // Must be active and within recent time window
            if (!"OPEN".equalsIgnoreCase(cluster.getStatus()) && !"IN_PROGRESS".equalsIgnoreCase(cluster.getStatus())) {
                continue;
            }
            if (cluster.getLastReportedAt() != null && cluster.getLastReportedAt().isBefore(cutoffTime)) {
                continue;
            }

            // CRITICAL BUSINESS RULE: Must match the exact incident category
            // (e.g. Prevents merging Road Damage with Flooding at the same intersection)
            if (!cluster.getCategory().equalsIgnoreCase(request.getCategory())) {
                log.debug("Discarding cluster {} due to category mismatch ({} vs {})",
                        cluster.getClusterCode(), cluster.getCategory(), request.getCategory());
                continue;
            }

            // Compute Cosine Similarity between report and cluster centroid
            float[] centroidVec = parseVector(cluster.getCenterEmbedding());
            double sim = computeCosineSimilarity(reportEmbedding, centroidVec);

            log.debug("Cluster {} at {}m has Cosine Sim: {}", cluster.getClusterCode(), candidate.distanceMeters(), sim);

            if (sim > bestSimilarity) {
                bestSimilarity = sim;
                bestCluster = cluster;
                bestDistance = candidate.distanceMeters();
            }
        }

        // 4. CLUSTERING DECISION (Sim >= tau -> MERGE; else CREATE NEW)
        if (bestCluster != null && bestSimilarity >= defaultSimilarityThreshold) {
            // MERGE INTO EXISTING CLUSTER
            int oldCount = bestCluster.getReportCount() != null ? bestCluster.getReportCount() : 1;
            int newCount = oldCount + 1;

            // Incremental centroid update
            BigDecimal newLat = bestCluster.getCenterLatitude()
                    .multiply(BigDecimal.valueOf(oldCount))
                    .add(request.getLatitude())
                    .divide(BigDecimal.valueOf(newCount), 7, RoundingMode.HALF_UP);

            BigDecimal newLon = bestCluster.getCenterLongitude()
                    .multiply(BigDecimal.valueOf(oldCount))
                    .add(request.getLongitude())
                    .divide(BigDecimal.valueOf(newCount), 7, RoundingMode.HALF_UP);

            // Update running average embedding
            float[] oldVec = parseVector(bestCluster.getCenterEmbedding());
            float[] newCentroidVec = updateRunningAverageVector(oldVec, reportEmbedding, oldCount, newCount);

            bestCluster.setCenterLatitude(newLat);
            bestCluster.setCenterLongitude(newLon);
            bestCluster.setCenterEmbedding(aiModelClient.toPgVectorString(newCentroidVec));
            bestCluster.setReportCount(newCount);
            bestCluster.setLastReportedAt(OffsetDateTime.now());

            clusterRepository.save(bestCluster);

            // Update Redis GEO spatial index with new centroid
            spatialIndexService.addClusterLocation(bestCluster.getClusterCode(), newLon.doubleValue(), newLat.doubleValue());

            // Save CivicReport
            CivicReport report = CivicReport.builder()
                    .reportCode(reportCode)
                    .cluster(bestCluster)
                    .category(request.getCategory())
                    .description(request.getDescription())
                    .latitude(request.getLatitude())
                    .longitude(request.getLongitude())
                    .imageUrl(request.getImageUrl())
                    .status("SUBMITTED")
                    .build();

            reportRepository.save(report);

            log.info("Report {} merged into existing cluster {} (Count: {} -> {}, Sim: {})",
                    reportCode, bestCluster.getClusterCode(), oldCount, newCount, bestSimilarity);

            return CivicReportResponse.builder()
                    .reportCode(reportCode)
                    .clusterCode(bestCluster.getClusterCode())
                    .newCluster(false)
                    .category(request.getCategory())
                    .clusterReportCount(newCount)
                    .distanceToCenterMeters(bestDistance)
                    .similarityScore(bestSimilarity)
                    .message(String.format("Phản ánh đã được tự động gộp vào cụm sự cố hiện có (%s). Cán bộ phường đã ghi nhận %d lượt phản ánh tại khu vực này.",
                            bestCluster.getClusterCode(), newCount))
                    .build();

        } else {
            // CREATE NEW CLUSTER
            String clusterCode = generateClusterCode();
            String title = request.getDescription().length() > 100
                    ? request.getDescription().substring(0, 97) + "..."
                    : request.getDescription();

            IssueCluster newCluster = IssueCluster.builder()
                    .clusterCode(clusterCode)
                    .category(request.getCategory())
                    .title(title)
                    .centerLatitude(request.getLatitude())
                    .centerLongitude(request.getLongitude())
                    .centerEmbedding(reportVectorStr)
                    .reportCount(1)
                    .status("OPEN")
                    .firstReportedAt(OffsetDateTime.now())
                    .lastReportedAt(OffsetDateTime.now())
                    .build();

            IssueCluster savedCluster = clusterRepository.save(newCluster);

            // Add to Redis GEO index
            spatialIndexService.addClusterLocation(clusterCode, lon, lat);

            // Save CivicReport
            CivicReport report = CivicReport.builder()
                    .reportCode(reportCode)
                    .cluster(savedCluster)
                    .category(request.getCategory())
                    .description(request.getDescription())
                    .latitude(request.getLatitude())
                    .longitude(request.getLongitude())
                    .imageUrl(request.getImageUrl())
                    .status("SUBMITTED")
                    .build();

            reportRepository.save(report);

            log.info("Created new cluster {} for report {}", clusterCode, reportCode);

            return CivicReportResponse.builder()
                    .reportCode(reportCode)
                    .clusterCode(clusterCode)
                    .newCluster(true)
                    .category(request.getCategory())
                    .clusterReportCount(1)
                    .distanceToCenterMeters(0.0)
                    .similarityScore(1.0)
                    .message(String.format("Đã khởi tạo cụm sự cố mới (%s). Hệ thống đang phân luồng tới đơn vị phụ trách lĩnh vực %s.",
                            clusterCode, request.getCategory()))
                    .build();
        }
    }

    /**
     * Lists active incident clusters for officer map view and dashboard.
     */
    public List<IssueClusterDto> getActiveClusters(String status, String category) {
        String effectiveStatus = (status != null && !status.isBlank()) ? status : "OPEN";
        List<IssueCluster> clusters;

        if (category != null && !category.isBlank()) {
            clusters = clusterRepository.findByCategoryAndStatus(category, effectiveStatus);
        } else {
            clusters = clusterRepository.findByStatus(effectiveStatus);
        }

        return clusters.stream().map(c -> IssueClusterDto.builder()
                .id(c.getId())
                .clusterCode(c.getClusterCode())
                .category(c.getCategory())
                .title(c.getTitle())
                .centerLatitude(c.getCenterLatitude())
                .centerLongitude(c.getCenterLongitude())
                .reportCount(c.getReportCount())
                .status(c.getStatus())
                .firstReportedAt(c.getFirstReportedAt())
                .lastReportedAt(c.getLastReportedAt())
                .build()
        ).toList();
    }

    /**
     * Automatically warms up and synchronizes Redis GEO spatial index from PostgreSQL
     * upon application startup (or manual trigger) to ensure fault tolerance after Redis restarts.
     *
     * @return number of active clusters indexed into Redis GEO
     */
    @EventListener(ApplicationReadyEvent.class)
    public int warmUpSpatialIndexFromDatabase() {
        try {
            int window = activeWindowHours > 0 ? activeWindowHours : 72;
            OffsetDateTime cutoffTime = OffsetDateTime.now().minusHours(window);

            List<IssueCluster> activeClusters = new ArrayList<>();
            List<IssueCluster> openClusters = clusterRepository.findByStatus("OPEN");
            if (openClusters != null) activeClusters.addAll(openClusters);

            List<IssueCluster> inProgressClusters = clusterRepository.findByStatus("IN_PROGRESS");
            if (inProgressClusters != null) activeClusters.addAll(inProgressClusters);

            int indexedCount = 0;
            for (IssueCluster cluster : activeClusters) {
                if (cluster.getCenterLatitude() == null || cluster.getCenterLongitude() == null) {
                    continue;
                }
                if (cluster.getLastReportedAt() != null && cluster.getLastReportedAt().isBefore(cutoffTime)) {
                    continue;
                }
                spatialIndexService.addClusterLocation(
                        cluster.getClusterCode(),
                        cluster.getCenterLongitude().doubleValue(),
                        cluster.getCenterLatitude().doubleValue()
                );
                indexedCount++;
            }

            log.info("[REDIS_GEO_WARMUP] Synchronized {} active clusters from PostgreSQL into Redis GEO index.", indexedCount);
            return indexedCount;
        } catch (Exception e) {
            log.warn("[REDIS_GEO_WARMUP] Failed to warm up Redis GEO index from database: {}", e.getMessage());
            return 0;
        }
    }

    private double computeCosineSimilarity(float[] v1, float[] v2) {
        if (v1 == null || v2 == null) return 0.0;
        int len = Math.min(v1.length, v2.length);
        if (len == 0) return 0.0;
        double dot = 0.0;
        for (int i = 0; i < len; i++) {
            dot += v1[i] * v2[i];
        }
        return dot;
    }

    private float[] updateRunningAverageVector(float[] oldVec, float[] newVec, int oldCount, int newCount) {
        if (newVec == null) return oldVec;
        float[] avg = new float[newVec.length];
        double sumSq = 0.0;
        for (int i = 0; i < newVec.length; i++) {
            float oldVal = (oldVec != null && i < oldVec.length) ? oldVec[i] : 0.0f;
            avg[i] = (oldVal * oldCount + newVec[i]) / newCount;
            sumSq += avg[i] * avg[i];
        }
        float norm = (float) Math.sqrt(sumSq);
        if (norm > 0) {
            for (int i = 0; i < newVec.length; i++) {
                avg[i] /= norm;
            }
        }
        return avg;
    }

    private float[] parseVector(String vectorStr) {
        if (vectorStr == null || vectorStr.isBlank()) return new float[768];
        String clean = vectorStr.trim();
        if (clean.startsWith("[")) clean = clean.substring(1);
        if (clean.endsWith("]")) clean = clean.substring(0, clean.length() - 1);

        String[] parts = clean.split(",");
        float[] res = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            try {
                res[i] = Float.parseFloat(parts[i].trim());
            } catch (NumberFormatException e) {
                res[i] = 0.0f;
            }
        }
        return res;
    }

    private String generateReportCode() {
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String rand = UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return "RPT_" + ts + "_" + rand;
    }

    private String generateClusterCode() {
        String ts = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String rand = UUID.randomUUID().toString().substring(0, 5).toUpperCase();
        return "CLUST_" + ts + "_" + rand;
    }
}

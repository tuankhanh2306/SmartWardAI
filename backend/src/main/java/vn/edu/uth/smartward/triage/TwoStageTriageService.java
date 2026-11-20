package vn.edu.uth.smartward.triage;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.uth.smartward.ai.AiModelClient;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.geo.GeoValidationResult;
import vn.edu.uth.smartward.geo.GeoValidatorService;
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
public class TwoStageTriageService {

    private final SpatialIndexService spatialIndexService;
    private final IssueClusterRepository clusterRepository;
    private final CivicReportRepository reportRepository;
    private final AiModelClient aiModelClient;
    private final GeoValidatorService geoValidatorService;

    public TwoStageTriageService(SpatialIndexService spatialIndexService,
                                IssueClusterRepository clusterRepository,
                                CivicReportRepository reportRepository,
                                AiModelClient aiModelClient) {
        this(spatialIndexService, clusterRepository, reportRepository, aiModelClient, null);
    }

    @Autowired
    public TwoStageTriageService(SpatialIndexService spatialIndexService,
                                IssueClusterRepository clusterRepository,
                                CivicReportRepository reportRepository,
                                AiModelClient aiModelClient,
                                GeoValidatorService geoValidatorService) {
        this.spatialIndexService = spatialIndexService;
        this.clusterRepository = clusterRepository;
        this.reportRepository = reportRepository;
        this.aiModelClient = aiModelClient;
        this.geoValidatorService = geoValidatorService;
    }

    @Value("${smartward.triage.default-radius-meters:25.0}")
    private double defaultRadiusMeters;

    @Value("${smartward.triage.default-similarity-threshold:0.82}")
    private double defaultSimilarityThreshold;

    @Value("${smartward.triage.active-window-hours:72}")
    private int activeWindowHours;

    public static String normalizeCategory(String rawCategory) {
        if (rawCategory == null || rawCategory.isBlank()) {
            return "ROAD_DAMAGE";
        }
        String upper = rawCategory.trim().toUpperCase(Locale.ROOT);
        return switch (upper) {
            case "LIGHTING", "LIGHTING_ELECTRICAL", "ELECTRICAL" -> "LIGHTING_ELECTRICAL";
            case "SECURITY", "ORDER_SECURITY", "PUBLIC_ORDER" -> "ORDER_SECURITY";
            case "GARBAGE", "ENVIRONMENT", "SANITATION" -> "ENVIRONMENT";
            case "FLOOD", "FLOODING" -> "FLOODING";
            case "ROAD", "ROAD_DAMAGE", "INFRASTRUCTURE" -> "ROAD_DAMAGE";
            default -> upper;
        };
    }

    public static IssueClusterDto sanitizeForPublic(IssueClusterDto dto) {
        if (dto == null) {
            return null;
        }
        BigDecimal roundedLat = dto.getCenterLatitude() != null
                ? dto.getCenterLatitude().setScale(3, RoundingMode.HALF_UP)
                : null;
        BigDecimal roundedLon = dto.getCenterLongitude() != null
                ? dto.getCenterLongitude().setScale(3, RoundingMode.HALF_UP)
                : null;
        return IssueClusterDto.builder()
                .id(dto.getId())
                .clusterCode(dto.getClusterCode())
                .category(dto.getCategory())
                .title(dto.getTitle())
                .centerLatitude(roundedLat)
                .centerLongitude(roundedLon)
                .reportCount(dto.getReportCount())
                .status(dto.getStatus())
                .addressText(null)
                .locationSource(null)
                .locationAccuracyM(null)
                .wardCode(dto.getWardCode())
                .firstReportedAt(dto.getFirstReportedAt())
                .lastReportedAt(dto.getLastReportedAt())
                .build();
    }

    /**
     * Triages an incoming citizen report into an existing cluster or spawns a new one.
     */
    @Transactional
    public CivicReportResponse processReport(CivicReportRequest request) {
        double lon = request.getLongitude().doubleValue();
        double lat = request.getLatitude().doubleValue();
        String normalizedCategory = normalizeCategory(request.getCategory());

        // Privacy protection: log coarse/masked location only (BƯỚC 4)
        log.info("Processing civic report in category '{}' for ward '{}' near coarse [{}, {}]",
                normalizedCategory, request.getWardCode(),
                String.format(java.util.Locale.US, "%.3f", lat),
                String.format(java.util.Locale.US, "%.3f", lon));

        // BƯỚC 2 & BƯỚC 4: Strict Territorial & Geographic Boundary Validation
        if ("WARD_DEFAULT".equalsIgnoreCase(request.getLocationSource())) {
            log.warn("Civic report rejected because location has not been confirmed by user (WARD_DEFAULT)");
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    "Vị trí sự cố chưa được xác nhận. Vui lòng bấm lấy GPS hoặc kéo ghim trên bản đồ trước khi gửi phản ánh.");
        }

        if (geoValidatorService != null) {
            GeoValidationResult geoResult = geoValidatorService.validateWardPoint(lat, lon, request.getWardCode());
            if (!geoResult.valid()) {
                log.warn("Civic report rejected due to geo validation error {}: {}", geoResult.errorCode(), geoResult.message());
                throw new BusinessException(ErrorCode.INVALID_REQUEST, geoResult.message());
            }
        }

        String reportCode = generateReportCode();

        // 1. Compute Semantic Vector for the report description
        float[] reportEmbedding = aiModelClient.generateEmbedding(request.getDescription());
        String reportVectorStr = aiModelClient.toPgVectorString(reportEmbedding);
        String activeModelId = aiModelClient.getEmbeddingModelId() != null
                ? aiModelClient.getEmbeddingModelId()
                : "bkai_pho_bert_ft_v1";

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

            // CRITICAL BUSINESS RULE: Must match the normalized incident category
            // (e.g. Unifies LIGHTING <-> LIGHTING_ELECTRICAL while preventing merging Road Damage with Flooding)
            if (!normalizeCategory(cluster.getCategory()).equalsIgnoreCase(normalizedCategory)) {
                log.debug("Discarding cluster {} due to category mismatch ({} vs {})",
                        cluster.getClusterCode(), cluster.getCategory(), normalizedCategory);
                continue;
            }

            // VECTOR SPACE ISOLATION: Never compare vectors generated by different embedding models
            float[] centroidVec;
            String clusterModelId = cluster.getEmbeddingModel();
            if (clusterModelId != null && !clusterModelId.equalsIgnoreCase(activeModelId)) {
                log.info("Cluster {} embedding model '{}' differs from active model '{}'. Re-projecting cluster centroid into active vector space.",
                        cluster.getClusterCode(), clusterModelId, activeModelId);
                centroidVec = aiModelClient.generateEmbedding(cluster.getTitle());
                cluster.setCenterEmbedding(aiModelClient.toPgVectorString(centroidVec));
                cluster.setEmbeddingModel(activeModelId);
            } else {
                centroidVec = parseVector(cluster.getCenterEmbedding());
            }

            // Compute Cosine Similarity between report and cluster centroid in the same vector space
            double sim = computeCosineSimilarity(reportEmbedding, centroidVec);

            log.debug("Cluster {} at {}m has Cosine Sim: {}", cluster.getClusterCode(), candidate.distanceMeters(), sim);

            if (sim > bestSimilarity) {
                bestSimilarity = sim;
                bestCluster = cluster;
                bestDistance = candidate.distanceMeters();
            }
        }

        // 4. CLUSTERING DECISION (Sim >= tau -> MERGE; else CREATE NEW)
        // Anti-drift guard (6.4): check distance to cluster anchor <= 2R
        if (bestCluster != null && bestDistance > (defaultRadiusMeters * 2.0)) {
            log.warn("Cluster {} anchor drift prevented: distance {}m exceeds max drift threshold {}m. Spawning new cluster.",
                    bestCluster.getClusterCode(), bestDistance, (defaultRadiusMeters * 2.0));
            bestCluster = null;
        }

        String normalizedSource = (request.getLocationSource() != null && !request.getLocationSource().isBlank())
                ? request.getLocationSource().trim().toUpperCase(Locale.ROOT)
                : null;
        String cleanWardCode = (request.getWardCode() != null && !request.getWardCode().isBlank())
                ? request.getWardCode().trim()
                : null;

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

            bestCluster.setCategory(normalizedCategory);
            if (cleanWardCode != null) {
                bestCluster.setWardCode(cleanWardCode);
            }
            bestCluster.setCenterLatitude(newLat);
            bestCluster.setCenterLongitude(newLon);
            bestCluster.setCenterEmbedding(aiModelClient.toPgVectorString(newCentroidVec));
            bestCluster.setReportCount(newCount);
            bestCluster.setLastReportedAt(OffsetDateTime.now());

            clusterRepository.save(bestCluster);

            // Update Redis GEO spatial index with new centroid
            spatialIndexService.addClusterLocation(bestCluster.getClusterCode(), newLon.doubleValue(), newLat.doubleValue());

            CivicReport report = CivicReport.builder()
                    .reportCode(reportCode)
                    .cluster(bestCluster)
                    .category(normalizedCategory)
                    .description(request.getDescription())
                    .latitude(request.getLatitude())
                    .longitude(request.getLongitude())
                    .imageUrl(request.getImageUrl())
                    .addressText(request.getAddressText())
                    .locationAccuracyM(request.getLocationAccuracyM())
                    .locationSource(normalizedSource)
                    .status("SUBMITTED")
                    .build();

            reportRepository.save(report);

            log.info("Report {} merged into existing cluster {} (Count: {} -> {}, Sim: {})",
                    reportCode, bestCluster.getClusterCode(), oldCount, newCount, bestSimilarity);

            return CivicReportResponse.builder()
                    .reportCode(reportCode)
                    .clusterCode(bestCluster.getClusterCode())
                    .newCluster(false)
                    .category(normalizedCategory)
                    .clusterReportCount(newCount)
                    .distanceToCenterMeters(bestDistance)
                    .similarityScore(bestSimilarity)
                    .reporterPhone(request.getReporterPhone())
                    .addressText(request.getAddressText())
                    .targetWardName(request.getWardName())
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
                    .category(normalizedCategory)
                    .wardCode(cleanWardCode)
                    .title(title)
                    .centerLatitude(request.getLatitude())
                    .centerLongitude(request.getLongitude())
                    .centerEmbedding(reportVectorStr)
                    .embeddingModel(activeModelId)
                    .reportCount(1)
                    .status("OPEN")
                    .firstReportedAt(OffsetDateTime.now())
                    .lastReportedAt(OffsetDateTime.now())
                    .build();

            IssueCluster savedCluster = clusterRepository.save(newCluster);

            // Add to Redis GEO index
            spatialIndexService.addClusterLocation(clusterCode, lon, lat);

            CivicReport report = CivicReport.builder()
                    .reportCode(reportCode)
                    .cluster(savedCluster)
                    .category(normalizedCategory)
                    .description(request.getDescription())
                    .latitude(request.getLatitude())
                    .longitude(request.getLongitude())
                    .imageUrl(request.getImageUrl())
                    .addressText(request.getAddressText())
                    .locationAccuracyM(request.getLocationAccuracyM())
                    .locationSource(normalizedSource)
                    .status("SUBMITTED")
                    .build();

            reportRepository.save(report);

            log.info("Created new cluster {} for report {}", clusterCode, reportCode);

            return CivicReportResponse.builder()
                    .reportCode(reportCode)
                    .clusterCode(clusterCode)
                    .newCluster(true)
                    .category(normalizedCategory)
                    .clusterReportCount(1)
                    .distanceToCenterMeters(0.0)
                    .similarityScore(1.0)
                    .reporterPhone(request.getReporterPhone())
                    .addressText(request.getAddressText())
                    .targetWardName(request.getWardName())
                    .message(String.format("Đã khởi tạo cụm sự cố mới (%s). Hệ thống đang phân luồng tới đơn vị phụ trách lĩnh vực %s.",
                            clusterCode, normalizedCategory))
                    .build();
        }
    }

    /**
     * Lists active incident clusters for map view and dashboard.
     */
    @Transactional(readOnly = true)
    public List<IssueClusterDto> getActiveClusters(String status, String category) {
        String effectiveStatus = (status != null && !status.isBlank()) ? status : "OPEN";
        List<IssueCluster> byStatus = clusterRepository.findByStatus(effectiveStatus);
        List<IssueCluster> clusters;

        if (category != null && !category.isBlank()) {
            String targetCategory = normalizeCategory(category);
            if (byStatus != null && !byStatus.isEmpty()) {
                clusters = byStatus.stream()
                        .filter(c -> normalizeCategory(c.getCategory()).equalsIgnoreCase(targetCategory))
                        .toList();
            } else {
                List<IssueCluster> byCat = clusterRepository.findByCategoryAndStatus(targetCategory, effectiveStatus);
                clusters = byCat != null ? byCat : Collections.emptyList();
            }
        } else {
            clusters = byStatus != null ? byStatus : Collections.emptyList();
        }

        return clusters.stream().map(this::toClusterDto).toList();
    }

    @Transactional(readOnly = true)
    public List<IssueClusterDto> getPublicActiveClusters(String status, String category) {
        return getActiveClusters(status, category).stream()
                .map(TwoStageTriageService::sanitizeForPublic)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<IssueClusterDto> getOfficerClusters(String status, String category, String officerWardCode) {
        List<IssueClusterDto> all = getActiveClusters(status, category);
        if (officerWardCode == null || officerWardCode.isBlank() || "AG_PROVINCE".equalsIgnoreCase(officerWardCode.trim())) {
            return all;
        }
        String cleanOfficerWard = officerWardCode.trim();
        return all.stream()
                .filter(dto -> belongsToWard(dto, cleanOfficerWard))
                .toList();
    }

    private boolean belongsToWard(IssueClusterDto dto, String officerWardCode) {
        if (dto.getWardCode() != null && !dto.getWardCode().isBlank()) {
            return dto.getWardCode().trim().equalsIgnoreCase(officerWardCode);
        }
        if (geoValidatorService != null && dto.getCenterLatitude() != null && dto.getCenterLongitude() != null) {
            return geoValidatorService.validateWardPoint(
                    dto.getCenterLatitude().doubleValue(),
                    dto.getCenterLongitude().doubleValue(),
                    officerWardCode
            ).valid();
        }
        return false;
    }

    private String resolveClusterWardCode(double lat, double lon) {
        if (geoValidatorService == null) {
            return null;
        }
        String bestWardCode = null;
        double minDist = Double.POSITIVE_INFINITY;
        for (GeoValidatorService.WardGeoDefinition def : geoValidatorService.getAllWards()) {
            GeoValidationResult check = geoValidatorService.validateWardPoint(lat, lon, def.getWardCode());
            if (check.valid()) {
                double dist = GeoValidatorService.calculateHaversineMeters(lat, lon, def.getLat(), def.getLng());
                if (dist < minDist) {
                    minDist = dist;
                    bestWardCode = def.getWardCode();
                }
            }
        }
        return bestWardCode;
    }

    private IssueClusterDto toClusterDto(IssueCluster c) {
        String addr = null;
        String locSource = null;
        Double acc = null;
        if (c.getReports() != null && !c.getReports().isEmpty()) {
            CivicReport latest = c.getReports().get(c.getReports().size() - 1);
            addr = latest.getAddressText();
            locSource = latest.getLocationSource();
            acc = latest.getLocationAccuracyM();
        }

        String resolvedWardCode = c.getWardCode();
        if ((resolvedWardCode == null || resolvedWardCode.isBlank())
                && geoValidatorService != null
                && c.getCenterLatitude() != null
                && c.getCenterLongitude() != null) {
            resolvedWardCode = resolveClusterWardCode(
                    c.getCenterLatitude().doubleValue(),
                    c.getCenterLongitude().doubleValue()
            );
        }

        return IssueClusterDto.builder()
                .id(c.getId())
                .clusterCode(c.getClusterCode())
                .category(normalizeCategory(c.getCategory()))
                .title(c.getTitle())
                .centerLatitude(c.getCenterLatitude())
                .centerLongitude(c.getCenterLongitude())
                .reportCount(c.getReportCount())
                .status(c.getStatus())
                .addressText(addr)
                .locationSource(locSource)
                .locationAccuracyM(acc)
                .wardCode(resolvedWardCode)
                .firstReportedAt(c.getFirstReportedAt())
                .lastReportedAt(c.getLastReportedAt())
                .build();
    }

    /**
     * Updates an incident cluster status (OPEN, IN_PROGRESS, RESOLVED, REJECTED).
     * If RESOLVED or REJECTED, the cluster is automatically expunged from the Redis GEO index.
     */
    @Transactional
    public IssueClusterDto updateClusterStatus(String clusterCode, String newStatus) {
        IssueCluster cluster = clusterRepository.findByClusterCode(clusterCode)
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy cụm sự cố: " + clusterCode));

        Set<String> validStatuses = Set.of("OPEN", "IN_PROGRESS", "RESOLVED", "REJECTED");
        String upperStatus = (newStatus != null && !newStatus.isBlank()) ? newStatus.trim().toUpperCase() : "RESOLVED";
        if (!validStatuses.contains(upperStatus)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    "Trạng thái cụm sự cố không hợp lệ. Phải là OPEN, IN_PROGRESS, RESOLVED hoặc REJECTED.");
        }

        cluster.setStatus(upperStatus);
        // Do NOT overwrite citizen lastReportedAt on administrative status change (6.4)
        IssueCluster saved = clusterRepository.save(cluster);
        if (saved == null) {
            saved = cluster;
        }

        if ("RESOLVED".equals(upperStatus) || "REJECTED".equals(upperStatus)) {
            spatialIndexService.removeClusterLocation(clusterCode);
            log.info("Cluster {} marked as {} and removed from Redis GEO index", clusterCode, upperStatus);
        } else {
            spatialIndexService.addClusterLocation(clusterCode, saved.getCenterLongitude().doubleValue(), saved.getCenterLatitude().doubleValue());
            log.info("Cluster {} updated to status {} in DB and Redis GEO", clusterCode, upperStatus);
        }

        return toClusterDto(saved);
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

package vn.edu.uth.smartward.ward;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.common.ErrorCode;
import vn.edu.uth.smartward.geo.GeoValidatorService;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

@Slf4j
@Service
public class WardRegistryService {

    static final String REDIS_WARDS_CACHE_KEY = "smartward:wards:catalog:v1";
    private static final Duration CACHE_TTL = Duration.ofMinutes(15);

    private final WardRegistryRepository wardRegistryRepository;
    private final GeoValidatorService geoValidatorService;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @Autowired
    public WardRegistryService(WardRegistryRepository wardRegistryRepository,
                               @Autowired(required = false) GeoValidatorService geoValidatorService,
                               ObjectMapper objectMapper,
                               @Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.wardRegistryRepository = wardRegistryRepository;
        this.geoValidatorService = geoValidatorService;
        this.objectMapper = objectMapper;
        this.redisTemplate = redisTemplate;
    }

    public WardListResponse listWards(String query, String type, boolean includeBoundary) {
        LoadedCatalog catalog = loadFullCatalog();
        String cleanQuery = query != null ? query.trim().toLowerCase(Locale.ROOT) : "";
        String cleanType = type != null ? type.trim() : "";

        List<WardDto> filtered = catalog.wards().stream()
                .filter(w -> !"AG_PROVINCE".equalsIgnoreCase(w.code()))
                .filter(w -> cleanType.isEmpty() || "ALL".equalsIgnoreCase(cleanType)
                        || (w.type() != null && w.type().equalsIgnoreCase(cleanType)))
                .filter(w -> cleanQuery.isEmpty() || matchesKeyword(w, cleanQuery))
                .map(w -> includeBoundary ? w : stripBoundary(w))
                .toList();

        return new WardListResponse(filtered.size(), catalog.source(), catalog.updatedAt(), filtered);
    }

    public WardDto getWardByCode(String wardCode) {
        if (wardCode == null || wardCode.isBlank()) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "Mã xã/phường không được để trống.");
        }
        String normalized = wardCode.trim();
        Optional<WardRegistry> entityOpt = wardRegistryRepository.findByWardCodeIgnoreCaseAndActiveTrue(normalized);
        if (entityOpt.isPresent()) {
            return mapEntityToDto(entityOpt.get());
        }
        if (geoValidatorService != null) {
            GeoValidatorService.WardGeoDefinition geo = geoValidatorService.getWardGeo(normalized);
            if (geo != null) {
                return mapGeoToDto(geo);
            }
        }
        throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy đơn vị hành chính mã '" + normalized + "'.");
    }

    public WardDto findNearestWard(double lat, double lon) {
        if (lat < GeoValidatorService.MIN_LAT || lat > GeoValidatorService.MAX_LAT
                || lon < GeoValidatorService.MIN_LNG || lon > GeoValidatorService.MAX_LNG) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    "Tọa độ nằm ngoài phạm vi địa bàn Tỉnh An Giang.");
        }
        List<WardDto> wards = loadFullCatalog().wards();
        if (wards.isEmpty()) {
            throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Danh mục xã/phường chưa sẵn sàng.");
        }

        // 1. Prioritize Point-in-Polygon match
        for (WardDto w : wards) {
            if (w.boundary() != null && w.boundary().size() >= 3 && isPointInPolygon(lon, lat, w.boundary())) {
                return w;
            }
        }

        // 2. Fallback to nearest centroid by Haversine distance
        return wards.stream()
                .min(Comparator.comparingDouble(w ->
                        GeoValidatorService.calculateHaversineMeters(lat, lon, w.lat(), w.lon())))
                .orElseThrow(() -> new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, "Không tìm thấy đơn vị phù hợp."));
    }

    public void evictCache() {
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(REDIS_WARDS_CACHE_KEY);
            } catch (Exception e) {
                log.debug("WardRegistryService: failed to evict Redis cache: {}", e.getMessage());
            }
        }
    }

    private LoadedCatalog loadFullCatalog() {
        // 1. Try Redis cache
        if (redisTemplate != null) {
            try {
                String cachedJson = redisTemplate.opsForValue().get(REDIS_WARDS_CACHE_KEY);
                if (cachedJson != null && !cachedJson.isBlank()) {
                    List<WardDto> cached = objectMapper.readValue(cachedJson, new TypeReference<>() {});
                    if (!cached.isEmpty()) {
                        return new LoadedCatalog(cached, "REDIS_CACHE", Instant.now());
                    }
                }
            } catch (Exception e) {
                log.debug("WardRegistryService: Redis cache miss/error ({}), reading PostgreSQL.", e.getMessage());
            }
        }

        // 2. Read PostgreSQL ward_registry
        List<WardRegistry> dbRows = wardRegistryRepository.findByActiveTrueOrderByNameAsc();
        if (!dbRows.isEmpty()) {
            List<WardDto> dtos = dbRows.stream().map(this::mapEntityToDto).toList();
            Instant latestUpdate = dbRows.stream()
                    .map(WardRegistry::getUpdatedAt)
                    .filter(t -> t != null)
                    .max(Instant::compareTo)
                    .orElseGet(Instant::now);
            cacheCatalog(dtos);
            return new LoadedCatalog(dtos, "POSTGRES", latestUpdate);
        }

        // 3. Degraded fallback: in-memory GeoValidatorService
        if (geoValidatorService != null && !geoValidatorService.getAllWards().isEmpty()) {
            List<WardDto> dtos = geoValidatorService.getAllWards().stream()
                    .map(this::mapGeoToDto)
                    .sorted(Comparator.comparing(WardDto::name))
                    .toList();
            return new LoadedCatalog(dtos, "GEOJSON_FALLBACK", Instant.now());
        }

        return new LoadedCatalog(List.of(), "EMPTY", Instant.now());
    }

    private void cacheCatalog(List<WardDto> dtos) {
        if (redisTemplate == null || dtos.isEmpty()) return;
        try {
            String json = objectMapper.writeValueAsString(dtos);
            redisTemplate.opsForValue().set(REDIS_WARDS_CACHE_KEY, json, CACHE_TTL);
        } catch (Exception e) {
            log.debug("WardRegistryService: skipping Redis cache write: {}", e.getMessage());
        }
    }

    private WardDto mapEntityToDto(WardRegistry entity) {
        List<String> services = parseServices(entity.getOnlineServicesJson());
        List<List<Double>> boundary = parseBoundary(entity.getBoundaryJson());
        return new WardDto(
                entity.getWardCode(),
                entity.getName(),
                entity.getWardType(),
                entity.getArea(),
                entity.getProvince(),
                entity.getOfficeAddress(),
                entity.getPhoneNumber(),
                entity.getLat(),
                entity.getLon(),
                entity.getWorkingHours(),
                services,
                boundary,
                entity.getCoordSource(),
                entity.getAccuracyNote()
        );
    }

    private WardDto mapGeoToDto(GeoValidatorService.WardGeoDefinition geo) {
        List<List<Double>> boundary = null;
        if (geo.getPolygon() != null && geo.getPolygon().getCoordinates() != null) {
            boundary = java.util.Arrays.stream(geo.getPolygon().getCoordinates())
                    .map(c -> List.of(c.x, c.y))
                    .toList();
        }
        return new WardDto(
                geo.getWardCode(),
                geo.getName(),
                geo.getType(),
                null,
                "Tỉnh An Giang",
                geo.getOfficeAddress(),
                "(0296) 3855 100",
                geo.getLat(),
                geo.getLng(),
                "Sáng: 07:00 – 11:00 | Chiều: 13:00 – 17:00 (Thứ 2 – Thứ 6)",
                List.of("Đăng ký khai sinh", "Đăng ký kết hôn", "Mẫu CT01 Cư trú", "Chứng thực bản sao"),
                boundary,
                geo.getCoordSource(),
                null
        );
    }

    private WardDto stripBoundary(WardDto w) {
        return new WardDto(
                w.code(), w.name(), w.type(), w.area(), w.province(),
                w.officeAddress(), w.phoneNumber(), w.lat(), w.lon(),
                w.workingHours(), w.onlineServices(), null, w.coordSource(), w.accuracyNote()
        );
    }

    private List<String> parseServices(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private List<List<Double>> parseBoundary(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return null;
        }
    }

    private boolean matchesKeyword(WardDto w, String kw) {
        String normKw = stripAccents(kw);
        return (w.name() != null && stripAccents(w.name()).contains(normKw))
                || (w.code() != null && stripAccents(w.code()).contains(normKw))
                || (w.area() != null && stripAccents(w.area()).contains(normKw))
                || (w.officeAddress() != null && stripAccents(w.officeAddress()).contains(normKw));
    }

    private static String stripAccents(String input) {
        if (input == null) return "";
        String decomposed = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD);
        return decomposed
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'd')
                .toLowerCase(Locale.ROOT);
    }

    private boolean isPointInPolygon(double x, double y, List<List<Double>> ring) {
        boolean inside = false;
        int n = ring.size();
        for (int i = 0, j = n - 1; i < n; j = i++) {
            List<Double> pi = ring.get(i);
            List<Double> pj = ring.get(j);
            if (pi.size() < 2 || pj.size() < 2) continue;
            double xi = pi.get(0), yi = pi.get(1);
            double xj = pj.get(0), yj = pj.get(1);
            boolean intersect = ((yi > y) != (yj > y))
                    && (x < (xj - xi) * (y - yi) / ((yj - yi) == 0 ? 1e-12 : (yj - yi)) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    private record LoadedCatalog(List<WardDto> wards, String source, Instant updatedAt) {}
}

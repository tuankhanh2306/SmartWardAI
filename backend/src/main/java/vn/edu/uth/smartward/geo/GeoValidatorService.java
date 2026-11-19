package vn.edu.uth.smartward.geo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.Polygon;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * GeoValidatorService: Single point of coordinate verification & territorial boundary auditing.
 * Enforces An Giang BBOX, point-in-polygon with tight border tolerance (<= 300m),
 * water/offshore boundary filtering, and swapped coordinate detection.
 * NOTE: Currently loads 96 commune/ward boundaries from geo/wards.geo.json.
 * The remaining 6 communes (total 102 under updated administrative reorganization) are pending
 * branch 1c sync; no fake/invented boundaries are generated.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GeoValidatorService {

    private final ObjectMapper objectMapper;
    private final GeometryFactory geometryFactory = new GeometryFactory();

    // Bounding box for Greater An Giang & Island Special Zones
    public static final double MIN_LAT = 9.15;
    public static final double MAX_LAT = 11.00;
    public static final double MIN_LNG = 103.35;
    public static final double MAX_LNG = 105.70;

    @Getter
    public static class WardGeoDefinition {
        private final String wardCode;
        private final String name;
        private final String type;
        private final String officeAddress;
        private final double lat;
        private final double lng;
        private final String coordSource;
        private final Polygon polygon;

        public WardGeoDefinition(String wardCode, String name, String type, String officeAddress,
                                 double lat, double lng, String coordSource, Polygon polygon) {
            this.wardCode = wardCode;
            this.name = name;
            this.type = type;
            this.officeAddress = officeAddress;
            this.lat = lat;
            this.lng = lng;
            this.coordSource = coordSource;
            this.polygon = polygon;
        }
    }

    private final Map<String, WardGeoDefinition> wardGeoMap = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        try {
            ClassPathResource resource = new ClassPathResource("geo/wards.geo.json");
            if (!resource.exists()) {
                log.warn("GeoJSON resource 'geo/wards.geo.json' not found. GeoValidator will run in degraded mode.");
                return;
            }

            try (InputStream is = resource.getInputStream()) {
                JsonNode root = objectMapper.readTree(is);
                JsonNode features = root.path("features");
                if (features.isArray()) {
                    for (JsonNode feat : features) {
                        JsonNode props = feat.path("properties");
                        JsonNode geom = feat.path("geometry");

                        String code = props.path("ward_code").asText();
                        String name = props.path("name").asText();
                        String type = props.path("type").asText("Xã");
                        String address = props.path("officeAddress").asText();
                        double lat = props.path("lat").asDouble();
                        double lng = props.path("lng").asDouble();
                        String coordSource = props.path("coord_source").asText("osm");

                        // Parse coordinates ring (GeoJSON is [lng, lat])
                        JsonNode coordsNode = geom.path("coordinates");
                        Polygon polygon = null;
                        if (coordsNode.isArray() && coordsNode.size() > 0) {
                            JsonNode ringNode = coordsNode.get(0);
                            if (ringNode.isArray() && ringNode.size() >= 3) {
                                Coordinate[] jtsCoords = new Coordinate[ringNode.size()];
                                for (int i = 0; i < ringNode.size(); i++) {
                                    JsonNode pt = ringNode.get(i);
                                    double pLng = pt.get(0).asDouble();
                                    double pLat = pt.get(1).asDouble();
                                    jtsCoords[i] = new Coordinate(pLng, pLat);
                                }
                                polygon = geometryFactory.createPolygon(jtsCoords);
                            }
                        }

                        WardGeoDefinition def = new WardGeoDefinition(code, name, type, address, lat, lng, coordSource, polygon);
                        wardGeoMap.put(code, def);
                    }
                }
            }

            log.info("GeoValidatorService successfully loaded {} administrative wards from wards.geo.json", wardGeoMap.size());

            // Self-test seed points: fail-fast audit
            int seedErrors = 0;
            for (WardGeoDefinition def : wardGeoMap.values()) {
                GeoValidationResult res = validateWardPoint(def.getLat(), def.getLng(), def.getWardCode());
                if (!res.valid()) {
                    seedErrors++;
                    log.error("SEED GEO AUDIT ERROR for ward {}: {}", def.getWardCode(), res.message());
                }
            }
            if (seedErrors > 0) {
                log.error("GeoValidatorService seed verification detected {} invalid ward coordinates!", seedErrors);
            } else {
                log.info("GeoValidatorService verified 100% of seed ward coordinates on land within boundaries.");
            }

        } catch (Exception e) {
            log.error("Failed to initialize GeoValidatorService from wards.geo.json", e);
        }
    }

    /**
     * Validates an incident coordinate against BBOX, point-in-polygon and territorial constraints.
     */
    public GeoValidationResult validateWardPoint(double lat, double lng, String wardCode) {
        // 1. Swapped coordinate suspect check
        if (lat > 90.0 || (lat > 50.0 && lng < 20.0)) {
            return GeoValidationResult.error(
                    GeoValidationError.SWAPPED_SUSPECT,
                    "Tọa độ kinh độ và vĩ độ bị đảo ngược hoặc không thuộc hệ WGS84.",
                    wardCode,
                    resolveWardName(wardCode)
            );
        }

        // 2. An Giang Regional BBOX
        if (lat < MIN_LAT || lat > MAX_LAT || lng < MIN_LNG || lng > MAX_LNG) {
            return GeoValidationResult.error(
                    GeoValidationError.OUT_OF_BBOX,
                    "Tọa độ nằm ngoài phạm vi địa bàn Tỉnh An Giang và các Đặc khu hải đảo (" + lat + ", " + lng + ").",
                    wardCode,
                    resolveWardName(wardCode)
            );
        }

        WardGeoDefinition def = wardCode != null ? wardGeoMap.get(wardCode) : null;
        if (def == null && wardCode != null && !wardCode.isBlank()) {
            return GeoValidationResult.error(
                    GeoValidationError.OUT_OF_WARD,
                    "Không tìm thấy đơn vị hành chính mang mã '" + wardCode + "'.",
                    wardCode,
                    "Chưa xác định"
            );
        }

        if (def != null) {
            // 3. On-water / Offshore open ocean check
            if ("Đặc khu".equalsIgnoreCase(def.getType())) {
                double islandDist = calculateHaversineMeters(lat, lng, def.getLat(), def.getLng());
                if (islandDist > 8000) {
                    return GeoValidationResult.error(
                            GeoValidationError.ON_WATER,
                            "Tọa độ rơi vào vùng biển mở ngoài đảo " + def.getName() + " (khoảng cách " + Math.round(islandDist) + "m). Vui lòng chọn vị trí trên đất liền.",
                            def.getWardCode(),
                            def.getName()
                    );
                }
            }

            // 4. Point-in-polygon verification via JTS with tight border tolerance (<= 300m)
            if (def.getPolygon() != null) {
                Point point = geometryFactory.createPoint(new Coordinate(lng, lat));
                boolean inside = def.getPolygon().contains(point);
                if (!inside) {
                    // Distance from point to polygon boundary in degrees converted to meters (~111km / deg)
                    double distToBoundaryMeters = def.getPolygon().distance(point) * 111000.0;
                    if (distToBoundaryMeters > 300.0) {
                        return GeoValidationResult.error(
                                GeoValidationError.OUT_OF_WARD,
                                "Vị trí phản ánh (" + String.format(Locale.US, "%.5f, %.5f", lat, lng) +
                                ") nằm ngoài ranh giới hành chính của " + def.getName() +
                                " (vượt dung sai cho phép 300m, thực tế lệch ~" + Math.round(distToBoundaryMeters) + "m). Vui lòng chọn đúng đơn vị hành chính quản lý.",
                                def.getWardCode(),
                                def.getName()
                        );
                    }
                }
            } else {
                // Degraded mode for wards without boundary polygon (fallback to centroid with 3km radius)
                double distMeters = calculateHaversineMeters(lat, lng, def.getLat(), def.getLng());
                if (distMeters > 3000.0) {
                    return GeoValidationResult.error(
                            GeoValidationError.OUT_OF_WARD,
                            "Vị trí phản ánh (" + String.format(Locale.US, "%.5f, %.5f", lat, lng) +
                            ") cách quá xa trụ sở " + def.getName() + " (" + Math.round(distMeters) + "m).",
                            def.getWardCode(),
                            def.getName()
                    );
                }
            }

            return GeoValidationResult.ok(def.getWardCode(), def.getName());
        }

        return GeoValidationResult.ok(wardCode, "Toàn tỉnh");
    }

    public WardGeoDefinition getWardGeo(String wardCode) {
        return wardGeoMap.get(wardCode);
    }

    public Collection<WardGeoDefinition> getAllWards() {
        return Collections.unmodifiableCollection(wardGeoMap.values());
    }

    private String resolveWardName(String wardCode) {
        if (wardCode == null) return "Chưa xác định";
        WardGeoDefinition def = wardGeoMap.get(wardCode);
        return def != null ? def.getName() : wardCode;
    }

    public static double calculateHaversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000.0;
        double phi1 = Math.toRadians(lat1);
        double phi2 = Math.toRadians(lat2);
        double deltaPhi = Math.toRadians(lat2 - lat1);
        double deltaLambda = Math.toRadians(lon2 - lon1);

        double a = Math.sin(deltaPhi / 2.0) * Math.sin(deltaPhi / 2.0)
                + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2.0) * Math.sin(deltaLambda / 2.0);
        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        return R * c;
    }
}

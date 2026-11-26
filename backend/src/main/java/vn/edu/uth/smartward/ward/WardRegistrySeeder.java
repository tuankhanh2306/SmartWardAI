package vn.edu.uth.smartward.ward;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Seeds or updates ward_registry table from single source of truth geo/wards.geo.json.
 * Automatically reflects any future expansion (e.g., 96 -> 102 units in TASK-009) and
 * evicts the Redis ward catalog cache so live API responses refresh immediately.
 */
@Slf4j
@Component
@Order(20)
public class WardRegistrySeeder implements ApplicationRunner {

    private static final String DEFAULT_WORKING_HOURS =
            "Sáng: 07:00 – 11:00 | Chiều: 13:00 – 17:00 (Thứ 2 – Thứ 6)";
    private static final List<String> DEFAULT_ONLINE_SERVICES = List.of(
            "Đăng ký khai sinh",
            "Đăng ký kết hôn",
            "Mẫu CT01 Cư trú",
            "Chứng thực bản sao",
            "Bảo trợ xã hội"
    );

    private final WardRegistryRepository wardRegistryRepository;
    private final ObjectMapper objectMapper;
    private final StringRedisTemplate redisTemplate;

    @Autowired
    public WardRegistrySeeder(WardRegistryRepository wardRegistryRepository,
                              ObjectMapper objectMapper,
                              @Autowired(required = false) StringRedisTemplate redisTemplate) {
        this.wardRegistryRepository = wardRegistryRepository;
        this.objectMapper = objectMapper;
        this.redisTemplate = redisTemplate;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        syncFromGeoJson();
    }

    @Transactional
    public int syncFromGeoJson() {
        ClassPathResource resource = new ClassPathResource("geo/wards.geo.json");
        if (!resource.exists()) {
            log.warn("WardRegistrySeeder: classpath:geo/wards.geo.json not found, skipping DB sync.");
            return 0;
        }
        try (InputStream is = resource.getInputStream()) {
            JsonNode root = objectMapper.readTree(is);
            JsonNode features = root.path("features");
            if (!features.isArray() || features.isEmpty()) {
                return 0;
            }

            long existingCount = wardRegistryRepository.countByActiveTrue();
            if (existingCount == features.size()) {
                log.info("WardRegistrySeeder: ward_registry already synced ({} active units).", existingCount);
                return (int) existingCount;
            }

            String defaultServicesJson = objectMapper.writeValueAsString(DEFAULT_ONLINE_SERVICES);
            List<WardRegistry> batch = new ArrayList<>(features.size());
            Instant now = Instant.now();

            for (JsonNode feat : features) {
                JsonNode props = feat.path("properties");
                String code = props.path("ward_code").asText("").trim();
                if (code.isEmpty() || "AG_PROVINCE".equalsIgnoreCase(code)) {
                    continue;
                }

                String name = props.path("name").asText(code).trim();
                String type = props.path("type").asText("Xã").trim();
                String area = props.path("area").asText("").trim();
                String province = props.path("province").asText("Tỉnh An Giang").trim();
                String officeAddress = props.path("officeAddress").asText("UBND " + name + ", " + province).trim();
                String phoneNumber = props.path("phoneNumber").asText("(0296) 3855 100").trim();
                double lat = props.path("lat").asDouble();
                double lon = props.path("lng").asDouble();
                String workingHours = props.path("workingHours").asText(DEFAULT_WORKING_HOURS).trim();
                String coordSource = props.path("coord_source").asText("osm").trim();
                String accuracyNote = props.path("accuracy_note").asText("").trim();

                JsonNode coordsNode = feat.path("geometry").path("coordinates");
                String boundaryJson = null;
                if (coordsNode.isArray() && !coordsNode.isEmpty() && coordsNode.get(0).isArray()) {
                    boundaryJson = objectMapper.writeValueAsString(coordsNode.get(0));
                }

                batch.add(WardRegistry.builder()
                        .wardCode(code)
                        .name(name)
                        .wardType(type)
                        .area(area)
                        .province(province)
                        .officeAddress(officeAddress)
                        .phoneNumber(phoneNumber)
                        .lat(lat)
                        .lon(lon)
                        .workingHours(workingHours)
                        .onlineServicesJson(defaultServicesJson)
                        .boundaryJson(boundaryJson)
                        .coordSource(coordSource)
                        .accuracyNote(accuracyNote)
                        .active(true)
                        .updatedAt(now)
                        .build());
            }

            wardRegistryRepository.saveAll(batch);
            if (redisTemplate != null) {
                try {
                    redisTemplate.delete(WardRegistryService.REDIS_WARDS_CACHE_KEY);
                } catch (Exception ex) {
                    log.debug("WardRegistrySeeder: Redis cache eviction skipped ({})", ex.getMessage());
                }
            }
            log.info("WardRegistrySeeder: synchronized {} administrative units into ward_registry.", batch.size());
            return batch.size();
        } catch (Exception e) {
            log.error("WardRegistrySeeder failed to sync geo/wards.geo.json: {}", e.getMessage());
            return 0;
        }
    }
}

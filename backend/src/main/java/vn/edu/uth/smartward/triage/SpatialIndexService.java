package vn.edu.uth.smartward.triage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.geo.Distance;
import org.springframework.data.geo.GeoResult;
import org.springframework.data.geo.GeoResults;
import org.springframework.data.geo.Point;
import org.springframework.data.redis.connection.RedisGeoCommands;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.domain.geo.GeoReference;
import org.springframework.data.redis.domain.geo.Metrics;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Spatial Indexing Service powered by Redis GEO commands (GEOADD, GEOSEARCH).
 * Enables sub-millisecond Phase-1 spatial candidate retrieval within radius R meters.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SpatialIndexService {

    private final StringRedisTemplate stringRedisTemplate;
    public static final String GEO_KEY = "smartward:geo:clusters";

    /**
     * Adds or updates cluster coordinates in Redis GEO set.
     */
    public void addClusterLocation(String clusterCode, double longitude, double latitude) {
        try {
            stringRedisTemplate.opsForGeo().add(GEO_KEY, new Point(longitude, latitude), clusterCode);
            log.debug("Indexed cluster {} into Redis GEO (lon={}, lat={})", clusterCode, longitude, latitude);
        } catch (Exception e) {
            log.warn("Failed to index cluster {} in Redis GEO: {}", clusterCode, e.getMessage());
        }
    }

    /**
     * Performs Redis GEOSEARCH to discover active clusters within radius R meters.
     */
    public List<SpatialCandidate> findNearbyClusters(double longitude, double latitude, double radiusMeters) {
        List<SpatialCandidate> candidates = new ArrayList<>();
        try {
            GeoResults<RedisGeoCommands.GeoLocation<String>> results = stringRedisTemplate.opsForGeo().search(
                    GEO_KEY,
                    GeoReference.fromCoordinate(longitude, latitude),
                    new Distance(radiusMeters, Metrics.METERS),
                    RedisGeoCommands.GeoSearchCommandArgs.newGeoSearchArgs().includeDistance().sortAscending()
            );

            if (results != null) {
                for (GeoResult<RedisGeoCommands.GeoLocation<String>> res : results) {
                    String code = res.getContent().getName();
                    double dist = res.getDistance().getValue();
                    candidates.add(new SpatialCandidate(code, dist));
                }
            }
        } catch (Exception e) {
            log.warn("Redis GEO search failed, falling back to empty candidates: {}", e.getMessage());
        }
        return candidates;
    }

    /**
     * Removes a resolved cluster from the spatial index.
     */
    public void removeClusterLocation(String clusterCode) {
        try {
            stringRedisTemplate.opsForZSet().remove(GEO_KEY, clusterCode);
        } catch (Exception e) {
            log.warn("Failed to remove cluster {} from Redis GEO: {}", clusterCode, e.getMessage());
        }
    }
}

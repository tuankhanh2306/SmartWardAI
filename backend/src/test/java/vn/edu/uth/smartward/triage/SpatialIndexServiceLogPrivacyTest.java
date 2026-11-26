package vn.edu.uth.smartward.triage;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.GeoOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * TASK-018 / BUG-015 Regression Test:
 * Ensures SpatialIndexService rounds logged GPS coordinates to 3 decimal places (~110m coarseness)
 * and never prints raw citizen pinpoint coordinates even at DEBUG level.
 */
class SpatialIndexServiceLogPrivacyTest {

    @Test
    @DisplayName("TASK-018 / BUG-015: SpatialIndexService masks raw GPS coordinates to %.3f in DEBUG logs")
    void addClusterLocation_roundsCoordinatesToThreeDecimalsInLogs() {
        StringRedisTemplate redisTemplate = Mockito.mock(StringRedisTemplate.class);
        @SuppressWarnings("unchecked")
        GeoOperations<String, String> geoOps = Mockito.mock(GeoOperations.class);
        when(redisTemplate.opsForGeo()).thenReturn(geoOps);

        Logger logger = (Logger) LoggerFactory.getLogger(SpatialIndexService.class);
        Level originalLevel = logger.getLevel();
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        logger.setLevel(Level.DEBUG);

        try {
            SpatialIndexService service = new SpatialIndexService(redisTemplate);
            service.addClusterLocation("CLUST-PRIV-001", 105.4357891, 10.3864129);

            assertThat(appender.list).isNotEmpty();
            String logged = appender.list.get(0).getFormattedMessage();
            assertThat(logged).contains("105.436").contains("10.386");
            assertThat(logged).doesNotContain("105.4357891").doesNotContain("10.3864129");
        } finally {
            logger.detachAppender(appender);
            logger.setLevel(originalLevel);
        }
    }
}

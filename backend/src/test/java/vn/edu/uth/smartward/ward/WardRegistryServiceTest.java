package vn.edu.uth.smartward.ward;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import vn.edu.uth.smartward.common.BusinessException;
import vn.edu.uth.smartward.geo.GeoValidatorService;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class WardRegistryServiceTest {

    private WardRegistryRepository repository;
    private GeoValidatorService geoValidatorService;
    private ObjectMapper objectMapper;
    private WardRegistryService service;

    @BeforeEach
    void setUp() {
        repository = mock(WardRegistryRepository.class);
        objectMapper = new ObjectMapper();
        geoValidatorService = new GeoValidatorService(objectMapper);
        geoValidatorService.init();
        service = new WardRegistryService(repository, geoValidatorService, objectMapper, null);
    }

    @Test
    void listWards_returnsDatabaseRowsAndFiltersByTypeAndQuery() {
        WardRegistry lx = WardRegistry.builder()
                .wardCode("AG_P_LONGXUYEN")
                .name("Phường Long Xuyên")
                .wardType("Phường")
                .area("TP. Long Xuyên")
                .province("Tỉnh An Giang")
                .officeAddress("Số 01 Trần Hưng Đạo, Long Xuyên")
                .phoneNumber("(0296) 3855 100")
                .lat(10.3863)
                .lon(105.4352)
                .boundaryJson("[[105.42,10.37],[105.45,10.37],[105.45,10.40],[105.42,10.40],[105.42,10.37]]")
                .onlineServicesJson("[\"Đăng ký khai sinh\"]")
                .active(true)
                .updatedAt(Instant.now())
                .build();

        WardRegistry pq = WardRegistry.builder()
                .wardCode("AG_DK_PHUQUOC")
                .name("Đặc khu Phú Quốc")
                .wardType("Đặc khu")
                .area("Hải đảo Phú Quốc")
                .province("Tỉnh An Giang")
                .officeAddress("Số 04 Đường 30/4, Phú Quốc")
                .lat(10.2175)
                .lon(103.9610)
                .active(true)
                .updatedAt(Instant.now())
                .build();

        when(repository.findByActiveTrueOrderByNameAsc()).thenReturn(List.of(lx, pq));

        WardListResponse all = service.listWards(null, null, true);
        assertEquals(2, all.totalCount());
        assertEquals("POSTGRES", all.source());
        assertNotNull(all.wards().get(0).boundary());

        WardListResponse filtered = service.listWards("long xuyen", "Phường", false);
        assertEquals(1, filtered.totalCount());
        assertEquals("AG_P_LONGXUYEN", filtered.wards().get(0).code());
        assertNull(filtered.wards().get(0).boundary());
    }

    @Test
    void listWards_fallsBackToGeoJsonWhenTableIsEmpty() {
        when(repository.findByActiveTrueOrderByNameAsc()).thenReturn(List.of());

        WardListResponse res = service.listWards(null, null, false);
        assertTrue(res.totalCount() >= 96);
        assertEquals("GEOJSON_FALLBACK", res.source());
    }

    @Test
    void getWardByCode_throwsNotFoundForUnknownCode() {
        when(repository.findByWardCodeIgnoreCaseAndActiveTrue("UNKNOWN_999")).thenReturn(Optional.empty());
        assertThrows(BusinessException.class, () -> service.getWardByCode("UNKNOWN_999"));
    }

    @Test
    void findNearestWard_prioritizesPointInPolygonOverCentroid() {
        when(repository.findByActiveTrueOrderByNameAsc()).thenReturn(List.of());
        // Rach Gia center / Binh An hospital regression coordinate (10.003544, 105.086358)
        WardDto nearest = service.findNearestWard(10.003544, 105.086358);
        assertEquals("AG_P_RACHGIA", nearest.code());
    }

    @Test
    void findNearestWard_rejectsCoordinatesOutsideAnGiang() {
        assertThrows(BusinessException.class, () -> service.findNearestWard(21.0285, 105.8542));
    }
}

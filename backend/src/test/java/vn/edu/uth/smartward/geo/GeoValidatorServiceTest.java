package vn.edu.uth.smartward.geo;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("GeoValidatorService: Coordinate Integrity & Boundary Unit Tests")
class GeoValidatorServiceTest {

    private GeoValidatorService geoValidatorService;

    @BeforeEach
    void setUp() {
        geoValidatorService = new GeoValidatorService(new ObjectMapper());
        geoValidatorService.init();
    }

    @Test
    @DisplayName("1. Valid ward headquarters coordinates must PASS validation")
    void testValidWardHeadquarters() {
        // Phường Long Xuyên
        GeoValidationResult r1 = geoValidatorService.validateWardPoint(10.383965, 105.426716, "AG_P_LONGXUYEN");
        assertTrue(r1.valid(), "Long Xuyên HQ must be valid");
        assertNull(r1.errorCode());

        // Đặc khu Phú Quốc
        GeoValidationResult r2 = geoValidatorService.validateWardPoint(10.217512, 103.960985, "AG_DK_PHUQUOC");
        assertTrue(r2.valid(), "Phú Quốc HQ must be valid on land");

        // Đặc khu Kiên Hải (Hòn Tre)
        GeoValidationResult r3 = geoValidatorService.validateWardPoint(9.967815, 104.841524, "AG_DK_KIENHAI");
        assertTrue(r3.valid(), "Kiên Hải Hòn Tre HQ must be valid on land");

        // Xã An Phú (Trung tâm QL91C)
        GeoValidationResult r4 = geoValidatorService.validateWardPoint(10.815686, 105.090647, "AG_X_ANPHU");
        assertTrue(r4.valid(), "An Phú HQ must be valid");
    }

    @Test
    @DisplayName("2. OUT_OF_BBOX: Points outside An Giang regional boundary must be rejected")
    void testOutOfBboxRejection() {
        // TP. Hồ Chí Minh
        GeoValidationResult r1 = geoValidatorService.validateWardPoint(10.8035, 106.7142, "AG_P_LONGXUYEN");
        assertFalse(r1.valid());
        assertEquals(GeoValidationError.OUT_OF_BBOX, r1.errorCode());

        // Hà Nội
        GeoValidationResult r2 = geoValidatorService.validateWardPoint(21.0285, 105.8542, "AG_P_LONGXUYEN");
        assertFalse(r2.valid());
        assertEquals(GeoValidationError.OUT_OF_BBOX, r2.errorCode());

        // Out in Pacific Ocean
        GeoValidationResult r3 = geoValidatorService.validateWardPoint(12.5000, 115.0000, "AG_P_LONGXUYEN");
        assertFalse(r3.valid());
        assertEquals(GeoValidationError.OUT_OF_BBOX, r3.errorCode());
    }

    @Test
    @DisplayName("3. SWAPPED_SUSPECT: Swapped latitude and longitude must be flagged")
    void testSwappedCoordinatesSuspect() {
        // Swapped: Lat 105.4345, Lng 10.3812
        GeoValidationResult r1 = geoValidatorService.validateWardPoint(105.4345, 10.3812, "AG_P_LONGXUYEN");
        assertFalse(r1.valid());
        assertEquals(GeoValidationError.SWAPPED_SUSPECT, r1.errorCode());
        assertTrue(r1.message().contains("đảo ngược"));
    }

    @Test
    @DisplayName("4. OUT_OF_WARD: Point far outside target ward polygon must be rejected")
    void testOutOfWardRejection() {
        // Châu Đốc coordinates sent with Long Xuyên ward code (~60km away)
        GeoValidationResult r = geoValidatorService.validateWardPoint(10.7025, 105.1180, "AG_P_LONGXUYEN");
        assertFalse(r.valid());
        assertEquals(GeoValidationError.OUT_OF_WARD, r.errorCode());
        assertTrue(r.message().contains("ngoài ranh giới"));
        assertTrue(r.message().contains("300m"));
    }

    @Test
    @DisplayName("5. ON_WATER: Far offshore open ocean point near island ward must be rejected")
    void testOnWaterOffshoreRejection() {
        // 25km south of Kiên Hải in the open ocean (Lat 9.75, Lon 104.84)
        GeoValidationResult r = geoValidatorService.validateWardPoint(9.7500, 104.8400, "AG_DK_KIENHAI");
        assertFalse(r.valid());
        assertEquals(GeoValidationError.ON_WATER, r.errorCode());
        assertTrue(r.message().contains("vùng biển"));
    }

    @Test
    @DisplayName("6. SEED DATA AUDIT: All 102 wards (NQ 1654/NQ-UBTVQH15) loaded from wards.geo.json must be 100% valid")
    void testAll102WardsSeedIntegrity() {
        assertEquals(102, geoValidatorService.getAllWards().size(), "Must contain exactly 102 wards (85 Xã, 14 Phường, 3 Đặc khu)");
        for (GeoValidatorService.WardGeoDefinition def : geoValidatorService.getAllWards()) {
            GeoValidationResult result = geoValidatorService.validateWardPoint(def.getLat(), def.getLng(), def.getWardCode());
            assertTrue(result.valid(), "Ward " + def.getWardCode() + " (" + def.getName() + ") must pass seed validation: " + result.message());
        }
        // Explicitly verify the 6 unchanged communes added in TASK-009
        for (String code : java.util.List.of(
                "AG_X_MYHOAHUNG", "AG_X_BINHGIANG", "AG_X_BINHSON",
                "AG_X_HONNGHE", "AG_X_SONHAI", "AG_X_TIENHAI")) {
            GeoValidatorService.WardGeoDefinition w = geoValidatorService.getWardGeo(code);
            assertNotNull(w, "Missing unchanged commune: " + code);
            assertTrue(geoValidatorService.validateWardPoint(w.getLat(), w.getLng(), code).valid(),
                    "Unchanged commune " + code + " centroid must be valid inside its polygon");
        }
    }

    @Test
    @DisplayName("7. BUG-019 & TASK-048: Binh An Hospital (Rach Gia) belongs to AG_P_RACHGIA, not AG_X_BINHAN, and 0 duplicate centroids")
    void testRachGiaAndBinhAnSeparationAndNoDuplicateCentroids() {
        // 10.003544, 105.086358 = Bệnh viện Bình An (Phường Rạch Giá)
        assertTrue(geoValidatorService.validateWardPoint(10.003544, 105.086358, "AG_P_RACHGIA").valid(),
                "Bệnh viện Bình An (Rạch Giá) must be valid inside AG_P_RACHGIA");
        assertFalse(geoValidatorService.validateWardPoint(10.003544, 105.086358, "AG_X_BINHAN").valid(),
                "Bệnh viện Bình An (Rạch Giá) must NOT fall inside AG_X_BINHAN");

        // Real Xã Bình An (Châu Thành) at 9.8746, 105.1328
        assertTrue(geoValidatorService.validateWardPoint(9.8746, 105.1328, "AG_X_BINHAN").valid(),
                "UBND Xã Bình An must be valid inside AG_X_BINHAN");
        assertFalse(geoValidatorService.validateWardPoint(9.8746, 105.1328, "AG_P_RACHGIA").valid(),
                "UBND Xã Bình An must NOT fall inside AG_P_RACHGIA");

        // Zero duplicate centroids across all 96 wards
        var all = new java.util.ArrayList<>(geoValidatorService.getAllWards());
        for (int i = 0; i < all.size(); i++) {
            for (int j = i + 1; j < all.size(); j++) {
                double dist = GeoValidatorService.calculateHaversineMeters(
                        all.get(i).getLat(), all.get(i).getLng(),
                        all.get(j).getLat(), all.get(j).getLng()
                );
                assertTrue(dist > 200.0,
                        "Duplicate/overlapping centroids detected: " + all.get(i).getWardCode() + " vs " + all.get(j).getWardCode() + " (" + Math.round(dist) + "m)");
            }
        }
    }
}

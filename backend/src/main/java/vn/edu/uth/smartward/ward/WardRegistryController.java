package vn.edu.uth.smartward.ward;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.uth.smartward.common.ApiResponse;

/**
 * TASK-024: Single Source of Truth API for An Giang Administrative Wards (Web & Mobile offline-sync).
 */
@RestController
@RequestMapping("/api/v1/wards")
@RequiredArgsConstructor
public class WardRegistryController {

    private final WardRegistryService wardRegistryService;

    @GetMapping
    public ResponseEntity<ApiResponse<WardListResponse>> listWards(
            @RequestParam(name = "q", required = false) String query,
            @RequestParam(name = "type", required = false) String type,
            @RequestParam(name = "includeBoundary", defaultValue = "true") boolean includeBoundary
    ) {
        WardListResponse response = wardRegistryService.listWards(query, type, includeBoundary);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/nearest")
    public ResponseEntity<ApiResponse<WardDto>> findNearestWard(
            @RequestParam("lat") double lat,
            @RequestParam("lon") double lon
    ) {
        WardDto ward = wardRegistryService.findNearestWard(lat, lon);
        return ResponseEntity.ok(ApiResponse.ok(ward));
    }

    @GetMapping("/{wardCode}")
    public ResponseEntity<ApiResponse<WardDto>> getWardByCode(@PathVariable("wardCode") String wardCode) {
        WardDto ward = wardRegistryService.getWardByCode(wardCode);
        return ResponseEntity.ok(ApiResponse.ok(ward));
    }
}

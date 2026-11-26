package vn.edu.uth.smartward.ward;

import java.time.Instant;
import java.util.List;

public record WardListResponse(
        int totalCount,
        String source,
        Instant updatedAt,
        List<WardDto> wards
) {}

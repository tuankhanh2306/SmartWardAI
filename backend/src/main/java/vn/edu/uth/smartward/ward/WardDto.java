package vn.edu.uth.smartward.ward;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record WardDto(
        String code,
        String name,
        String type,
        String area,
        String province,
        String officeAddress,
        String phoneNumber,
        double lat,
        double lon,
        String workingHours,
        List<String> onlineServices,
        List<List<Double>> boundary,
        String coordSource,
        String accuracyNote
) {}

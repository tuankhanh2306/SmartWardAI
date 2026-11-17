package vn.edu.uth.smartward.geo;

public record GeoValidationResult(
        boolean valid,
        GeoValidationError errorCode,
        String message,
        String wardCode,
        String wardName
) {
    public static GeoValidationResult ok(String wardCode, String wardName) {
        return new GeoValidationResult(true, null, "Tọa độ hợp lệ trong ranh giới hành chính.", wardCode, wardName);
    }

    public static GeoValidationResult error(GeoValidationError code, String message, String wardCode, String wardName) {
        return new GeoValidationResult(false, code, message, wardCode, wardName);
    }
}

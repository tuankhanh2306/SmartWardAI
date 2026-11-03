package vn.edu.uth.smartward.common;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    INTERNAL_SERVER_ERROR("SW_500", "Đã xảy ra lỗi hệ thống nội bộ.", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_REQUEST("SW_400", "Dữ liệu yêu cầu không hợp lệ.", HttpStatus.BAD_REQUEST),
    VALIDATION_FAILED("SW_422", "Dữ liệu không thỏa mãn các quy tắc kiểm định.", HttpStatus.UNPROCESSABLE_ENTITY),
    RESOURCE_NOT_FOUND("SW_404", "Không tìm thấy tài nguyên yêu cầu.", HttpStatus.NOT_FOUND),
    TOKEN_EXPIRED_OR_CONSUMED("SW_410", "Liên kết truy cập đã hết hạn hoặc đã được sử dụng một lần.", HttpStatus.GONE),
    RATE_LIMIT_EXCEEDED("SW_429", "Bạn đã vượt quá giới hạn 5 yêu cầu/phút. Vui lòng thử lại sau.", HttpStatus.TOO_MANY_REQUESTS),
    AI_SERVICE_UNAVAILABLE("SW_503", "Dịch vụ AI hiện không khả dụng. Vui lòng thử lại sau.", HttpStatus.SERVICE_UNAVAILABLE);

    private final String code;
    private final String defaultMessage;
    private final HttpStatus httpStatus;
}

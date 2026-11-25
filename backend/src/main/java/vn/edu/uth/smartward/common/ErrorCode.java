package vn.edu.uth.smartward.common;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {
    INTERNAL_SERVER_ERROR("SW_500", "Đã xảy ra lỗi hệ thống nội bộ.", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_REQUEST("SW_400", "Dữ liệu yêu cầu không hợp lệ.", HttpStatus.BAD_REQUEST),
    UNAUTHORIZED("SW_401", "Chưa xác thực hoặc phiên làm việc cán bộ không hợp lệ.", HttpStatus.UNAUTHORIZED),
    FORBIDDEN("SW_403", "Không đủ thẩm quyền thực hiện tác vụ công vụ này.", HttpStatus.FORBIDDEN),
    VALIDATION_FAILED("SW_422", "Dữ liệu không thỏa mãn các quy tắc kiểm định.", HttpStatus.UNPROCESSABLE_ENTITY),
    UNSUPPORTED_MEDIA_TYPE("SW_415", "Định dạng tệp không được hỗ trợ (chỉ chấp nhận ảnh JPEG, PNG hoặc WebP).", HttpStatus.UNSUPPORTED_MEDIA_TYPE),
    PAYLOAD_TOO_LARGE("SW_413", "Kích thước tệp vượt quá hạn mức tối đa cho phép (5 MB).", HttpStatus.PAYLOAD_TOO_LARGE),
    RESOURCE_NOT_FOUND("SW_404", "Không tìm thấy tài nguyên yêu cầu.", HttpStatus.NOT_FOUND),
    CONFLICT("SW_409", "Xung đột trạng thái hoặc phiên bản dữ liệu.", HttpStatus.CONFLICT),
    TOKEN_EXPIRED_OR_CONSUMED("SW_410", "Liên kết truy cập đã hết hạn hoặc đã được sử dụng một lần.", HttpStatus.GONE),
    RATE_LIMIT_EXCEEDED("SW_429", "Bạn đã vượt quá giới hạn 5 yêu cầu/phút. Vui lòng thử lại sau.", HttpStatus.TOO_MANY_REQUESTS),
    AI_SERVICE_UNAVAILABLE("SW_503", "Dịch vụ AI hiện không khả dụng. Vui lòng thử lại sau.", HttpStatus.SERVICE_UNAVAILABLE),
    STORAGE_UNAVAILABLE("SW_503_STORAGE", "Hệ thống lưu trữ bảo mật (Redis/MinIO) hiện không khả dụng.", HttpStatus.SERVICE_UNAVAILABLE);

    private final String code;
    private final String defaultMessage;
    private final HttpStatus httpStatus;
}

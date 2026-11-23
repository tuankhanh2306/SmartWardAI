package vn.edu.uth.smartward.common;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Unified REST Exception Handler extending ResponseEntityExceptionHandler (SEC-06).
 * Guarantees standard HTTP error codes:
 * - 400 / 422: Input validation and malformed request bodies
 * - 404: Non-existent resources
 * - 405: Method not allowed
 * - 409: Database constraint / concurrency conflicts
 * - 415: Unsupported media types
 * - 500: Server unexpected errors (masked, returns correlationId, no internal class leaks)
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusinessException(BusinessException ex) {
        log.warn("Business exception occurred: [{}] {}", ex.getErrorCode().getCode(), ex.getMessage());
        return ResponseEntity
                .status(ex.getErrorCode().getHttpStatus())
                .body(ApiResponse.error(ex.getMessage(), ex.getErrorCode().getCode()));
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError error : ex.getBindingResult().getFieldErrors()) {
            errors.put(error.getField(), error.getDefaultMessage());
        }
        ApiResponse<Map<String, String>> response = ApiResponse.<Map<String, String>>builder()
                .success(false)
                .message("Dữ liệu gửi lên không đúng định dạng hoặc thiếu trường bắt buộc.")
                .data(errors)
                .errorCode(ErrorCode.VALIDATION_FAILED.getCode())
                .timestamp(Instant.now())
                .build();
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(response);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        log.warn("Malformed JSON request payload: {}", ex.getMessage());
        ApiResponse<Void> response = ApiResponse.error(
                "Định dạng dữ liệu JSON gửi lên không hợp lệ.",
                ErrorCode.INVALID_REQUEST.getCode()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @Override
    protected ResponseEntity<Object> handleHttpRequestMethodNotSupported(
            HttpRequestMethodNotSupportedException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ApiResponse<Void> response = ApiResponse.error(
                "Phương thức HTTP '" + ex.getMethod() + "' không được hỗ trợ cho endpoint này.",
                "SW_405_METHOD_NOT_ALLOWED"
        );
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(response);
    }

    @Override
    protected ResponseEntity<Object> handleHttpMediaTypeNotSupported(
            HttpMediaTypeNotSupportedException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ApiResponse<Void> response = ApiResponse.error(
                "Định dạng Media Type '" + ex.getContentType() + "' không được hỗ trợ.",
                "SW_415_UNSUPPORTED_MEDIA_TYPE"
        );
        return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(response);
    }

    @Override
    protected ResponseEntity<Object> handleNoResourceFoundException(
            NoResourceFoundException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ApiResponse<Void> response = ApiResponse.error(
                "Tài nguyên không tồn tại: " + ex.getResourcePath(),
                "SW_404"
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @Override
    protected ResponseEntity<Object> handleMaxUploadSizeExceededException(
            MaxUploadSizeExceededException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        ApiResponse<Void> response = ApiResponse.error(
                ErrorCode.PAYLOAD_TOO_LARGE.getDefaultMessage(),
                ErrorCode.PAYLOAD_TOO_LARGE.getCode()
        );
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(response);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiResponse<Void>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        String correlationId = UUID.randomUUID().toString();
        log.error("Database constraint or unique key violation [correlationId={}]: {}", correlationId, ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(
                        "Dữ liệu gửi lên vi phạm ràng buộc toàn vẹn hoặc đã tồn tại trong hệ thống.",
                        "SW_409_CONFLICT",
                        correlationId
                ));
    }

    @ExceptionHandler(org.springframework.dao.OptimisticLockingFailureException.class)
    public ResponseEntity<ApiResponse<Void>> handleOptimisticLockingFailure(org.springframework.dao.OptimisticLockingFailureException ex) {
        String correlationId = UUID.randomUUID().toString();
        log.warn("Optimistic locking conflict detected [correlationId={}]: {}", correlationId, ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(ApiResponse.error(
                        "Dữ liệu đã được một cán bộ khác cập nhật đồng thời. Vui lòng tải lại trang và thử lại.",
                        "SW_409_CONFLICT",
                        correlationId
                ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        String correlationId = UUID.randomUUID().toString();
        log.error("Unhandled unexpected exception [correlationId={}]: ", correlationId, ex);

        // SEC-06: Zero internal class leaks or raw internal stack trace details in public response
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(
                        "Hệ thống gặp sự cố ngoài dự kiến. Mã tra cứu lỗi: " + correlationId,
                        ErrorCode.INTERNAL_SERVER_ERROR.getCode(),
                        correlationId
                ));
    }
}

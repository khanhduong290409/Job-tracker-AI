package com.jobtrackerai.shared.exception;

/**
 * Generic 400 Bad Request - input semantic không hợp lệ ở service layer.
 * Map → HTTP 400 trong GlobalExceptionHandler.
 *
 * Khác MethodArgumentNotValidException (Spring tự handle @Valid fail từ DTO):
 *   - MethodArgumentNotValidException = syntactic validation fail ở DTO level
 *   - BadRequestException = business rule fail ở service level
 *     (vd: "Cannot set 2 CV versions as default at the same time")
 *
 * Cho exceptions cụ thể hơn (vd: state transition), tạo subclass riêng trong module
 * tương ứng: InvalidStateTransitionException extends BadRequestException.
 */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }

    public BadRequestException(String message, Throwable cause) {
        super(message, cause);
    }
}

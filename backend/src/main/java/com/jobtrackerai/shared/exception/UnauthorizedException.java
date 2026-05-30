package com.jobtrackerai.shared.exception;

/**
 * Request không authenticate (missing/invalid/expired JWT).
 * Map → HTTP 401 trong GlobalExceptionHandler.
 *
 * Khác Forbidden (403): Unauthorized = chưa login, Forbidden = đã login nhưng không có quyền.
 */
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }

    public UnauthorizedException(String message, Throwable cause) {
        super(message, cause);
    }
}

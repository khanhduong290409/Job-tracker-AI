package com.jobtrackerai.shared.exception;

/**
 * User đã authenticate nhưng KHÔNG có quyền truy cập resource này.
 * Map → HTTP 403 trong GlobalExceptionHandler.
 *
 * Dùng cho ownership check Pattern 2 (load entity trước → check userId).
 * Vd: user A đã load CV của user B (qua query không filter userId), check ownership fail.
 */
public class ForbiddenException extends RuntimeException {

    public ForbiddenException(String message) {
        super(message);
    }

    public ForbiddenException(String message, Throwable cause) {
        super(message, cause);
    }
}

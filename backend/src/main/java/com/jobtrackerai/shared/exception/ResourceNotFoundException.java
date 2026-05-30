package com.jobtrackerai.shared.exception;

/**
 * Resource (entity) không tồn tại hoặc đã soft-deleted.
 * Map → HTTP 404 trong GlobalExceptionHandler.
 *
 * Cũng dùng cho ownership check (Pattern 1 trong 02-architecture.md): khi user A
 * query resource thuộc user B với findByIdAndUserId, trả Optional.empty → throw exception
 * này. Không reveal resource thực sự tồn tại.
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }

    public ResourceNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}

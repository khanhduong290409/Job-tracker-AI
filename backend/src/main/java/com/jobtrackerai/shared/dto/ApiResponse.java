package com.jobtrackerai.shared.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Wrapper chuẩn cho mọi API response.
 * Format match docs/03-api-contract.md (success path không có "error", error path không có "data").
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
        boolean success,
        T data,
        String message,
        ErrorInfo error
) {

    public static <T> ApiResponse<T> success(T data) {
        return new ApiResponse<>(true, data, null, null);
    }

    public static <T> ApiResponse<T> success(T data, String message) {
        return new ApiResponse<>(true, data, message, null);
    }

    public static <T> ApiResponse<T> error(String code, String message) {
        return new ApiResponse<>(false, null, null, new ErrorInfo(code, message, null));
    }

    public static <T> ApiResponse<T> validationError(String code, String message, List<FieldError> details) {
        return new ApiResponse<>(false, null, null, new ErrorInfo(code, message, details));
    }
}

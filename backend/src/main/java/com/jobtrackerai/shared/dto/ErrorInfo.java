package com.jobtrackerai.shared.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * Chi tiết lỗi trong ApiResponse khi success=false.
 * - code: error code chuẩn (xem docs/03-api-contract.md, vd: VALIDATION_ERROR, NOT_FOUND)
 * - message: human-readable message
 * - details: list field errors (chỉ có ở validation error, null cho lỗi khác)
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorInfo(
        String code,
        String message,
        List<FieldError> details
) {
}

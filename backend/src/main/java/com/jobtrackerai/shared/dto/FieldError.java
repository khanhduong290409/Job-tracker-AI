package com.jobtrackerai.shared.dto;

/**
 * 1 field validation error. Dùng cho response khi @Valid fail trên DTO.
 */
public record FieldError(
        String field,
        String message
) {
}

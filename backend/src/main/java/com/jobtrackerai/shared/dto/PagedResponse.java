package com.jobtrackerai.shared.dto;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Envelope phân trang dùng chung — bọc Spring Data {@link Page} thành shape khớp
 * docs/03-api-contract.md: { items: [...], pagination: {...} }.
 * Dùng cho mọi list endpoint có phân trang (applications, reminders, notifications...).
 */
public record PagedResponse<T>(
        List<T> items,
        PageInfo pagination
) {

    public record PageInfo(
            int page,
            int size,
            long totalElements,
            int totalPages,
            boolean hasNext,
            boolean hasPrevious
    ) {}

    public static <T> PagedResponse<T> of(Page<T> page) {
        PageInfo info = new PageInfo(
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.hasNext(),
                page.hasPrevious()
        );
        return new PagedResponse<>(page.getContent(), info);
    }
}

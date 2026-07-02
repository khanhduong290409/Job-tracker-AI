package com.jobtrackerai.cv.dto;

import java.time.Instant;

/**
 * Response chi tiết 1 CV — dùng cho GET /cv/{id} và PATCH /cv/{id}/parsed-data.
 *
 * Khác {@link CvVersionResponse} (dùng cho list) ở chỗ có thêm {@code parsedData}:
 * list trả nhiều CV nên giữ nhẹ (không kèm parsed data), chỉ trang chi tiết mới cần data đầy đủ để xem/sửa.
 * Cùng pattern list-item vs detail như Application ở Phase 3.
 */
public record CvDetailResponse(
        Long id,
        String label,
        String fileName,
        Long fileSize,
        String fileUrl,
        String parseStatus,
        String parseError,
        boolean defaultCv,
        CvParsedData parsedData,
        Instant createdAt,
        Instant updatedAt
) {}

package com.jobtrackerai.cv.dto;

import java.time.Instant;

public record CvVersionResponse(
        Long id,
        String label,
        String fileName,
        Long fileSize,
        String fileUrl,
        String parseStatus,
        String parseError,
        boolean defaultCv,
        Instant createdAt,
        Instant updatedAt
) {}

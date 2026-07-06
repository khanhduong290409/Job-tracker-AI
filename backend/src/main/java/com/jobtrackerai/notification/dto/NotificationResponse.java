package com.jobtrackerai.notification.dto;

import java.time.Instant;

/**
 * Response cho notification in-app. type để String (FE dùng chọn icon/nhãn).
 * linkUrl để FE điều hướng khi click. metadata không expose (nội bộ).
 */
public record NotificationResponse(
        Long id,
        String type,
        String title,
        String message,
        String linkUrl,
        boolean read,
        Instant createdAt
) {}

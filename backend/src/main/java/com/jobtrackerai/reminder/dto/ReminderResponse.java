package com.jobtrackerai.reminder.dto;

import java.time.Instant;

/**
 * Response cho reminder. reminderType để String (khớp pattern TimelineEventResponse) —
 * FE chỉ hiển thị nhãn, không cần enum chặt.
 * sentAt null = chưa bắn; dismissed = user đã tắt.
 */
public record ReminderResponse(
        Long id,
        Long applicationId,
        String reminderType,
        String title,
        String description,
        Instant scheduledAt,
        Instant sentAt,
        boolean dismissed,
        Instant createdAt
) {}

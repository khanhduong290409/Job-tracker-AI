package com.jobtrackerai.reminder.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

/**
 * Request tạo reminder CUSTOM (user tự đặt). reminderType không có trong body —
 * service luôn gán CUSTOM (2 loại auto do scheduled job sinh, không qua API này).
 *
 * applicationId optional: reminder có thể gắn 1 application hoặc đứng độc lập.
 */
public record CreateReminderRequest(
        Long applicationId,
        @NotBlank @Size(max = 255) String title,
        @Size(max = 2000) String description,
        @NotNull @Future Instant scheduledAt
) {}

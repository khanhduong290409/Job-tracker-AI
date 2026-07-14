package com.jobtrackerai.user.dto;

import com.jobtrackerai.user.entity.NotificationPreferences;
import jakarta.validation.constraints.NotNull;

/**
 * Body cho PUT /users/me/notification-preferences. Full-replace: gửi cả 2 kênh.
 *
 * Dùng Boolean (wrapper) + @NotNull thay boolean (primitive): nếu client bỏ sót
 * field, ta muốn báo lỗi 400 rõ ràng thay vì âm thầm hiểu là false (tắt nhầm kênh).
 */
public record NotificationPreferencesRequest(
        @NotNull(message = "inApp is required")
        Boolean inApp,

        @NotNull(message = "email is required")
        Boolean email
) {
    public NotificationPreferences toPreferences() {
        return new NotificationPreferences(inApp, email);
    }
}

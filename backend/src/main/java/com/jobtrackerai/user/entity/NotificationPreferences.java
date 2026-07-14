package com.jobtrackerai.user.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Tùy chọn kênh nhận thông báo của user, map với cột JSONB
 * users.notification_preferences: { "inApp": bool, "email": bool }.
 *
 * @JsonIgnoreProperties(ignoreUnknown = true): nếu về sau JSON có thêm key mới
 * (vd "push") mà record chưa khai báo → Jackson bỏ qua, không vỡ khi đọc user cũ.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record NotificationPreferences(
        boolean inApp,
        boolean email
) {
    /** Mặc định: bật cả 2 kênh — khớp DEFAULT của cột trong migration V8. */
    public static NotificationPreferences defaults() {
        return new NotificationPreferences(true, true);
    }
}

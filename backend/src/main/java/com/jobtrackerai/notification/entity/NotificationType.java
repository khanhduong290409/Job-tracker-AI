package com.jobtrackerai.notification.entity;

/**
 * Loại notification in-app. Phase 5 mọi notification đều sinh từ reminder tới hạn
 * → chỉ 1 giá trị REMINDER. Enum (thay vì String thô) để type-safe + làm chỗ mở rộng:
 * Phase sau thêm nguồn khác (EMAIL_RECEIVED, STATUS_CHANGED...) chỉ cần thêm value.
 */
public enum NotificationType {
    REMINDER
}

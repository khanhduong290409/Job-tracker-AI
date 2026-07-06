package com.jobtrackerai.reminder.entity;

/**
 * Loại reminder. Khớp CHECK constraint chk_reminder_type trong V7.
 *
 * Phase 5 dùng 3 loại:
 *   - CUSTOM               : user tự tạo tay
 *   - FOLLOW_UP_AFTER_APPLY: auto — 7 ngày sau apply mà status vẫn APPLIED
 *   - STATUS_STALE         : auto — 14 ngày không đổi status (chưa terminal)
 *
 * 2 loại khai sẵn nhưng CHƯA dùng (defer — cần luồng nhập ngày giờ interview/deadline):
 *   - INTERVIEW_REMINDER
 *   - TAKE_HOME_DEADLINE
 */
public enum ReminderType {
    FOLLOW_UP_AFTER_APPLY,
    INTERVIEW_REMINDER,
    TAKE_HOME_DEADLINE,
    STATUS_STALE,
    CUSTOM
}

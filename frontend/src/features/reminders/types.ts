/**
 * Type mirror cho reminder — khớp `ReminderResponse.java` / `CreateReminderRequest.java`.
 *
 * `reminderType` để `string` (backend trả tên enum thô, FE chỉ hiển thị nhãn).
 */
export interface Reminder {
  id: number;
  // null khi reminder đứng độc lập (không gắn application).
  applicationId: number | null;
  reminderType: string;
  title: string;
  description: string | null;
  scheduledAt: string;
  // null = chưa tới hạn / dispatcher chưa bắn.
  sentAt: string | null;
  dismissed: boolean;
  createdAt: string;
}

// Body tạo reminder CUSTOM. reminderType không gửi — backend luôn gán CUSTOM.
export interface CreateReminderRequest {
  applicationId?: number | null;
  title: string;
  description?: string | null;
  // ISO-8601 Instant, phải ở tương lai (backend @Future).
  scheduledAt: string;
}

export interface ReminderListParams {
  // Có → chỉ reminder của app đó (dùng ở ApplicationDetailPage).
  applicationId?: number;
}

// Nhãn tiếng Việt cho từng loại. 3 loại Phase 5 + fallback cho giá trị lạ (getReminderTypeLabel).
export const REMINDER_TYPE_LABELS: Record<string, string> = {
  CUSTOM: 'Tự đặt',
  FOLLOW_UP_AFTER_APPLY: 'Theo dõi sau khi nộp',
  STATUS_STALE: 'Đơn lâu không cập nhật',
  INTERVIEW_REMINDER: 'Nhắc phỏng vấn',
  TAKE_HOME_DEADLINE: 'Hạn nộp bài test',
};

export function getReminderTypeLabel(type: string): string {
  return REMINDER_TYPE_LABELS[type] ?? type;
}

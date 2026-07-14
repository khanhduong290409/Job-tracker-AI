/**
 * Mirror DTO của user module backend, phục vụ trang Settings.
 * - UserProfile ← UserProfileResponse (GET /users/me)
 * - NotificationPreferences ← record cùng tên (JSONB users.notification_preferences)
 */

export interface NotificationPreferences {
  inApp: boolean;
  email: boolean;
}

export interface UserProfile {
  id: number;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  gmailConnected: boolean;
  notificationPreferences: NotificationPreferences;
  createdAt: string;
}

// Body PUT /users/me/notification-preferences — full-replace, gửi cả 2 kênh.
// Cùng shape NotificationPreferences (backend @NotNull cả inApp lẫn email).
export type NotificationPreferencesRequest = NotificationPreferences;

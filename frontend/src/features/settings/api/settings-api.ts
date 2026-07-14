import { api } from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api';
import type { NotificationPreferencesRequest, UserProfile } from '../types';

const BASE = '/users/me';

/** Gọi endpoint hồ sơ user + tùy chọn thông báo (xem docs/03-api-contract.md). */
export const settingsApi = {
  // GET /users/me — hồ sơ đầy đủ (kèm notificationPreferences).
  getProfile: async (): Promise<UserProfile> => {
    const res = await api.get<ApiResponse<UserProfile>>(BASE);
    return res.data.data!;
  },

  // PUT /users/me/notification-preferences — full-replace, trả về profile đã cập nhật.
  updateNotificationPreferences: async (
    body: NotificationPreferencesRequest,
  ): Promise<UserProfile> => {
    const res = await api.put<ApiResponse<UserProfile>>(
      `${BASE}/notification-preferences`,
      body,
    );
    return res.data.data!;
  },
};

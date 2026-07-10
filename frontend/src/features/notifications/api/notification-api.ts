import { api } from '@/lib/api/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type { Notification, NotificationListParams } from '../types';

const BASE = '/notifications';

export const notificationApi = {
  list: async (
    params: NotificationListParams = {},
  ): Promise<PaginatedResponse<Notification>> => {
    const res = await api.get<ApiResponse<PaginatedResponse<Notification>>>(BASE, {
      params,
    });
    return res.data.data!;
  },

  // Chỉ lấy con số cho badge chuông → endpoint nhẹ, FE poll định kỳ.
  unreadCount: async (): Promise<number> => {
    const res = await api.get<ApiResponse<number>>(`${BASE}/unread-count`);
    return res.data.data!;
  },

  markRead: async (id: number): Promise<Notification> => {
    const res = await api.put<ApiResponse<Notification>>(`${BASE}/${id}/read`);
    return res.data.data!;
  },

  // Trả về số notification vừa được đánh dấu đã đọc.
  markAllRead: async (): Promise<number> => {
    const res = await api.put<ApiResponse<number>>(`${BASE}/read-all`);
    return res.data.data!;
  },
};

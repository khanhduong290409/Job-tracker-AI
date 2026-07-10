import { api } from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api';
import type { CreateReminderRequest, Reminder, ReminderListParams } from '../types';

const BASE = '/reminders';

export const reminderApi = {
  // list trả mảng thuần (không phân trang) — reminder mỗi app ít.
  list: async (params: ReminderListParams = {}): Promise<Reminder[]> => {
    const res = await api.get<ApiResponse<Reminder[]>>(BASE, { params });
    return res.data.data!;
  },

  create: async (body: CreateReminderRequest): Promise<Reminder> => {
    const res = await api.post<ApiResponse<Reminder>>(BASE, body);
    return res.data.data!;
  },

  // Tắt reminder (dismissed=true) — không xóa, giữ lịch sử.
  dismiss: async (id: number): Promise<Reminder> => {
    const res = await api.put<ApiResponse<Reminder>>(`${BASE}/${id}/dismiss`);
    return res.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/${id}`);
  },
};

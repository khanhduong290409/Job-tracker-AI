import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reminderApi } from './reminder-api';
import type { CreateReminderRequest, ReminderListParams } from '../types';

// REMINDER_KEYS.all = ['reminders'] → invalidate prefix-match mọi list (toàn bộ + theo app).
// Export vì NotificationToaster cũng cần làm mới danh sách khi dispatcher vừa gửi nhắc nhở.
export const REMINDER_KEYS = {
  all: ['reminders'] as const,
  list: (params: ReminderListParams) => ['reminders', 'list', params] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useReminders(params: ReminderListParams = {}) {
  return useQuery({
    queryKey: REMINDER_KEYS.list(params),
    queryFn: () => reminderApi.list(params),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateReminderRequest) => reminderApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
    },
  });
}

export function useDismissReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reminderApi.dismiss(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
    },
  });
}

export function useDeleteReminder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reminderApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });
    },
  });
}

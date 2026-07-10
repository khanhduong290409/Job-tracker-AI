import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { notificationApi } from './notification-api';
import type { NotificationListParams } from '../types';

// Query key factory. NOTIFICATION_KEYS.all = ['notifications'] → invalidate prefix-match
// cả list lẫn unread-count trong 1 lần (xem onSuccess các mutation bên dưới).
const NOTIFICATION_KEYS = {
  all: ['notifications'] as const,
  list: (params: NotificationListParams) => ['notifications', 'list', params] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
};

// Nhịp poll badge chuông. Không WebSocket (D-006) → hỏi server định kỳ.
const UNREAD_POLL_MS = 30_000;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useNotifications(params: NotificationListParams = {}) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: () => notificationApi.list(params),
    // Giữ trang cũ trong lúc fetch trang/filter mới → dropdown không nháy về rỗng.
    placeholderData: keepPreviousData,
  });
}

// Badge số chưa đọc — poll 30s. Chạy nền toàn app (mount ở NotificationBell).
export function useUnreadCount() {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.unreadCount(),
    queryFn: notificationApi.unreadCount,
    refetchInterval: UNREAD_POLL_MS,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => notificationApi.markRead(id),
    // List (đổi cờ read) + unread-count (giảm 1) đều lệch → invalidate cả nhánh.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.all });
    },
  });
}

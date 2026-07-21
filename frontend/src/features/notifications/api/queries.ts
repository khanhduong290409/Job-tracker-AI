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
const UNREAD_POLL_MS = 30_000;// 30 giây

// Số thông báo chưa đọc lấy về cho toast. Backend sắp xếp mới nhất trước
// (OrderByCreatedAtDesc) → 5 phần tử đầu là 5 cái mới nhất. Nhiều hơn 5 thông báo
// mới trong 1 nhịp poll thì cái cũ hơn bị bỏ qua — chấp nhận, tránh spam toast.
const TOAST_FETCH_SIZE = 5;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useNotifications(params: NotificationListParams = {}) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: () => notificationApi.list(params),
    // Giữ trang cũ trong lúc fetch trang/filter mới → dropdown không nháy về rỗng.
    placeholderData: keepPreviousData,//tức là vẫn hiện data của trang cũ trong lúc đang chờ fetch data trang mới chưa xem
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

// Vài thông báo chưa đọc mới nhất — nguồn NỘI DUNG cho toast trượt ra
// (badge chỉ có con số, không đủ để hiện title/message).
// Poll cùng nhịp 30s với badge chuông.
export function useUnreadNotifications() {
  const params: NotificationListParams = { unreadOnly: true, size: TOAST_FETCH_SIZE };
  return useQuery({
    // Dùng chung key với useNotifications → mark-read invalidate là toast cũng cập nhật.
    queryKey: NOTIFICATION_KEYS.list(params),
    queryFn: () => notificationApi.list(params),
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

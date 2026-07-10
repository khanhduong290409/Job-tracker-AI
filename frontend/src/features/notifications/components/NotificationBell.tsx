import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from '../api/queries';
import type { Notification } from '../types';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN');
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: unread = 0 } = useUnreadCount();
  // Chỉ tải danh sách khi mở dropdown → tránh fetch nền vô ích (badge đã poll riêng).
  const { data, isLoading, isError } = useNotifications({ size: 10 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = data?.items ?? [];

  function handleClickItem(n: Notification) {
    if (!n.read) markRead.mutate(n.id); // đã đọc rồi thì khỏi gọi lại
    setOpen(false);
    if (n.linkUrl) navigate(n.linkUrl); // linkUrl null (vd reminder CUSTOM) → chỉ đóng dropdown
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
        aria-label="Thông báo"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-4 text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Overlay trong suốt bắt click ra ngoài để đóng dropdown (không cần ref + listener). */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2">
              <span className="text-sm font-semibold text-gray-900">Thông báo</span>
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={unread === 0 || markAllRead.isPending}
                className="text-xs text-blue-600 hover:underline disabled:text-gray-300 disabled:no-underline"
              >
                Đánh dấu tất cả đã đọc
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading && (
                <p className="px-4 py-6 text-center text-sm text-gray-400">Đang tải...</p>
              )}
              {isError && (
                <p className="px-4 py-6 text-center text-sm text-red-500">
                  Không tải được thông báo.
                </p>
              )}
              {!isLoading && !isError && items.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-gray-400">
                  Chưa có thông báo nào.
                </p>
              )}

              {items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClickItem(n)}
                  className={cn(
                    'flex w-full gap-2 border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50',
                    !n.read && 'bg-blue-50/60',
                  )}
                >
                  {/* Chấm xanh đánh dấu chưa đọc; đã đọc thì chừa chỗ trống cho thẳng hàng. */}
                  <span
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      n.read ? 'bg-transparent' : 'bg-blue-500',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900">{n.title}</span>
                    <span className="mt-0.5 block line-clamp-2 text-xs text-gray-500">
                      {n.message}
                    </span>
                    <span className="mt-1 block text-[11px] text-gray-400">
                      {formatTime(n.createdAt)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

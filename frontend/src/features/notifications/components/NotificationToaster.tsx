import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REMINDER_KEYS } from '@/features/reminders/api/queries';
import { useMarkNotificationRead, useUnreadNotifications } from '../api/queries';
import type { Notification } from '../types';

// Hiện 6 giây rồi bắt đầu đóng.
const SHOW_MS = 6_000;

// Thời gian animation trượt ra. Phải khớp .animate-slide-out-right trong index.css (0.3s).
const CLOSE_MS = 300;

// Nhiều thông báo mới cùng lượt thì vào lần lượt cách nhau chừng này,
// thay vì cả loạt đập vào màn hình cùng lúc.
const STAGGER_MS = 400;

/**
 * Hiện toast thông báo ở góc phải khi có thông báo mới.
 *
 * Ý tưởng: cứ 30 giây hỏi server "các thông báo chưa đọc mới nhất là gì?".
 * Cái nào có id LỚN HƠN id lớn nhất đã thấy lần trước = thông báo mới → thêm vào
 * stack toast. Nhiều thông báo mới cùng lúc → nhiều toast xếp chồng dọc, mỗi cái
 * tự đếm giờ và tự đóng độc lập.
 *
 * Mount 1 lần ở ProtectedLayout → chạy nền cho mọi trang.
 */
export function NotificationToaster() {
  const queryClient = useQueryClient();
  const { data } = useUnreadNotifications();

  const [toasts, setToasts] = useState<Notification[]>([]);

  // id lớn nhất đã thấy. Dùng useRef chứ không useState: biến này chỉ để SO SÁNH,
  // không hiển thị ra màn hình. Gán ref không làm component vẽ lại.
  const seenMaxId = useRef<number | null>(null);

  useEffect(() => {
    if (!data) return;// khi khởi động app thì data nó trả về vẫn là 1 object chứ không phải null nên không bị return 
    //data = { items: [], page: 0, totalElements: 0, ... }


    // Lần đầu chỉ ghi nhớ mốc, không hiện: thông báo chưa đọc từ trước không phải
    // "mới", không thì vừa mở app đã bị cả loạt toast cũ đập vào mặt.
    // Chưa có thông báo nào → mốc = 0 để thông báo đầu tiên về sau vẫn hiện.
    if (seenMaxId.current === null) {
      seenMaxId.current = data.items[0]?.id ?? 0;
      return;
    }

    // Backend sắp mới nhất trước → lọc ra mọi cái mới hơn mốc, không chỉ cái đầu.
    const maxSeen = seenMaxId.current;
    const fresh = data.items.filter((n) => n.id > maxSeen);
    if (fresh.length === 0) return;

    seenMaxId.current = fresh[0].id;

    // Vào LẦN LƯỢT: cũ nhất trước (đúng thứ tự thời gian), mỗi cái cách nhau
    // STAGGER_MS; cái mới hơn trượt vào sau và chồng lên ĐẦU stack.
    // Cố ý KHÔNG cleanup các timer này khi data đổi: poll sau (hoặc mark-read)
    // làm effect chạy lại mà cleanup thì toast đang xếp hàng bị hủy oan.
    const oldestFirst = [...fresh].reverse();//tạo bảng sao rồi đảo ngược thứ tự bản sao 
    oldestFirst.forEach((n, i) => {
      setTimeout(() => setToasts((prev) => [n, ...prev]), i * STAGGER_MS);
    });

    // Có thông báo mới = job backend vừa gửi nhắc nhở = thẻ nhắc nhở trong trang
    // đã cũ. Tải lại danh sách để nó đổi sang "đã gửi" mà không cần F5.
    queryClient.invalidateQueries({ queryKey: REMINDER_KEYS.all });//đánh dấu key đã cũ và fetch lại 
  }, [data, queryClient]);

  // useCallback để tham chiếu hàm không đổi giữa các lần render → truyền xuống
  // ToastItem không làm effect đóng-toast của nó chạy lại (reset timer oan).
  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    // Khung cột cố định góc phải; từng toast tự animation, cha chỉ xếp chỗ.
    <div className="fixed right-6 top-12 z-50 flex w-80 flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} notification={toast} onDone={removeToast} />
      ))}
    </div>
  );
}

// 1 toast trong stack: tự chạy vòng đời hiện 8s → trượt ra 0.3s → báo cha gỡ.
function ToastItem({
  notification,
  onDone,
}: {
  notification: Notification;
  onDone: (id: number) => void;
}) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationRead();
  const [closing, setClosing] = useState(false); // đang chạy animation trượt ra

  // 1. Hiện đủ 8 giây thì bắt đầu đóng.
  useEffect(() => {
    const timer = setTimeout(() => setClosing(true), SHOW_MS);
    return () => clearTimeout(timer);
  }, []);

  // 2. Animation trượt ra chạy xong thì báo cha gỡ hẳn khỏi stack.
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => onDone(notification.id), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [closing, onDone, notification.id]);

  function handleOpen() {
    markRead.mutate(notification.id); // bấm rồi thì badge chuông phải bớt 1
    onDone(notification.id);
    if (notification.linkUrl) navigate(notification.linkUrl); // null (vd nhắc nhở CUSTOM) → chỉ đóng
  }

  return (
    // aria-live: trình đọc màn hình đọc toast mà không cướp con trỏ của user.
    <div
      role="status"
      aria-live="polite"
      className={cn(
        // Nền navy đặc (màu brand) — nổi hẳn khỏi trang nền trắng, khác màu với
        // toast hành động (xanh lá/đỏ, góc dưới) để user phân biệt ngay loại thông báo.
        'flex items-start gap-3 rounded-lg bg-primary p-3.5 text-white shadow-xl',
        closing ? 'animate-slide-out-right' : 'animate-slide-in-right',
      )}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/20">
        <Bell className="h-5 w-5" />
      </span>

      {/* Vùng bấm để đi tới đơn ứng tuyển — tách khỏi nút ✕ (button lồng button là HTML sai) */}
      <button type="button" onClick={handleOpen} className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold">{notification.title}</span>
        <span className="mt-0.5 block line-clamp-2 text-xs text-white/80">
          {notification.message}
        </span>
      </button>

      <button
        type="button"
        onClick={() => setClosing(true)}
        aria-label="Đóng thông báo"
        className="shrink-0 rounded p-1 text-white/70 hover:bg-white/15 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

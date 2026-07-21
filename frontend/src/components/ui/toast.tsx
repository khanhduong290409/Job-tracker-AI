import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Feedback lỗi cần thời gian đọc lâu hơn "đã lưu xong".
const SHOW_MS = { success: 4_000, error: 6_000 } as const;

// Khớp .animate-slide-out-right trong index.css (0.3s).
const CLOSE_MS = 300;

type ToastType = 'success' | 'error';

interface ToastData {
  id: number;
  type: ToastType;
  message: string;
}

// Cái mà useToast() trả về cho component gọi — chỉ 2 hàm, không lộ state bên trong.
interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/**
 * Toast feedback cho HÀNH ĐỘNG của user (lưu xong, xóa xong, lỗi...).
 *
 * Khác với NotificationToaster (góc phải TRÊN, tự poll thông báo từ server),
 * toast này góc phải DƯỚI và chỉ hiện khi code chủ động gọi:
 *
 *   const toast = useToast();
 *   toast.success('Đã xóa đơn ứng tuyển');
 *   toast.error('Không lưu được — thử lại');
 *
 * Bọc <ToastProvider> quanh app 1 lần trong App.tsx là mọi component gọi được.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  // Toast không có id sẵn từ server như notification → tự cấp id tăng dần.
  const nextId = useRef(1);

  const push = useCallback((type: ToastType, message: string) => {
    const id = nextId.current++;
    // Thêm vào CUỐI: stack neo đáy màn hình nên cái mới nhất nằm dưới cùng,
    // mọc lên sát góc — chỗ mắt user đang nhìn sau khi bấm nút.
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // useMemo giữ object api ổn định — không có nó, mỗi render Provider tạo object
  // mới → mọi component đang useToast() re-render oan.
  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex w-80 flex-col gap-2">
          {toasts.map((t) => (
            <ActionToast key={t.id} toast={t} onDone={remove} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast() phải được dùng bên trong <ToastProvider>');
  return ctx;
}

// 1 toast: tự chạy vòng đời hiện → trượt ra → báo cha gỡ (giống ToastItem bên notifications).
function ActionToast({ toast, onDone }: { toast: ToastData; onDone: (id: number) => void }) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setClosing(true), SHOW_MS[toast.type]);
    return () => clearTimeout(timer);
  }, [toast.type]);

  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => onDone(toast.id), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [closing, onDone, toast.id]);

  const isError = toast.type === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        // Nền đặc theo kết quả — xanh lá/đỏ nổi khỏi trang trắng, và khác màu navy
        // của toast nhắc nhở (góc trên) để 2 loại không lẫn nhau.
        'flex items-center gap-2.5 rounded-lg p-3 text-white shadow-lg',
        isError ? 'bg-red-600' : 'bg-emerald-600',
        closing ? 'animate-slide-out-right' : 'animate-slide-in-right',
      )}
    >
      {isError ? (
        <AlertCircle className="h-5 w-5 shrink-0" />
      ) : (
        <CheckCircle2 className="h-5 w-5 shrink-0" />
      )}
      <p className="min-w-0 flex-1 text-sm">{toast.message}</p>
      <button
        type="button"
        onClick={() => setClosing(true)}
        aria-label="Đóng"
        className="shrink-0 rounded p-0.5 text-white/70 hover:bg-white/15 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

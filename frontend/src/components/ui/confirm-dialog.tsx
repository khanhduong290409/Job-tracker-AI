import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

// Hàm mà useConfirm() trả về: gọi với câu hỏi → Promise chờ user bấm.
// true = Xác nhận, false = Hủy (hoặc bấm nền tối / phím Esc).
type ConfirmFn = (message: string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Modal xác nhận thay cho window.confirm — cùng cách dùng, chỉ thêm await:
 *
 *   const confirmDialog = useConfirm();
 *   async function handleDelete() {
 *     if (!(await confirmDialog('Xóa đơn ứng tuyển này?'))) return;
 *     ...xóa...
 *   }
 *
 * Bọc <ConfirmProvider> 1 lần trong App.tsx (cạnh ToastProvider).
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  // null = modal đóng; có chuỗi = modal mở với câu hỏi đó.
  const [message, setMessage] = useState<string | null>(null);

  // Hàm resolve của Promise đang chờ — cầu nối giữa "code gọi confirm" và "nút
  // user bấm sau đó". Dùng ref vì nó chỉ để gọi, không hiển thị ra màn hình.
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  const confirmDialog = useCallback<ConfirmFn>((msg) => {
    // Lỡ có confirm cũ đang treo (ca hiếm) → trả lời false cho nó khỏi chờ mãi.
    resolverRef.current?.(false);

    setMessage(msg);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve; // giữ lại, chờ user bấm mới gọi
    });
  }, []);

  const close = useCallback((ok: boolean) => {
    resolverRef.current?.(ok); // đánh thức chỗ đang await
    //viết tắt của:
    //if (resolverRef.current !== null && resolverRef.current !== undefined) {
    //resolverRef.current(ok);

    resolverRef.current = null;
    setMessage(null);
  }, []);

  // Phím Esc = Hủy. Chỉ lắng nghe khi modal đang mở.
  useEffect(() => {
    if (message === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [message, close]);

  return (
    <ConfirmContext.Provider value={confirmDialog}>
      {children}
      {message !== null && (
        // Nền tối phủ toàn màn hình — bấm vào nền = Hủy.
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          onClick={() => close(false)}
        >
          {/* stopPropagation: bấm TRONG hộp thoại không được tính là bấm nền */}
          <div
            role="alertdialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl border bg-white p-5 shadow-xl"
          >
            <p className="text-sm text-gray-800">{message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => close(false)}>
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={() => close(true)}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Xác nhận
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm() phải được dùng bên trong <ConfirmProvider>');
  return ctx;
}

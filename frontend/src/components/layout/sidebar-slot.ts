import { createContext, useContext } from 'react';

// Khe cắm sidebar: ProtectedLayout giữ 1 <div> trong sidebar và chia sẻ element đó qua context.
// Trang cần thêm section riêng vào sidebar sẽ createPortal vào element này (xem useSidebarSlot).
// Tách ra file riêng (không phải component) để không phá react-refresh của ProtectedLayout.
export const SidebarSlotContext = createContext<HTMLDivElement | null>(null);

export function useSidebarSlot() {
  return useContext(SidebarSlotContext);
}

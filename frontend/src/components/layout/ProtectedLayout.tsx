import { Navigate, Outlet, useLocation, Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/auth-store';
import { NotificationBell } from '../../features/notifications/components/NotificationBell';

/**
 * Layout cho route cần authenticated. Skeleton Phase 0:
 * - Chưa login → redirect `/login` kèm `state.from` để Phase 1 redirect về đúng trang cũ.
 * - Đã login → render `<Outlet />`.
 *
 * Phase 3 sẽ wrap thêm navbar + sidebar shell quanh Outlet.
 */
export function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Thanh header chung: chuông thông báo + cài đặt canh phải. Sticky để luôn thấy khi cuộn. */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-end gap-2 border-b border-gray-200 bg-white px-4">
        <NotificationBell />
        <Link
          to="/settings"
          aria-label="Cài đặt"
          className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </header>
      <Outlet />
    </div>
  );
}

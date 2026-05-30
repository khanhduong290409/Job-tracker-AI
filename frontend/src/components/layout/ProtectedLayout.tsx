import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/auth-store';

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
      <Outlet />
    </div>
  );
}

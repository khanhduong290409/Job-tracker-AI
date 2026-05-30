import { Outlet } from 'react-router-dom';

/**
 * Layout cho route công khai (vd `/login`). Skeleton Phase 0 — render `<Outlet />` trần.
 * Phase 1 có thể thêm logo + footer minimal nếu cần.
 */
export function PublicLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Outlet />
    </div>
  );
}

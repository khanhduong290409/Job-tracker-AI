import { useState } from 'react';
import { Navigate, Outlet, useLocation, NavLink } from 'react-router-dom';
import { ClipboardList, FileText, BarChart3, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoMark from '@/assets/logo-mark.png';
import { useAuthStore } from '../../features/auth/store/auth-store';
import { useLogout } from '../../features/auth/hooks/useAuth';
import { NotificationToaster } from '../../features/notifications/components/NotificationToaster';
import { SidebarSlotContext } from './sidebar-slot';

const NAV_ITEMS = [
  { to: '/applications', label: 'Đơn ứng tuyển', icon: ClipboardList },
  { to: '/cv', label: 'CV', icon: FileText },
  { to: '/analytics', label: 'Phân tích', icon: BarChart3 },
];

export function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const location = useLocation();
  // ref-callback qua useState: khi <div> mount, setState → re-render → context có element thật cho portal.
  const [slotEl, setSlotEl] = useState<HTMLDivElement | null>(null);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <SidebarSlotContext.Provider value={slotEl}>
      <div className="flex min-h-screen bg-gray-50">
        <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r bg-white">
          {/* Logo — dùng bản CHỈ ICON vì ngay cạnh đã có chữ "Applyist" (bản lockup sẽ lặp chữ) */}
          <div className="flex items-center gap-2.5 px-5 py-4">
            <img src={logoMark} alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
            <span className="leading-tight">
              <span className="block font-semibold tracking-tight">Applyist</span>
              <span className="block text-[10px] uppercase tracking-wider text-gray-400">
                Job Tracker AI
              </span>
            </span>
          </div>

          {/* Nav chính */}
          <nav className="flex flex-col gap-1 px-3">
            {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Khe cắm section theo-trang (Tổng quan / Trạng thái...) */}
          <div ref={setSlotEl} className="mt-6 flex-1 overflow-y-auto px-3" />

          {/* Chân sidebar: Cài đặt + hồ sơ user + đăng xuất (chuông ở header main từng trang) */}
          <div className="space-y-1 border-t p-3">
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                )
              }
            >
              <Settings className="h-4 w-4" />
              Cài đặt
            </NavLink>

            <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {user?.fullName?.charAt(0) ?? '?'}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{user?.fullName}</p>
                <p className="truncate text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
                aria-label="Đăng xuất"
                title="Đăng xuất"
                className="shrink-0 rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Lớp phủ toàn app — mount 1 lần ở đây để mọi trang đều nhận được toast.
          position:fixed nên đặt ngoài khung flex, không ảnh hưởng bố cục. */}
      <NotificationToaster />
    </SidebarSlotContext.Provider>
  );
}

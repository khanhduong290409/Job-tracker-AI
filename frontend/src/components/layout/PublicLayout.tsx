import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/auth-store';

export function PublicLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/applications" replace />;
  }

  return <Outlet />;
}

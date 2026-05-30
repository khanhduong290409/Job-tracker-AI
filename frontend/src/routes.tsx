import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { ProtectedLayout } from './components/layout/ProtectedLayout';

/**
 * Route tree app. Placeholder inline cho Phase 0 — Phase 1/3 sẽ thay bằng page thật.
 */

function LoginPlaceholder() {
  return (
    <div className="rounded-lg bg-white p-8 shadow">
      <h1 className="text-xl font-semibold">Login (Phase 1)</h1>
      <p className="mt-2 text-sm text-gray-600">Google OAuth sẽ implement ở Phase 1.</p>
    </div>
  );
}

function DashboardPlaceholder() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Dashboard (Phase 3)</h1>
      <p className="mt-2 text-sm text-gray-600">Applications list sẽ implement ở Phase 3.</p>
    </div>
  );
}

function NotFoundPlaceholder() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold">404</h1>
        <p className="mt-2 text-gray-600">Page not found</p>
      </div>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPlaceholder />} />
      </Route>

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPlaceholder />} />
      </Route>

      <Route path="*" element={<NotFoundPlaceholder />} />
    </Routes>
  );
}

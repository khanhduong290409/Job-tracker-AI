import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/layout/PublicLayout';
import { ProtectedLayout } from './components/layout/ProtectedLayout';
import { LoginPage } from './features/auth/pages/LoginPage';
import { CallbackPage } from './features/auth/pages/CallbackPage';
import { CvListPage } from './features/cv/pages/CvListPage';
import { CvDetailPage } from './features/cv/pages/CvDetailPage';
import { ApplicationListPage } from './features/applications/pages/ApplicationListPage';
import { CreateApplicationPage } from './features/applications/pages/CreateApplicationPage';
import { ApplicationDetailPage } from './features/applications/pages/ApplicationDetailPage';
import { SettingsPage } from './features/settings/pages/SettingsPage';
import { AnalyticsPage } from './features/analytics/pages/AnalyticsPage';

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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<CallbackPage />} />
      </Route>

      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/applications" replace />} />
        <Route path="/cv" element={<CvListPage />} />
        <Route path="/cv/:id" element={<CvDetailPage />} />
        {/* Route tĩnh /new đặt trước /:id để không bị match nhầm thành id */}
        <Route path="/applications" element={<ApplicationListPage />} />
        <Route path="/applications/new" element={<CreateApplicationPage />} />
        <Route path="/applications/:id" element={<ApplicationDetailPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPlaceholder />} />
    </Routes>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authApi } from '../api/auth-api';
import { useAuthStore } from '../store/auth-store';

export function CallbackPage() {
  const [searchParams] = useSearchParams();//khi goole redirect về /auth/callback?code=4/abc123...&scope=email+profile
  //searchParams đọc phần sau dấu ? 
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  // setAuth lúc này là 1 biến chứa hàm, chưa chạy gì cả
  // Lấy code ngay lúc render — nếu không có code thì bắt đầu ở trạng thái lỗi luôn
  const code = searchParams.get('code');
  const [hasError, setHasError] = useState(!code);
  // code = "4/abc123" → !code = false → hasError = false (bình thường)
  // code = null       → !code = true  → hasError = true  (lỗi ngay)
  // React 18 StrictMode double-invoke guard: tránh gọi API 2 lần trong dev
  const calledRef = useRef(false);

  useEffect(() => {
    if (!code || calledRef.current) return;
    calledRef.current = true;

    authApi
      .googleLogin(code, `${window.location.origin}/auth/callback`)
      .then(({ user, accessToken, refreshToken }) => {
        setAuth(user, accessToken, refreshToken);
        navigate('/applications', { replace: true });//replace:true bên dưới có giải thích
      })
      .catch(() => setHasError(true));
  }, [code, navigate, setAuth]);

  if (hasError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-sm text-gray-600">Đăng nhập thất bại.</p>
          <a href="/login" className="mt-2 inline-block text-sm text-primary hover:underline">
            Thử lại
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-gray-500">Đang xác thực...</p>
      </div>
    </div>
  );
}

/*
replace: true — thay thế trang hiện tại trong browser history thay vì thêm vào.


Không có replace (mặc định):
history: [/login] → [/login, /auth/callback] → [/login, /auth/callback, /dashboard]
user nhấn Back → quay về /auth/callback (trang trắng spinner)

Có replace: true:
history: [/login] → [/login, /auth/callback] → [/login, /dashboard]
                                ↑ bị thay thế bởi /dashboard
user nhấn Back → quay về /login (đúng)
 */
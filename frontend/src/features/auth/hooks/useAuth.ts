import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth-api';
import { useAuthStore } from '../store/auth-store';
import { tokenStorage } from '@/lib/api/axios';
import { env } from '@/config/env';

const GOOGLE_OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';

//URLSearchParams Là Web API có sẵn trong trình duyệt, dùng để tạo và xử lý chuỗi query string trên URL.
function buildGoogleOAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: env.VITE_GOOGLE_CLIENT_ID,
    redirect_uri: `${window.location.origin}/auth/callback`,//window.location.origin là URL gốc của trang web đang chạy:
    response_type: 'code',// yêu cầu google trả về code để đổi lấy token
    scope: 'openid email profile',// xin quyền đọc thông tin user: openid(xác nhận đây là google user), email(địa chỉ email), profile(tên, ảnh đại diện)
  });
  return `${GOOGLE_OAUTH_BASE}?${params.toString()}`;
//params.toString() -> "client_id=abc123&redirect_uri=https%3A%2F%2Fmyapp.com%2Fauth%2Fcallback&response_type=code&scope=openid+email+profile"
//Ghép URL hoàn chỉnh để redirect user sang Google.
//'https://accounts.google.com/o/oauth2/v2/auth?client_id=abc&redirect_uri=...&...'
}

export function useGoogleLogin() {
  const login = () => {
    window.location.href = buildGoogleOAuthUrl();
  };
  //window.location.href = url — chuyển hướng trình duyệt sang URL khác. Gán URL vào đây là cách redirect trong browser.
  return { login };
}

export function useLogout() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = tokenStorage.getRefresh();
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    },
    onSettled: () => {
      clearAuth();
      navigate('/login', { replace: true });
    },
  });
}

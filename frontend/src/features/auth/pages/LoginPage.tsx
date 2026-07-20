import { useGoogleLogin } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import loginBackground from '@/assets/background_login.png';
import logo from '@/assets/logo.png';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export function LoginPage() {
  const { login } = useGoogleLogin();

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      {/* Ảnh nền phủ toàn màn hình. alt="" + aria-hidden vì đây là ảnh trang trí,
          screen reader bỏ qua (nội dung chữ trong ảnh không phải nội dung thật của trang). */}
      <img
        src={loginBackground}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Lớp phủ tối + blur: làm chữ/mockup trong ảnh lùi thành hoạ tiết, card nổi lên rõ */}
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px]" />

      {/* relative để card nằm TRÊN 2 lớp absolute phía trên */}
      <div className="relative w-full max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-card p-8 shadow-2xl">
          {/* Logo đặt TRONG card (nền sáng): bảng màu logo — chữ xanh gradient + tagline xám —
              vốn dành cho nền sáng, đặt trên lớp phủ tối sẽ mất tương phản. */}
          <img src={logo} alt="Applyist — Job Tracker AI" className="mx-auto h-28 w-auto" />

          <h2 className="mt-6 text-center text-lg font-semibold text-gray-900">Đăng nhập</h2>
          <p className="mt-1 text-center text-sm text-gray-500">
            Tiếp tục với tài khoản Google của bạn.
          </p>

          <Button onClick={login} variant="outline" className="mt-6 w-full gap-3">
            <GoogleIcon />
            Đăng nhập bằng Google
          </Button>

          <p className="mt-4 text-center text-xs text-gray-400">
            Chỉ cần tài khoản Google — không cần tạo tài khoản riêng.
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          Dành cho ứng viên IT — theo dõi đơn, phân tích CV, nhắc follow-up.
        </p>
      </div>
    </div>
  );
}

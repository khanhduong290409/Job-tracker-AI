import { ClipboardList, Sparkles, Bell } from 'lucide-react';
import { useGoogleLogin } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';

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

const FEATURES = [
  { icon: ClipboardList, text: 'Theo dõi mọi đơn ứng tuyển ở một nơi' },
  { icon: Sparkles, text: 'AI phân tích độ khớp CV với JD' },
  { icon: Bell, text: 'Nhắc nhở follow-up đúng lúc' },
];

export function LoginPage() {
  const { login } = useGoogleLogin();

  return (
    <div className="flex min-h-screen">
      {/* Panel trái — thương hiệu + giới thiệu (chỉ hiện từ lg) */}
      <div className="hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex lg:w-1/2">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/15 text-xl font-bold">
            J
          </span>
          <span className="text-lg font-semibold tracking-tight">Job Tracker AI</span>
        </div>

        <div>
          <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-balance">
            Quản lý hành trình xin việc, thông minh hơn.
          </h1>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-primary-foreground/90">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-primary-foreground/70">
          Dành cho ứng viên IT — theo dõi đơn, phân tích CV, nhắc follow-up.
        </p>
      </div>

      {/* Panel phải — đăng nhập */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Thương hiệu gọn — chỉ hiện trên mobile (panel trái ẩn) */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow-sm">
              J
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">Job Tracker AI</h1>
          </div>

          <div className="rounded-2xl border bg-card p-8 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Đăng nhập</h2>
            <p className="mt-1 text-sm text-gray-500">Tiếp tục với tài khoản Google của bạn.</p>

            <Button onClick={login} variant="outline" className="mt-6 w-full gap-3">
              <GoogleIcon />
              Đăng nhập bằng Google
            </Button>

            <p className="mt-4 text-center text-xs text-gray-400">
              Chỉ cần tài khoản Google — không cần tạo tài khoản riêng.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

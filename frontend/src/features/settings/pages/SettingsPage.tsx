import { Mail, CheckCircle2, XCircle } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/ui/query-states';
import { useProfile, useUpdateNotificationPreferences } from '../api/queries';
import type { NotificationPreferences } from '../types';

/**
 * Trang cài đặt tài khoản. Card Tài khoản (chỉ đọc) + tùy chọn kênh nhận thông báo
 * (in-app + email) — bật/tắt lưu ngay (PUT full-replace cả 2 kênh).
 */
export function SettingsPage() {
  const { data: profile, isLoading, isError, refetch } = useProfile();
  const { mutate: updatePrefs, isPending } = useUpdateNotificationPreferences();

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-6">
        <LoadingState />
      </div>
    );
  }
  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-6">
        <ErrorState message="Không tải được thông tin tài khoản." onRetry={refetch} />
      </div>
    );
  }

  const prefs = profile.notificationPreferences;
  const memberSince = new Date(profile.createdAt).toLocaleDateString('vi-VN');

  // Bật/tắt 1 kênh → gửi PUT với cả 2 field (endpoint full-replace, @NotNull cả hai).
  function toggle(channel: keyof NotificationPreferences) {// keyof tức là 1 trong các tên field của notificationPreferences
    updatePrefs({ ...prefs, [channel]: !prefs[channel] });//prefs[channel] là cách lấy ra giá trị của 1 field bằng tên field
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Cài đặt</h1>
        <p className="mt-0.5 text-sm text-gray-500">Quản lý tài khoản và thông báo</p>
      </div>

      {/* Tài khoản */}
      <section className="mt-6 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">Tài khoản</h2>

        <div className="mt-4 flex items-center gap-3">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-bold text-primary">
              {profile.fullName?.charAt(0) ?? profile.email.charAt(0)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{profile.fullName ?? 'Người dùng'}</p>
            <p className="truncate text-sm text-gray-500">{profile.email}</p>
          </div>
        </div>

        <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-gray-500">
              <Mail className="h-4 w-4" />
              Gmail
            </dt>
            <dd>
              {profile.gmailConnected ? (
                <span className="inline-flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Đã kết nối
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-gray-400">
                  <XCircle className="h-4 w-4" />
                  Chưa kết nối
                </span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-500">Thành viên từ</dt>
            <dd className="text-gray-900">{memberSince}</dd>
          </div>
        </dl>
      </section>

      {/* Thông báo */}
      <section className="mt-6 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Thông báo</h2>
          {isPending && <span className="text-xs text-gray-400">Đang lưu...</span>}
        </div>

        <div className="mt-2 divide-y divide-gray-100">
          <ToggleRow
            label="Thông báo trong ứng dụng"
            description="Hiện nhắc nhở ở chuông thông báo."
            checked={prefs.inApp}
            disabled={isPending}
            onToggle={() => toggle('inApp')}
          />
          <ToggleRow
            label="Thông báo qua email"
            description="Gửi email khi có nhắc nhở tới hạn."
            checked={prefs.email}
            disabled={isPending}
            onToggle={() => toggle('email')}
          />
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function ToggleRow({ label, description, checked, disabled, onToggle }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onToggle={onToggle} />
    </div>
  );
}

function Switch({
  checked,
  disabled,
  onToggle,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? 'bg-primary' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

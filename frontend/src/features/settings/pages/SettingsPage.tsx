import { useProfile, useUpdateNotificationPreferences } from '../api/queries';
import type { NotificationPreferences } from '../types';

/**
 * Trang cài đặt tài khoản. Hiện tại chỉ có tùy chọn kênh nhận thông báo
 * (in-app + email) — bật/tắt lưu ngay (PUT full-replace cả 2 kênh).
 */
export function SettingsPage() {
  const { data: profile, isLoading, isError } = useProfile();
  const { mutate: updatePrefs, isPending } = useUpdateNotificationPreferences();

  if (isLoading) {
    return <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-gray-500">Đang tải...</div>;
  }
  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 text-sm text-red-600">
        Không tải được thông tin tài khoản.
      </div>
    );
  }

  const prefs = profile.notificationPreferences;

  // Bật/tắt 1 kênh → gửi PUT với cả 2 field (endpoint full-replace, @NotNull cả hai).
  function toggle(channel: keyof NotificationPreferences) {// keyof tức là 1 trong các tên field của notificationPreferences
    updatePrefs({ ...prefs, [channel]: !prefs[channel] });//prefs[channel] là cách lấy ra giá trị của 1 field bằng tên field
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>

      <section className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Thông báo</h2>
          {isPending && <span className="text-xs text-gray-400">Đang lưu...</span>}
        </div>

        <div className="mt-4 divide-y divide-gray-100">
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
        checked ? 'bg-blue-600' : 'bg-gray-300'
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

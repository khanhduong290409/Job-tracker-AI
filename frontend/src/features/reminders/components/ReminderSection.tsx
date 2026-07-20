import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  useCreateReminder,
  useDeleteReminder,
  useDismissReminder,
  useReminders,
} from '../api/queries';
import { getReminderTypeLabel } from '../types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN');
}

// Giá trị min cho <input type="datetime-local"> = thời điểm hiện tại (local, format YYYY-MM-DDTHH:mm).
function nowLocalInputValue(): string {
  const d = new Date();//d là thời điểm hiện tại
  const pad = (n: number) => String(n).padStart(2, '0');//đảm bảo chuỗi dài ít nhất 2 kí tự, nếu thiếu thì thêm 0 và trước kí tự ví dụ 1 -> 01
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}//getMonth() trả về tháng bắt đầu từ 0

interface ReminderSectionProps {
  applicationId: number;
}

export function ReminderSection({ applicationId }: ReminderSectionProps) {
  const { data: reminders, isLoading } = useReminders({ applicationId });
  const { mutate: createReminder, isPending: isCreating, error: createError } = useCreateReminder();
  const { mutate: dismissReminder } = useDismissReminder();
  const { mutate: deleteReminder } = useDeleteReminder();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) return;
    createReminder(
      {
        applicationId,
        title: title.trim(),
        description: description.trim() || undefined,
        scheduledAt: new Date(scheduledAt).toISOString(), // datetime-local → ISO UTC
      },
      {
        onSuccess: () => {
          setTitle('');
          setDescription('');
          setScheduledAt('');
        },
      },
    );
  }

  function handleDelete(id: number) {
    if (!window.confirm('Xóa nhắc nhở này?')) return;
    deleteReminder(id);
  }

  const items = reminders ?? [];

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-base font-semibold text-gray-900">Nhắc nhở</h2>

      {/* Form tạo reminder CUSTOM */}
      <form onSubmit={submit} className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề nhắc nhở"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          value={scheduledAt}
          min={nowLocalInputValue()}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả (tùy chọn)"
          rows={2}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <Button type="submit" size="sm" disabled={!title.trim() || !scheduledAt || isCreating}>
          {isCreating ? 'Đang tạo...' : 'Thêm nhắc nhở'}
        </Button>
        {createError && (
          <p className="text-sm text-red-600">
            Không tạo được nhắc nhở — thời gian phải ở tương lai.
          </p>
        )}
      </form>

      {/* Danh sách reminder */}
      <div className="mt-3 space-y-2">
        {isLoading && <p className="text-sm text-gray-500">Đang tải...</p>}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-gray-500">Chưa có nhắc nhở nào.</p>
        )}
        {items.map((r) => (
          <div
            key={r.id}
            className={`rounded-md border border-gray-200 bg-white p-3 text-sm ${r.dismissed ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="font-medium text-gray-900">{r.title}</span>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5">
                    {getReminderTypeLabel(r.reminderType)}
                  </span>
                  <span>{formatDateTime(r.scheduledAt)}</span>
                  <span>{r.sentAt ? '· Đã gửi' : '· Chưa gửi'}</span>
                  {r.dismissed && <span>· Đã tắt</span>}
                </div>
                {r.description && <p className="mt-1 text-gray-600">{r.description}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                {!r.dismissed && (
                  <button
                    type="button"
                    onClick={() => dismissReminder(r.id)}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Tắt
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/query-states';
import { AiMatchCard } from '@/features/ai/components/AiMatchCard';
import { JdInsightSection } from '@/features/ai/components/JdInsightSection';
import { useCvList } from '@/features/cv/api/queries';
import { EmailDraftSection } from '@/features/email/components/EmailDraftSection';
import { ReminderSection } from '@/features/reminders/components/ReminderSection';
import type { ApplicationStatus } from '@/types/common';
import {
  useAddTimelineEvent,
  useApplication,
  useChangeStatus,
  useDeleteApplication,
  useUpdateApplication,
} from '../api/queries';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { ALLOWED_TRANSITIONS, APPLICATION_STATUS_CONFIG } from '../status-meta';
import { TIMELINE_EVENT_LABELS, TIMELINE_EVENT_TYPES, type TimelineEventType } from '../types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN');
}// chuyển chuỗi ISO datetime thành định dạng tiếng việt dễ đọc 
/*
formatDateTime('2024-06-14T08:30:00Z')
// → '14/06/2024, 08:30:00'
*/

export function ApplicationDetailPage() {
  const { id } = useParams();
  const appId = Number(id);
  const navigate = useNavigate();

  const { data: app, isLoading, isError } = useApplication(appId);

  const { mutate: changeStatus, isPending: isChanging, error: statusError } = useChangeStatus();
  const { mutate: deleteApplication, isPending: isDeleting } = useDeleteApplication();
  const { mutate: addEvent, isPending: isAddingEvent } = useAddTimelineEvent();
  const { mutate: updateApplication, isPending: isLinkingCv } = useUpdateApplication();

  const { data: cvList } = useCvList();

  // ── Change-status form ──
  const [newStatus, setNewStatus] = useState<ApplicationStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');

  // ── Timeline-event form ──
  const [evtType, setEvtType] = useState<TimelineEventType>('NOTE');
  const [evtDate, setEvtDate] = useState('');
  const [evtTitle, setEvtTitle] = useState('');
  const [evtDesc, setEvtDesc] = useState('');

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <LoadingState />
      </div>
    );
  }
  if (isError || !app) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-red-600">Không tìm thấy đơn ứng tuyển.</p>
        <Link to="/applications" className="text-sm text-blue-600 hover:underline">
          ← Quay lại danh sách
        </Link>
      </div>
    );
  }

  const allowed = ALLOWED_TRANSITIONS[app.status];

  function submitStatus() {
    if (!newStatus) return;
    changeStatus(
      { id: appId, body: { newStatus, note: statusNote.trim() || undefined } },
      { onSuccess: () => { setNewStatus(''); setStatusNote(''); } },
    );
  }

  function submitEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!evtDate) return;
    addEvent(
      {
        id: appId,
        body: {
          eventType: evtType,
          eventDate: new Date(evtDate).toISOString(), // datetime-local → ISO UTC
          title: evtTitle.trim() || undefined,
          description: evtDesc.trim() || undefined,
        },
      },
      { onSuccess: () => { setEvtDate(''); setEvtTitle(''); setEvtDesc(''); } },
    );
  }

  function handleDelete() {
    if (!window.confirm('Xóa đơn ứng tuyển này?')) return;
    deleteApplication(appId, { onSuccess: () => navigate('/applications') });
  }

  function handleCvChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;// trả về id cv nhưng là kiểu string nên cần ép number
    if (!val) return; // chọn "chưa gắn" không gỡ được CV (PATCH null = giữ nguyên) — defer unlink
    updateApplication({ id: appId, body: { cvVersionId: Number(val) } });//trong learning file form react hook có giải thích
    //đoạn này tại sao lại chỉ truyền body có mỗi id mà không có các field khác trong khi kiểu dữ liệu body ở queries là UpdateApplicationRequest
  }

  const salary =
    app.salaryMin != null || app.salaryMax != null
      ? `${app.salaryMin ?? '?'} - ${app.salaryMax ?? '?'} ${app.salaryCurrency ?? ''}`.trim()
      : null;

  const infoRows: { label: string; value: string | null }[] = [
    { label: 'Địa điểm', value: app.location },
    { label: 'Hình thức', value: app.workType },
    { label: 'Loại hình', value: app.employmentType },
    { label: 'Lương', value: salary },
    { label: 'Nguồn', value: app.source },
    { label: 'Chi tiết nguồn', value: app.sourceDetail },
    { label: 'Ngày nộp', value: app.appliedDate },
    { label: 'Domain', value: app.companyDomain },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/applications" className="text-sm text-blue-600 hover:underline">
        ← Quay lại danh sách
      </Link>

      {/* Header */}
      <div className="mt-2 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">{app.companyName}</h1>
            <ApplicationStatusBadge status={app.status} />
          </div>
          <p className="mt-1 text-gray-700">{app.position}</p>
        </div>
        <Button
          variant="outline"
          onClick={handleDelete}
          disabled={isDeleting}
          className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          Xóa
        </Button>
      </div>

      {/* Info */}
      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        {infoRows
          .filter((r) => r.value)//loại bỏ các data ko có field value
          .map((r) => (
            <div key={r.label}>
              <dt className="text-gray-500">{r.label}</dt>
              <dd className="text-gray-900">{r.value}</dd>
            </div>
          ))}
      </dl>

      {app.jdUrl && (
        <a href={app.jdUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
          Xem JD gốc ↗
        </a>
      )}

      {app.notes && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-gray-700">Ghi chú</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{app.notes}</p>
        </div>
      )}

      {/* JD content */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-700">Nội dung JD</h2>
        <p className="mt-1 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          {app.jdContent}
        </p>
      </div>

      {/* CV ứng tuyển — gắn CV để bật phân tích độ khớp CV–JD */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-gray-700">CV ứng tuyển</h2>
        <select
          value={app.cvVersionId ?? ''}//value ở đây lấy cvversionid của app từ backend
          //sau đó đối chiếu với các option dựa vào value, nếu trùng thì hiển thị option đó
          //thật ra nó là việc register làm ở form react hook nhưng ở đây ta không dùng form mà chỉ là sellect bình thường
          //nên ta dùng value thủ công chỉ để hiển thị option mà user đã chọn
          onChange={handleCvChange}
          disabled={isLinkingCv}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">-- Chưa gắn CV --</option>
          {(cvList ?? []).map((cv) => (
            <option key={cv.id} value={cv.id}>
              {cv.label}
              {cv.parseStatus === 'COMPLETED' ? '' : ' (chưa parse xong)'}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">
          Cần CV đã phân tích xong (COMPLETED) để chạy độ khớp CV–JD.
        </p>
      </div>

      {/* AI: phân tích JD + độ khớp CV–JD */}
      <JdInsightSection applicationId={appId} />
      <AiMatchCard applicationId={appId} />

      {/* Change status */}
      <div className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-gray-900">Đổi trạng thái</h2>
        {allowed.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">Trạng thái cuối — không thể chuyển tiếp.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ApplicationStatus | '')}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">-- Chọn trạng thái mới --</option>
              {allowed.map((s) => (
                <option key={s} value={s}>
                  {APPLICATION_STATUS_CONFIG[s].label}
                </option>
              ))}
            </select>
            <input
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="Ghi chú (tùy chọn)"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <Button onClick={submitStatus} disabled={!newStatus || isChanging}>
              {isChanging ? 'Đang lưu...' : 'Cập nhật'}
            </Button>
            {statusError && <p className="text-sm text-red-600">Đổi trạng thái thất bại.</p>}
          </div>
        )}
      </div>

      {/* Nhắc nhở */}
      <ReminderSection applicationId={appId} />

      {/* Soạn email gửi HR (AI) */}
      <EmailDraftSection applicationId={appId} />

      {/* Timeline */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Ghi chú sự kiện</h2>

        <form onSubmit={submitEvent} className="mt-3 space-y-2 rounded-lg border border-gray-200 bg-white p-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select
              value={evtType}
              onChange={(e) => setEvtType(e.target.value as TimelineEventType)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              {TIMELINE_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {TIMELINE_EVENT_LABELS[t]}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={evtDate}
              onChange={(e) => setEvtDate(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <input
            value={evtTitle}
            onChange={(e) => setEvtTitle(e.target.value)}
            placeholder="Tiêu đề (tùy chọn)"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          {/* textarea — nhiều dòng, dùng cho text dài */}
          <textarea
            value={evtDesc}
            onChange={(e) => setEvtDesc(e.target.value)}
            placeholder="Mô tả (tùy chọn)"
            rows={2}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <Button type="submit" size="sm" disabled={!evtDate || isAddingEvent}>
            {isAddingEvent ? 'Đang thêm...' : 'Thêm sự kiện'}
          </Button>
        </form>

        <div className="mt-3 space-y-2">
          {app.timelineEvents.length === 0 && (
            <p className="text-sm text-gray-500">Chưa có sự kiện nào.</p>
          )}
          {app.timelineEvents.map((ev) => (
            <div key={ev.id} className="rounded-md border border-gray-200 bg-white p-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="font-medium text-gray-900">{ev.title || TIMELINE_EVENT_LABELS[ev.eventType]}</span>
                {/* Vì title và eventType mô tả cùng 1 thứ — tên của event đó. title là do user tự đặt, eventType là label mặc định khi user không đặt tên. */}
                <span className="shrink-0 text-xs text-gray-400">{formatDateTime(ev.eventDate)}</span>
              </div>
              {ev.description && <p className="mt-1 text-gray-600">{ev.description}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Status history */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Lịch sử trạng thái</h2>
        <div className="mt-3 space-y-2">
          {app.statusHistory.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="text-gray-700">
                {h.fromStatus ? `${APPLICATION_STATUS_CONFIG[h.fromStatus].label} → ` : ''}
                {APPLICATION_STATUS_CONFIG[h.toStatus].label}
                {h.note ? ` · ${h.note}` : ''}
              </span>
              <span className="shrink-0 text-xs text-gray-400">{formatDateTime(h.changedAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

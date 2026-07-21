import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { LoadingState } from '@/components/ui/query-states';
import { useToast } from '@/components/ui/toast';
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
import { StatusStepper } from '../components/StatusStepper';
import { ALLOWED_TRANSITIONS, APPLICATION_STATUS_CONFIG } from '../status-meta';
import { TIMELINE_EVENT_LABELS, TIMELINE_EVENT_TYPES, type TimelineEventType } from '../types';

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('vi-VN');
}// chuyển chuỗi ISO datetime thành định dạng tiếng việt dễ đọc
/*
formatDateTime('2024-06-14T08:30:00Z')
// → '14/06/2024, 08:30:00'
*/

// Card khung dùng chung cho các section — tiêu đề + nội dung, style nhất quán.
function SectionCard({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-xl border bg-card p-5 shadow-sm', className)}>
      {title && <h2 className="mb-3 text-base font-semibold text-gray-900">{title}</h2>}
      {children}
    </section>
  );
}

export function ApplicationDetailPage() {
  const { id } = useParams();
  const appId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const confirmDialog = useConfirm();

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
      <div className="mx-auto max-w-6xl px-6 py-8">
        <LoadingState />
      </div>
    );
  }
  if (isError || !app) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-8">
        <p className="text-sm text-red-600">Không tìm thấy đơn ứng tuyển.</p>
        <Link to="/applications" className="text-sm text-primary hover:underline">
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
      {
        onSuccess: () => {
          setNewStatus('');
          setStatusNote('');
          toast.success('Đã đổi trạng thái đơn');
        },
      },
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
      {
        onSuccess: () => {
          setEvtDate('');
          setEvtTitle('');
          setEvtDesc('');
          toast.success('Đã thêm sự kiện');
        },
        onError: () => toast.error('Không thêm được sự kiện — thử lại'),
      },
    );
  }

  async function handleDelete() {
    if (!(await confirmDialog('Xóa đơn ứng tuyển này?'))) return;
    deleteApplication(appId, {
      onSuccess: () => {
        toast.success('Đã xóa đơn ứng tuyển');
        navigate('/applications');
      },
      onError: () => toast.error('Không xóa được đơn — thử lại'),
    });
  }

  function handleCvChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;// trả về id cv nhưng là kiểu string nên cần ép number
    if (!val) return; // chọn "chưa gắn" không gỡ được CV (PATCH null = giữ nguyên) — defer unlink
    updateApplication(
      { id: appId, body: { cvVersionId: Number(val) } },
      {
        onSuccess: () => toast.success('Đã gắn CV vào đơn'),
        onError: () => toast.error('Không gắn được CV — thử lại'),
      },
    );
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

  // Dòng meta ngắn dưới tiêu đề (chỉ field có giá trị).
  const headerMeta = [app.location, app.workType, app.appliedDate ? `Nộp ${app.appliedDate}` : null]
    .filter(Boolean)
    .join(' · ');

  const selectClass =
    'block w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <Link to="/applications" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      {/* ── Header card: avatar + tên/vị trí + badge + stepper + xóa ── */}
      <div className="mt-3 rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-lg font-bold uppercase text-primary">
            {app.companyName.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-gray-900">{app.companyName}</h1>
              <ApplicationStatusBadge status={app.status} />
            </div>
            <p className="mt-0.5 text-gray-600">{app.position}</p>
            {headerMeta && <p className="mt-1 text-xs text-gray-400">{headerMeta}</p>}
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
        <div className="mt-6 px-1">
          <StatusStepper status={app.status} />
        </div>
      </div>

      {/* ── 2 cột ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* CỘT TRÁI (chính): nội dung + AI + timeline */}
        <div className="space-y-6 lg:col-span-2">
          {/* Nội dung JD + ghi chú */}
          <SectionCard title="Nội dung JD">
            {app.jdUrl && (
              <a
                href={app.jdUrl}
                target="_blank"
                rel="noreferrer"
                className="mb-2 inline-block text-sm text-primary hover:underline"
              >
                Xem JD gốc ↗
              </a>
            )}
            <p className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border bg-gray-50 p-3 text-sm text-gray-700">
              {app.jdContent}
            </p>
            {app.notes && (
              <div className="mt-4">
                <h3 className="text-xs font-semibold uppercase text-gray-500">Ghi chú</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{app.notes}</p>
              </div>
            )}
          </SectionCard>

          <JdInsightSection applicationId={appId} />
          <AiMatchCard applicationId={appId} />
          <EmailDraftSection applicationId={appId} />

          {/* Timeline sự kiện */}
          <SectionCard title="Ghi chú sự kiện">
            <form onSubmit={submitEvent} className="space-y-2 rounded-lg border bg-gray-50 p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={evtType}
                  onChange={(e) => setEvtType(e.target.value as TimelineEventType)}
                  className={selectClass}
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
                  className={selectClass}
                />
              </div>
              <input
                value={evtTitle}
                onChange={(e) => setEvtTitle(e.target.value)}
                placeholder="Tiêu đề (tùy chọn)"
                className={selectClass}
              />
              <textarea
                value={evtDesc}
                onChange={(e) => setEvtDesc(e.target.value)}
                placeholder="Mô tả (tùy chọn)"
                rows={2}
                className={selectClass}
              />
              <Button type="submit" size="sm" disabled={!evtDate || isAddingEvent}>
                {isAddingEvent ? 'Đang thêm...' : 'Thêm sự kiện'}
              </Button>
            </form>

            {/* Danh sách sự kiện — quá dài thì cuộn trong khung */}
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {app.timelineEvents.length === 0 && (
                <p className="text-sm text-gray-500">Chưa có sự kiện nào.</p>
              )}
              {app.timelineEvents.map((ev) => (
                <div key={ev.id} className="rounded-md border bg-white p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-gray-900">
                      {ev.title || TIMELINE_EVENT_LABELS[ev.eventType]}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">{formatDateTime(ev.eventDate)}</span>
                  </div>
                  {ev.description && <p className="mt-1 text-gray-600">{ev.description}</p>}
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Lịch sử trạng thái — quá dài thì cuộn trong khung */}
          {/*
          làm croll bằng :
          .max-h-72       //giới hạn chiều cao scroll
          .overflow-y-auto  //  nếu nội dung bị tràn ra ngoài kích thước thì biến phần thừa thành croll nội bộ

           */}
          <SectionCard title="Lịch sử trạng thái">
            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
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
          </SectionCard>
        </div>

        {/* CỘT PHẢI (rail dính): thông tin + hành động nhanh */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Thông tin */}
          <SectionCard title="Thông tin">
            <dl className="space-y-2 text-sm">
              {infoRows
                .filter((r) => r.value)
                .map((r) => (
                  <div key={r.label} className="flex justify-between gap-3">
                    <dt className="shrink-0 text-gray-500">{r.label}</dt>
                    <dd className="text-right text-gray-900">{r.value}</dd>
                  </div>
                ))}
            </dl>
          </SectionCard>

          {/* Đổi trạng thái */}
          <SectionCard title="Đổi trạng thái">
            {allowed.length === 0 ? (
              <p className="text-sm text-gray-500">Trạng thái cuối — không thể chuyển tiếp.</p>
            ) : (
              <div className="space-y-3">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as ApplicationStatus | '')}
                  className={selectClass}
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
                  className={selectClass}
                />
                <Button onClick={submitStatus} disabled={!newStatus || isChanging} className="w-full">
                  {isChanging ? 'Đang lưu...' : 'Cập nhật'}
                </Button>
                {statusError && <p className="text-sm text-red-600">Đổi trạng thái thất bại.</p>}
              </div>
            )}
          </SectionCard>

          {/* CV ứng tuyển */}
          <SectionCard title="CV ứng tuyển">
            <select
              value={app.cvVersionId ?? ''}
              onChange={handleCvChange}
              disabled={isLinkingCv}
              className={selectClass}
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
          </SectionCard>

          {/* Nhắc nhở */}
          <ReminderSection applicationId={appId} />
        </div>
      </div>
    </div>
  );
}

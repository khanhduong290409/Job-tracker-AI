import { createPortal } from 'react-dom';
import { FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/query-states';
import { useSidebarSlot } from '@/components/layout/sidebar-slot';
import { useDeleteCv, useCvList, useSetDefaultCv } from '../api/queries';
import { CvCard } from '../components/CvCard';
import { UploadCvForm } from '../components/UploadCvForm';

export function CvListPage() {
  const { data: cvList, isLoading, isError, refetch } = useCvList();
  const { mutate: setDefault, variables: settingDefaultId, isPending: isSettingDefault } = useSetDefaultCv();
  const { mutate: deleteCv, variables: deletingId, isPending: isDeleting } = useDeleteCv();

  const slot = useSidebarSlot();

  const total = cvList?.length ?? 0;
  const completed = cvList?.filter((c) => c.parseStatus === 'COMPLETED').length ?? 0;
  const failed = cvList?.filter((c) => c.parseStatus === 'FAILED').length ?? 0;
  const defaultCv = cvList?.find((c) => c.defaultCv);

  return (
    <>
      {/* Sidebar theo-trang: tổng quan CV */}
      {slot &&
        createPortal(
          <div className="space-y-6 py-2">
            <section>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Tổng quan
              </p>
              <div className="space-y-1">
                <OverviewRow icon={FileText} label="Tổng số CV" value={total} />
                <OverviewRow icon={CheckCircle2} label="Đã phân tích" value={completed} tone="text-green-600" />
                <OverviewRow icon={AlertCircle} label="Thất bại" value={failed} tone="text-red-600" />
              </div>
            </section>

            {defaultCv && (
              <section>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  CV mặc định
                </p>
                <div className="mx-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
                  {defaultCv.label}
                </div>
              </section>
            )}
          </div>,
          slot,
        )}

      <div className="mx-auto max-w-5xl px-6 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Quản lý CV</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {total > 0 ? `${total} CV đã lưu` : 'Tải lên CV để bắt đầu phân tích'}
          </p>
        </div>

        <div className="mt-6">
          <UploadCvForm />
        </div>

        <div className="mt-8">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Danh sách CV</h2>

          {isLoading && <LoadingState />}

          {isError && (
            <ErrorState message="Không thể tải danh sách CV. Thử lại sau." onRetry={refetch} />
          )}

          {!isLoading && !isError && cvList?.length === 0 && (
            <EmptyState message="Chưa có CV nào. Tải lên CV đầu tiên của bạn!" />
          )}

          {cvList && cvList.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {cvList.map((cv) => (
                <CvCard
                  key={cv.id}
                  cv={cv}
                  onSetDefault={setDefault}
                  onDelete={deleteCv}
                  // Chỉ show loading trên card đang được mutate, card khác giữ nguyên.
                  isSettingDefault={isSettingDefault && settingDefaultId === cv.id}
                  isDeleting={isDeleting && deletingId === cv.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function OverviewRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 text-sm">
      <Icon className={`h-4 w-4 ${tone ?? 'text-gray-400'}`} />
      <span className="text-gray-600">{label}</span>
      <span className="ml-auto font-semibold text-gray-900">{value}</span>
    </div>
  );
}

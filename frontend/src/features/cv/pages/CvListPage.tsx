import { EmptyState, ErrorState, LoadingState } from '@/components/ui/query-states';
import { useDeleteCv, useCvList, useSetDefaultCv } from '../api/queries';
import { CvCard } from '../components/CvCard';
import { UploadCvForm } from '../components/UploadCvForm';

export function CvListPage() {
  const { data: cvList, isLoading, isError, refetch } = useCvList();
  const { mutate: setDefault, variables: settingDefaultId, isPending: isSettingDefault } = useSetDefaultCv();
  const { mutate: deleteCv, variables: deletingId, isPending: isDeleting } = useDeleteCv();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Quản lý CV</h1>

      <div className="mt-6">
        <UploadCvForm />
      </div>

      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Danh sách CV{cvList && cvList.length > 0 ? ` (${cvList.length})` : ''}
        </h2>

        {isLoading && <LoadingState />}

        {isError && (
          <ErrorState message="Không thể tải danh sách CV. Thử lại sau." onRetry={refetch} />
        )}

        {!isLoading && !isError && cvList?.length === 0 && (
          <EmptyState message="Chưa có CV nào. Tải lên CV đầu tiên của bạn!" />
        )}

        {cvList && cvList.length > 0 && (
          <div className="space-y-3">
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
  );
}

import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/query-states';
import { useToast } from '@/components/ui/toast';
import { useCv, useReparseCv, useUpdateParsedData } from '../api/queries';
import { CvParseStatusBadge } from '../components/CvParseStatusBadge';
import { CvParsedDataEditor } from '../components/CvParsedDataEditor';

export function CvDetailPage() {
  const { id } = useParams<{ id: string }>();
  const cvId = Number(id);
  const toast = useToast();

  const { data: cv, isLoading, isError } = useCv(cvId);
  const { mutate: updateParsedData, isPending: isSaving, error: saveError } = useUpdateParsedData(cvId);
  const { mutate: reparse, isPending: isReparsing } = useReparseCv(cvId);

  if (Number.isNaN(cvId)) {
    return <PageShell>CV không hợp lệ.</PageShell>;
  }
  if (isLoading) {
    return (
      <PageShell>
        <LoadingState />
      </PageShell>
    );
  }
  if (isError || !cv) {
    return <PageShell>Không tìm thấy CV này.</PageShell>;
  }

  const isParsing = cv.parseStatus === 'PENDING' || cv.parseStatus === 'PROCESSING';

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <BackLink />

      {/* Header */}
      <div className="mt-3 flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <FileText className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-gray-900">{cv.label}</h1>
            <CvParseStatusBadge status={cv.parseStatus} />
          </div>
          <p className="mt-0.5 truncate text-sm text-gray-500">{cv.fileName}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cột trái: PDF */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <iframe src={cv.fileUrl} title="CV PDF" className="h-[600px] w-full" />
          </div>
          <a
            href={cv.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            Mở PDF trong tab mới ↗
          </a>
        </div>

        {/* Cột phải: dữ liệu parse */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          {isParsing ? (
            <p className="text-sm text-gray-500">Đang phân tích CV bằng AI... (tự cập nhật)</p>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Dữ liệu CV</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isReparsing}
                  onClick={() =>
                    reparse(undefined, {
                      onSuccess: () => toast.success('Đã gửi yêu cầu phân tích lại — AI đang xử lý'),
                      onError: () => toast.error('Không gửi được yêu cầu phân tích — thử lại'),
                    })
                  }
                >
                  {isReparsing ? 'Đang gửi...' : 'Phân tích lại bằng AI'}
                </Button>
              </div>

              {cv.parseStatus === 'FAILED' && (
                <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                  Phân tích AI thất bại{cv.parseError ? `: ${cv.parseError}` : ''}. Bạn có thể nhập tay bên dưới
                  hoặc bấm "Phân tích lại bằng AI".
                </p>
              )}

              {/* key theo updatedAt: reparse xong / lưu xong → data đổi → remount editor với data mới */}
              <CvParsedDataEditor
                key={cv.updatedAt}
                parsedData={cv.parsedData}
                onSave={(data) =>
                  updateParsedData(data, {
                    onSuccess: () => toast.success('Đã lưu dữ liệu CV'),
                  })
                }
                isSaving={isSaving}
                saveError={saveError}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/cv" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
      <ArrowLeft className="h-4 w-4" />
      Quay lại danh sách CV
    </Link>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      <BackLink />
      {/* div (không phải p) để chứa được cả text lẫn LoadingState (div) mà vẫn hợp lệ HTML */}
      <div className="mt-4 text-sm text-gray-600">{children}</div>
    </div>
  );
}

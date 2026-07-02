import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCv, useReparseCv, useUpdateParsedData } from '../api/queries';
import { CvParseStatusBadge } from '../components/CvParseStatusBadge';
import { CvParsedDataEditor } from '../components/CvParsedDataEditor';

export function CvDetailPage() {
  const { id } = useParams<{ id: string }>();
  const cvId = Number(id);

  const { data: cv, isLoading, isError } = useCv(cvId);
  const { mutate: updateParsedData, isPending: isSaving, error: saveError } = useUpdateParsedData(cvId);
  const { mutate: reparse, isPending: isReparsing } = useReparseCv(cvId);

  if (Number.isNaN(cvId)) {
    return <PageShell>CV không hợp lệ.</PageShell>;
  }
  if (isLoading) {
    return <PageShell>Đang tải...</PageShell>;
  }
  if (isError || !cv) {
    return <PageShell>Không tìm thấy CV này.</PageShell>;
  }

  const isParsing = cv.parseStatus === 'PENDING' || cv.parseStatus === 'PROCESSING';

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/cv" className="text-sm text-blue-600 hover:underline">
        ← Quay lại danh sách CV
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{cv.label}</h1>
        <CvParseStatusBadge status={cv.parseStatus} />
      </div>
      <p className="mt-1 text-sm text-gray-500">{cv.fileName}</p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Cột trái: PDF */}
        <div className="lg:sticky lg:top-4 lg:self-start">
          <iframe
            src={cv.fileUrl}
            title="CV PDF"
            className="h-[600px] w-full rounded-md border border-gray-200"
          />
          <a
            href={cv.fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm text-blue-600 hover:underline"
          >
            Mở PDF trong tab mới ↗
          </a>
        </div>

        {/* Cột phải: dữ liệu parse */}
        <div>
          {isParsing ? (
            <p className="text-sm text-gray-500">Đang phân tích CV bằng AI... (tự cập nhật)</p>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Dữ liệu CV</h2>
                <Button type="button" variant="outline" size="sm" onClick={() => reparse()} disabled={isReparsing}>
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
                onSave={(data) => updateParsedData(data)}
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

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/cv" className="text-sm text-blue-600 hover:underline">
        ← Quay lại danh sách CV
      </Link>
      <p className="mt-4 text-sm text-gray-600">{children}</p>
    </div>
  );
}

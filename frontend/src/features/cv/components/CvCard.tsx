import { Button } from '@/components/ui/button';
import type { CvVersion } from '../types';
import { CvParseStatusBadge } from './CvParseStatusBadge';

interface CvCardProps {
  cv: CvVersion;
  onSetDefault: (id: number) => void;
  onDelete: (id: number) => void;
  isSettingDefault: boolean;
  isDeleting: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;//bytes < 1 MB  →  chia 1024 → hiện "X KB"
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CvCard({ cv, onSetDefault, onDelete, isSettingDefault, isDeleting }: CvCardProps) {
  const isBusy = isSettingDefault || isDeleting;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-gray-900">{cv.label}</h3>
            {cv.defaultCv && (
              <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                Mặc định
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-gray-500">
            {cv.fileName} · {formatFileSize(cv.fileSize)}
          </p>
          <div className="mt-2">
            <CvParseStatusBadge status={cv.parseStatus} />
            {cv.parseStatus === 'FAILED' && cv.parseError && (
              <p className="mt-1 text-xs text-red-600">{cv.parseError}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          {!cv.defaultCv && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSetDefault(cv.id)}
              disabled={isBusy}
            >
              Đặt mặc định
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(cv.id)}
            disabled={isBusy}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            Xóa
          </Button>
        </div>

      </div>
    </div>
  );
}

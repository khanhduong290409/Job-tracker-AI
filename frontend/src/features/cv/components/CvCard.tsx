import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
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

/*
\. — dấu chấm thật (escape dấu . vì trong regex . mặc định nghĩa là "bất kỳ ký tự nào").
pdf — chuỗi ký tự "pdf".
$ — biểu thị cuối chuỗi (end of string) → nghĩa là .pdf phải nằm ở cuối chuỗi thì mới khớp.
i — flag "ignore case", tức là không phân biệt hoa/thường (.PDF, .Pdf, .pdf đều khớp).
Mục đích là để chuyển url từ cloudinary trở thành url có thể hiển thị ảnh thumbnail được
*/
function pdfThumbUrl(fileUrl: string): string | null {
  if (!fileUrl.includes('/image/upload/')) return null;
  return fileUrl
    .replace('/image/upload/', '/image/upload/pg_1,w_400,h_520,c_fill,q_auto/')
    .replace(/\.pdf$/i, '.jpg');
}


export function CvCard({ cv, onSetDefault, onDelete, isSettingDefault, isDeleting }: CvCardProps) {
  const isBusy = isSettingDefault || isDeleting;
  const [thumbFailed, setThumbFailed] = useState(false);
  const thumb = pdfThumbUrl(cv.fileUrl);
  const showThumb = thumb && !thumbFailed;

  return (
    <div className="flex flex-col rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start gap-3">
        {/* Thumbnail trang đầu PDF, hoặc icon nếu không có/lỗi */}
        {showThumb ? (
          <Link to={`/cv/${cv.id}`} className="shrink-0">
            <img
              src={thumb}
              alt=""
              onError={() => setThumbFailed(true)}
              className="h-20 w-16 rounded-lg border bg-gray-50 object-cover object-top"
            />
          </Link>
        ) : (
          <span className="grid h-20 w-16 shrink-0 place-items-center rounded-lg border bg-primary/5 text-primary">
            <FileText className="h-6 w-6" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              to={`/cv/${cv.id}`}
              className="truncate font-semibold text-gray-900 hover:text-primary hover:underline"
            >
              {cv.label}
            </Link>
            {cv.defaultCv && (
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                Mặc định
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm text-gray-500">
            {cv.fileName} · {formatFileSize(cv.fileSize)}
          </p>
          <div className="mt-2">
            <CvParseStatusBadge status={cv.parseStatus} />
            {cv.parseStatus === 'FAILED' && cv.parseError && (
              <p className="mt-1 text-xs text-red-600">{cv.parseError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Chân card: hành động */}
      <div className="mt-4 flex justify-end gap-2 border-t pt-3">
        {!cv.defaultCv && (
          <Button variant="outline" size="sm" onClick={() => onSetDefault(cv.id)} disabled={isBusy}>
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
  );
}

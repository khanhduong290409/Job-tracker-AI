import { cn } from '@/lib/utils';
import type { CvParseStatus } from '@/types/common';

interface CvParseStatusBadgeProps {
  status: CvParseStatus;
}

// Record<CvParseStatus, ...> đảm bảo compile error nếu thêm status mới mà quên thêm config.
const STATUS_CONFIG: Record<CvParseStatus, { label: string; className: string }> = {
  PENDING:    { label: 'Chờ xử lý',     className: 'bg-gray-100 text-gray-600' },
  PROCESSING: { label: 'Đang xử lý...', className: 'bg-amber-100 text-amber-700' },
  COMPLETED:  { label: 'Hoàn thành',    className: 'bg-green-100 text-green-700' },
  FAILED:     { label: 'Thất bại',      className: 'bg-red-100 text-red-700' },
};

export function CvParseStatusBadge({ status }: CvParseStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Bộ 3 trạng thái dùng chung cho các trang đọc dữ liệu qua React Query:
 * loading / error (kèm nút Thử lại) / empty.
 *
 * Gom về 1 chỗ để mọi trang hiển thị nhất quán, thay cho việc mỗi trang tự viết
 * <p>Đang tải...</p> / <p class="text-red-600">lỗi</p> mỗi nơi một kiểu (dễ trôi lệch dần).
 */

export function LoadingState({ label = 'Đang tải...' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({
  message = 'Đã có lỗi xảy ra. Thử lại sau.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void; // truyền query.refetch để thử lại tại chỗ, không cần F5 cả trang
}) {
  return (
    <div className="flex flex-col items-start gap-2 py-8">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-sm text-gray-500">{message}</p>;
}

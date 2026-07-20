import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/query-states';
import { useSidebarSlot } from '@/components/layout/sidebar-slot';
import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/types/common';
import { useApplications } from '../api/queries';
import { ApplicationCard } from '../components/ApplicationCard';
import { ApplicationsSidebar } from '../components/ApplicationsSidebar';
import type { ApplicationListParams } from '../types';

const PAGE_SIZE = 10;

export function ApplicationListPage() {
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState<ApplicationStatus | ''>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState(''); // search đã "submit" — tách với input để không refetch mỗi keystroke

  const params: ApplicationListParams = {
    page,
    size: PAGE_SIZE,
    statuses: status ? [status] : undefined,
    search: search || undefined,
  };

  const { data, isLoading, isError, isFetching, refetch } = useApplications(params);

  // Query đếm (read-only, thêm mới): lấy toàn bộ đơn để đếm theo trạng thái cho sidebar.
  const { data: allData } = useApplications({ page: 0, size: 200 });
  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<
      ApplicationStatus,
      number
    >;
    for (const a of allData?.items ?? []) counts[a.status] += 1;
    return counts;
  }, [allData]);//useMemo cache kết quả, chỉ tính lại khi allData thay đổi
  const totalCount = allData?.pagination.totalElements ?? 0;

  // Đổi filter → quay về trang đầu (tránh ở trang 3 nhưng filter mới chỉ có 1 trang)
  function handleStatusChange(value: ApplicationStatus | '') {
    setStatus(value);
    setPage(0);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  }

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  const slot = useSidebarSlot();

  return (
    <>
      {/* Sidebar theo-trang: bơm vào cột sidebar toàn cục của ProtectedLayout */}
      {slot &&
        createPortal(
          <ApplicationsSidebar
            total={totalCount}
            statusCounts={statusCounts}
            activeStatus={status}
            onSelect={handleStatusChange}
          />,
          slot,
        )}
      {/* tức là bởi vì dùng sidebar của protectedlayout nhưng vì sidebar là cố định
      nên dùng createportal để render applicationsidebar vào sidebar vào protectedlayout
      tức là applicationsidebar được render từ trang này nhưng mà vì sidebar là cố định
      nên dùng createportal để mỗi khi đến trang này thì sidebar lại hiển thị thêm applicationsidebar
      còn mấy trang khác thì không hiện đoạn này*/}

      <div className="mx-auto max-w-5xl px-6 py-6">
        {/* Header: tiêu đề + đếm bên trái, search + tạo đơn bên phải */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Đơn ứng tuyển</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              {totalCount} đơn trong hành trình của bạn
            </p>
          </div>

          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm công ty / vị trí..."
                className="h-10 w-56 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </form>
            <NotificationBell />
            <Button asChild>
              <Link to="/applications/new">+ Tạo đơn mới</Link>
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="mt-6">
          {isLoading && <LoadingState />}

          {isError && (
            <ErrorState message="Không thể tải danh sách. Thử lại sau." onRetry={refetch} />
          )}

          {!isLoading && !isError && items.length === 0 && (
            <EmptyState
              message={
                search || status
                  ? 'Không có đơn nào khớp bộ lọc.'
                  : 'Chưa có đơn ứng tuyển nào. Tạo đơn đầu tiên!'
              }
            />
          )}

          {items.length > 0 && (
            <div className={cn('space-y-4', isFetching && 'opacity-60')}>
              {items.map((app) => (
                <ApplicationCard key={app.id} application={app} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrevious}
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
            >
              Trước
            </Button>
            <span className="text-sm text-gray-500">
              Trang {pagination.page + 1} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Sau
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

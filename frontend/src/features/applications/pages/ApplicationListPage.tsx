import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/query-states';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/types/common';
import { useApplications } from '../api/queries';
import { ApplicationCard } from '../components/ApplicationCard';
import { APPLICATION_STATUS_CONFIG } from '../status-meta';
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

  // Đổi filter → quay về trang đầu (tránh ở trang 3 nhưng filter mới chỉ có 1 trang)
  function handleStatusChange(value: string) {
    setStatus(value as ApplicationStatus | '');
    setPage(0);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(0);
  }

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Đơn ứng tuyển</h1>
        <Button asChild>
          <Link to="/applications/new">+ Tạo đơn mới</Link>
        </Button>
      </div>

      {/* Filter */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="h-9 rounded-md border border-gray-300 px-3 text-sm"
        >
          <option value="">Tất cả trạng thái</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPLICATION_STATUS_CONFIG[s].label}
            </option>
          ))}
        </select>

        <form onSubmit={handleSearchSubmit} className="flex flex-1 gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo công ty / vị trí..."
            className="h-9 flex-1 rounded-md border border-gray-300 px-3 text-sm"
          />
          <Button type="submit" variant="outline" size="sm">
            Tìm
          </Button>
        </form>
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
          <div className={isFetching ? 'space-y-3 opacity-60' : 'space-y-3'}>
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
  );
}

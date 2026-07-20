import { ClipboardList, Clock, Target, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { APPLICATION_STATUSES, type ApplicationStatus } from '@/types/common';
import { APPLICATION_STATUS_CONFIG } from '../status-meta';

// Chấm màu cạnh mỗi trạng thái trong list filter (đặc, không phải nền nhạt như badge).
const STATUS_DOT: Record<ApplicationStatus, string> = {
  SAVED: 'bg-gray-400',
  APPLIED: 'bg-blue-500',
  PHONE_SCREEN: 'bg-indigo-500',
  TECHNICAL_INTERVIEW: 'bg-purple-500',
  ONSITE: 'bg-violet-500',
  OFFER: 'bg-amber-500',
  ACCEPTED: 'bg-green-500',
  REJECTED: 'bg-red-500',
  WITHDRAWN: 'bg-gray-400',
};

interface ApplicationsSidebarProps {
  total: number;
  statusCounts: Record<ApplicationStatus, number>;
  activeStatus: ApplicationStatus | '';
  onSelect: (status: ApplicationStatus | '') => void;
}

export function ApplicationsSidebar({
  total,
  statusCounts,
  activeStatus,
  onSelect,
}: ApplicationsSidebarProps) {
  const sum = (keys: ApplicationStatus[]) => keys.reduce((n, k) => n + (statusCounts[k] ?? 0), 0);

  // Nhóm chỉ số tổng quan (định nghĩa: chờ phản hồi = còn trong pipeline; cơ hội = offer/nhận; đóng = từ chối/rút).
  const overview = [
    { label: 'Tổng đơn', value: total, icon: ClipboardList, bar: 'bg-primary' },
    {
      label: 'Chờ phản hồi',
      value: sum(['SAVED', 'APPLIED', 'PHONE_SCREEN', 'TECHNICAL_INTERVIEW', 'ONSITE']),
      icon: Clock,
      bar: 'bg-blue-500',
    },
    { label: 'Có cơ hội', value: sum(['OFFER', 'ACCEPTED']), icon: Target, bar: 'bg-green-500' },
    { label: 'Đã đóng', value: sum(['REJECTED', 'WITHDRAWN']), icon: Archive, bar: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-6 py-2">
      {/* ── Tổng quan ── */}
      <section>
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Tổng quan
        </p>
        <div className="space-y-3">
          {overview.map(({ label, value, icon: Icon, bar }) => (
            <div key={label} className="px-2">
              <div className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{label}</span>
                <span className="ml-auto font-semibold text-gray-900">{value}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={cn('h-full rounded-full', bar)}
                  style={{ width: total > 0 ? `${(value / total) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trạng thái (filter) ── */}
      <section>
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Trạng thái
        </p>
        <ul className="space-y-0.5">
          <FilterRow
            label="Tất cả"
            count={total}
            active={activeStatus === ''}
            onClick={() => onSelect('')}
          />
          {APPLICATION_STATUSES.map((s) => (
            <FilterRow
              key={s}
              label={APPLICATION_STATUS_CONFIG[s].label}
              count={statusCounts[s] ?? 0}
              dotClass={STATUS_DOT[s]}
              active={activeStatus === s}
              onClick={() => onSelect(s)}
            />
          ))}
        </ul>
      </section>
    </div>
  );
}

interface FilterRowProps {
  label: string;
  count: number;
  dotClass?: string;
  active: boolean;
  onClick: () => void;
}

function FilterRow({ label, count, dotClass, active, onClick }: FilterRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
          active ? 'bg-primary/10 font-medium text-primary' : 'text-gray-600 hover:bg-gray-100',
        )}
      >
        <span className={cn('h-2 w-2 shrink-0 rounded-full', dotClass ?? 'bg-primary')} />
        <span className="truncate">{label}</span>
        <span className={cn('ml-auto text-xs', active ? 'text-primary' : 'text-gray-400')}>
          {count}
        </span>
      </button>
    </li>
  );
}

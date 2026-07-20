import { ClipboardList, Clock, Target, Percent, Timer } from 'lucide-react';
import { useOverview } from '../api/queries';

/**
 * US-ANALYTICS-001 — dải ô số tổng quan đầu trang Analytics.
 * Tự fetch qua useOverview (mỗi section trên trang độc lập, có loading/lỗi riêng).
 *
 * 5 chỉ số: tổng đơn · đang theo dõi · số offer · tỉ lệ offer · thời gian phản hồi TB.
 * Trong đó "tổng đơn" và "số offer" kèm mức chênh so tháng trước (comparedToLastMonth).
 */

// Chuỗi so-tháng backend gửi sẵn dấu ("+15%", "-1", "0"). Tô màu theo dấu đầu chuỗi.
function deltaColor(delta: string): string {
  if (delta.startsWith('+')) return 'text-green-600';
  if (delta.startsWith('-')) return 'text-red-600';
  return 'text-gray-400';
}

interface StatCardProps {
  label: string;
  value: string;
  icon: typeof ClipboardList;
  iconClass: string; // màu icon + nền chip (VD "bg-primary/10 text-primary")
  delta?: string; // mức chênh so tháng trước, chỉ ô nào có mới truyền
}

function StatCard({ label, value, icon: Icon, iconClass, delta }: StatCardProps) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {delta !== undefined && (
        <p className={`mt-1 text-xs ${deltaColor(delta)}`}>{delta} so với tháng trước</p>
      )}
    </div>
  );
}

export function OverviewCards() {
  const { data, isLoading, isError } = useOverview();

  if (isLoading) {
    // 5 ô xám nhấp nháy giữ đúng layout khi đang tải.
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-100" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Không tải được số liệu tổng quan.
      </div>
    );
  }

  const offerRatePercent = `${Math.round(data.offerRate * 100)}%`;
  const avgResponse =
    data.avgResponseTimeDays == null ? '—' : `${data.avgResponseTimeDays.toFixed(1)} ngày`;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
      <StatCard
        label="Tổng số đơn"
        value={String(data.totalApplications)}
        icon={ClipboardList}
        iconClass="bg-primary/10 text-primary"
        delta={data.comparedToLastMonth.applications}
      />
      <StatCard
        label="Đang theo dõi"
        value={String(data.activeApplications)}
        icon={Clock}
        iconClass="bg-blue-100 text-blue-600"
      />
      <StatCard
        label="Số offer"
        value={String(data.totalOffers)}
        icon={Target}
        iconClass="bg-green-100 text-green-600"
        delta={data.comparedToLastMonth.offers}
      />
      <StatCard
        label="Tỉ lệ offer"
        value={offerRatePercent}
        icon={Percent}
        iconClass="bg-amber-100 text-amber-600"
      />
      <StatCard
        label="Phản hồi trung bình"
        value={avgResponse}
        icon={Timer}
        iconClass="bg-cyan-100 text-cyan-600"
      />
    </div>
  );
}

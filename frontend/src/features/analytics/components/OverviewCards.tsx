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
  delta?: string; // mức chênh so tháng trước, chỉ ô nào có mới truyền
}

function StatCard({ label, value, delta }: StatCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
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
        delta={data.comparedToLastMonth.applications}
      />
      <StatCard label="Đang theo dõi" value={String(data.activeApplications)} />
      <StatCard
        label="Số offer"
        value={String(data.totalOffers)}
        delta={data.comparedToLastMonth.offers}
      />
      <StatCard label="Tỉ lệ offer" value={offerRatePercent} />
      <StatCard label="Phản hồi trung bình" value={avgResponse} />
    </div>
  );
}

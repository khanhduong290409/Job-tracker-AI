import { OverviewCards } from '../components/OverviewCards';
import { TimeSeriesChart } from '../components/TimeSeriesChart';
import { FunnelChart } from '../components/FunnelChart';
import { SourcesChart } from '../components/SourcesChart';
import { ActivityHeatmap } from '../components/ActivityHeatmap';

/**
 * Trang Phân tích — gộp 5 section analytics (US-001..006, trừ 005 defer).
 * Mỗi section tự fetch + tự lo loading/lỗi → trang chỉ xếp bố cục, không giữ state chung.
 * Rộng hơn các trang khác (max-w-6xl) vì chứa chart + heatmap 1 năm.
 */
export function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900">Phân tích</h1>

      <div className="mt-6 space-y-6">
        <OverviewCards />
        <TimeSeriesChart />
        <div className="grid gap-6 lg:grid-cols-2">
          <FunnelChart />
          <SourcesChart />
        </div>
        <ActivityHeatmap />
      </div>
    </div>
  );
}

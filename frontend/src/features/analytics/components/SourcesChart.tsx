import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ApplicationSource } from '@/types/common';
import { useSources } from '../api/queries';

/**
 * US-ANALYTICS-004 — hiệu quả theo nguồn ứng tuyển (LinkedIn, ITviec...).
 *
 * Bar ngang: độ dài = tổng đơn từ nguồn đó (backend đã sort giảm dần theo count). offers +
 * conversionRate (offers/count) hiện trong tooltip — KHÔNG vẽ trục thứ 2 cho tỉ lệ (tránh
 * dual-axis). 1 hue xanh: bar length đã tải magnitude, nguồn phân biệt bằng nhãn trục Y.
 */

const BAR_COLOR = '#2a78d6';
const AXIS_INK = '#898781';
const GRID_LINE = '#e1e0d9';

// Nhãn tiếng Việt cho enum nguồn (form hiện render enum thô — chưa có map dùng chung).
const SOURCE_LABELS: Record<ApplicationSource, string> = {
  LINKEDIN: 'LinkedIn',
  TOPDEV: 'TopDev',
  ITVIEC: 'ITviec',
  GLASSDOOR: 'Glassdoor',
  COMPANY_WEBSITE: 'Website công ty',
  REFERRAL: 'Giới thiệu',
  OTHER: 'Khác',
};

interface SourceRow {
  label: string;
  count: number;
  offers: number;
  conversionRate: number;
}

function SourcesTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SourceRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-gray-900">{row.label}</p>
      <p className="text-gray-600">{row.count} đơn · {row.offers} offer</p>
      <p className="text-gray-600">Tỉ lệ offer: {Math.round(row.conversionRate * 100)}%</p>
    </div>
  );
}

export function SourcesChart() {
  const { data, isLoading, isError } = useSources();

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-lg border border-gray-200 bg-gray-100" />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Không tải được dữ liệu theo nguồn.
      </div>
    );
  }

  const rows: SourceRow[] = data.sources.map((s) => ({
    label: SOURCE_LABELS[s.source],
    count: s.count,
    offers: s.offers,
    conversionRate: s.conversionRate,
  }));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Hiệu quả theo nguồn</h2>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500">Chưa có đơn nào để thống kê nguồn.</p>
      ) : (
        // Cao theo số nguồn để bar không quá dày/mỏng (mỗi nguồn ~44px, tối thiểu 160px).
        <ResponsiveContainer width="100%" height={Math.max(rows.length * 44, 160)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 8 }}>
            <CartesianGrid horizontal={false} stroke={GRID_LINE} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: AXIS_INK, fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tick={{ fill: AXIS_INK, fontSize: 12 }}
            />
            <Tooltip content={<SourcesTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="count" fill={BAR_COLOR} radius={[0, 4, 4, 0]} barSize={24}>
              <LabelList dataKey="count" position="right" fill="#0b0b0b" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

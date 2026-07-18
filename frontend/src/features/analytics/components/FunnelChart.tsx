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
import { APPLICATION_STATUS_CONFIG } from '@/features/applications/status-meta';
import { useFunnel } from '../api/queries';

/**
 * US-ANALYTICS-002 — phễu tuyển dụng APPLIED → PHONE_SCREEN → TECHNICAL_INTERVIEW → ONSITE → OFFER.
 *
 * Vẽ bằng horizontal bar (không dùng <Funnel> trapezoid của recharts): độ dài thanh = count,
 * dễ đọc số + gắn nhãn hơn. Đây là 1 chuỗi magnitude có thứ tự → dùng MỘT màu xanh cho mọi
 * stage (bar length đã tải magnitude rồi, màu không cần phân biệt) — stage phân biệt bằng nhãn
 * trục Y. conversionRate hiện trong tooltip.
 */

// Palette dataviz (light): series-1 blue cho fill, muted ink cho trục, hairline cho grid.
const BAR_COLOR = '#2a78d6';
const AXIS_INK = '#898781';
const GRID_LINE = '#e1e0d9';

interface FunnelRow {
  label: string;
  count: number;
  conversionRate: number;
}

function FunnelTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: FunnelRow }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-gray-900">{row.label}</p>
      <p className="text-gray-600">{row.count} đơn</p>
      <p className="text-gray-600">Tỉ lệ chuyển: {Math.round(row.conversionRate * 100)}%</p>
    </div>
  );
}

export function FunnelChart() {
  const { data, isLoading, isError } = useFunnel();

  if (isLoading) {
    return <div className="h-72 animate-pulse rounded-lg border border-gray-200 bg-gray-100" />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Không tải được dữ liệu phễu tuyển dụng.
      </div>
    );
  }

  const rows: FunnelRow[] = data.stages.map((s) => ({
    label: APPLICATION_STATUS_CONFIG[s.stage].label,
    count: s.count,
    conversionRate: s.conversionRate,
  }));

  const isEmpty = rows.every((r) => r.count === 0);
  //.every() là method của mảng, dùng để hỏi: "TẤT CẢ phần tử có thỏa điều kiện không?"
  // = true khi tất cả stage đều có count === 0
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Phễu tuyển dụng</h2>

      {isEmpty ? (
        <p className="py-12 text-center text-sm text-gray-500">
          Chưa có đơn nào đi qua các vòng tuyển dụng.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={rows}
            layout="vertical"//"horizontal(nghĩa là ngang)" nhưng thật ra là cột đứng, còn vertical là cột ngang
            margin={{ top: 4, right: 48, bottom: 4, left: 8 }}
          >
            {/* Grid dọc mờ, bỏ đường ngang cho gọn */}
            <CartesianGrid horizontal={false} stroke={GRID_LINE} />
            <XAxis type="number" allowDecimals={false} tick={{ fill: AXIS_INK, fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="label"
              width={150}
              tick={{ fill: AXIS_INK, fontSize: 12 }}
            />
            <Tooltip content={<FunnelTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar dataKey="count" fill={BAR_COLOR} radius={[0, 4, 4, 0]} barSize={24}>
              {/* Direct label: số đơn ở cuối thanh (giá trị chính) */}
              <LabelList dataKey="count" position="right" fill="#0b0b0b" fontSize={12} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

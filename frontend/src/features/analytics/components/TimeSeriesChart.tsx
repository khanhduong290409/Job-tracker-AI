import { useState } from 'react';
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  format,
  parseISO,
} from 'date-fns';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTimeSeries } from '../api/queries';
import type { TimeSeriesInterval, TimeSeriesMetric, TimeSeriesPoint } from '../types';

/**
 * US-ANALYTICS-003 — số đơn (hoặc phỏng vấn) theo thời gian, dạng đường.
 *
 * 2 bộ điều khiển: metric (đơn nộp | phỏng vấn) và interval (ngày | tuần | tháng) giữ trong
 * useState. Đổi lựa chọn → đổi params → useTimeSeries fetch entry cache mới (từ/đến để trống
 * → backend tự lấy 6 tháng gần nhất). 1 đường, 1 màu xanh (chỉ 1 series → không cần legend).
 */

const LINE_COLOR = '#2a78d6';
const AXIS_INK = '#898781';
const GRID_LINE = '#e1e0d9';

const METRIC_OPTIONS: { value: TimeSeriesMetric; label: string }[] = [
  { value: 'applications', label: 'Đơn đã nộp' },
  { value: 'interviews', label: 'Phỏng vấn' },
];

const INTERVAL_OPTIONS: { value: TimeSeriesInterval; label: string }[] = [
  { value: 'day', label: 'Ngày' },
  { value: 'week', label: 'Tuần' },
  { value: 'month', label: 'Tháng' },
];

// period là "yyyy-MM-dd"; nhãn trục gọn theo interval: tháng → MM/yyyy, ngày/tuần → dd/MM.
function formatPeriod(period: string, interval: TimeSeriesInterval): string {
  const date = parseISO(period);//biến đổi một chuỗi ngày dang ISO thành object Date của JavaScript
  return interval === 'month' ? format(date, 'MM/yyyy') : format(date, 'dd/MM');
}
/*
Backend trả period là string, ví dụ "2026-07-17" (định dạng ISO 8601 — yyyy-MM-dd). 2
Nhưng để format lại thành "17/07" hay "07/2026", hàm format() cần một object Date thật, không nhận string. Nên phải chuyển 2 bước:


const date = parseISO(period);              // string "2026-07-17" → Date object
return format(date, 'dd/MM');               // Date → string "17/07"
parseISO("2026-07-17") trả về Date đại diện cho ngày 17/07/2026.
*/

// Backend chỉ trả mốc CÓ dữ liệu → giữa 2 mốc thưa recharts nối thẳng thành đường phẳng gây hiểu lầm
// (VD ở interval "Ngày": 3 đơn ở 3 ngày rời nhau vẽ thành đường phẳng y=1 như "ngày nào cũng có đơn").
// Chèn lại mốc count=0 cho mọi bước trống TRONG khoảng [mốc đầu, mốc cuối] → đường tụt về 0 giữa các đỉnh.
// Chỉ fill phần GIỮA: response không trả from/to nên không biết ranh đầu/cuối thật — mà đó cũng không hiển thị.
function fillGaps(points: TimeSeriesPoint[], interval: TimeSeriesInterval): TimeSeriesPoint[] {
  if (points.length < 2) return points;

  const countByPeriod = new Map(points.map((p) => [p.period, p.count]));
  const start = parseISO(points[0].period);
  const end = parseISO(points[points.length - 1].period);

  // Mốc backend đã bị date_trunc canh sẵn (tuần = thứ 2, tháng = ngày 1) → each* dưới đây khớp mốc.
  const buckets =
    interval === 'day'
      ? eachDayOfInterval({ start, end })
      : interval === 'week'
        ? eachWeekOfInterval({ start, end }, { weekStartsOn: 1 })
        : eachMonthOfInterval({ start, end });

  return buckets.map((date) => {
    const period = format(date, 'yyyy-MM-dd');
    return { period, count: countByPeriod.get(period) ?? 0 };
  });
}

// Nút segmented dùng chung cho cả metric lẫn interval (generic theo kiểu value).
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-gray-200 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded px-3 py-1 text-sm ${
            value === o.value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function TimeSeriesTooltip({
  active,
  payload,
  interval,
}: {
  active?: boolean;
  payload?: Array<{ payload: { period: string; count: number } }>;//mỗi object trong array có đúng 1 field tên payload
  interval: TimeSeriesInterval;//và bên trong payload có thêm 1 object nữa có 2 field period và count
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-gray-900">{formatPeriod(row.period, interval)}</p>
      <p className="text-gray-600">{row.count}</p>
    </div>
  );
}

export function TimeSeriesChart() {
  const [metric, setMetric] = useState<TimeSeriesMetric>('applications');
  const [interval, setInterval] = useState<TimeSeriesInterval>('week');
  const { data, isLoading, isError } = useTimeSeries({ metric, interval });

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Hoạt động theo thời gian</h2>
        <div className="flex flex-wrap gap-2">
          <SegmentedControl options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
          <SegmentedControl options={INTERVAL_OPTIONS} value={interval} onChange={setInterval} />
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
      ) : isError || !data ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Không tải được dữ liệu theo thời gian.
        </div>
      ) : data.points.length === 0 ? (
        <p className="py-12 text-center text-sm text-gray-500">
          Chưa có dữ liệu trong khoảng thời gian này.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={fillGaps(data.points, interval)}
            margin={{ top: 4, right: 16, bottom: 4, left: -16 }}
          >
            <CartesianGrid vertical={false} stroke={GRID_LINE} />
            <XAxis
              dataKey="period"
              tickFormatter={(p: string) => formatPeriod(p, interval)}
              tick={{ fill: AXIS_INK, fontSize: 12 }}
            />
            <YAxis allowDecimals={false} tick={{ fill: AXIS_INK, fontSize: 12 }} />
            <Tooltip content={<TimeSeriesTooltip interval={interval} />} />
            <Line
              type="monotone"
              dataKey="count"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

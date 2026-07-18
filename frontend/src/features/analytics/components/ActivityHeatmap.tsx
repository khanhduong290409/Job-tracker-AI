import { eachDayOfInterval, format, getMonth, startOfWeek, subDays } from 'date-fns';
import { useActivity } from '../api/queries';

/**
 * US-ANALYTICS-006 — heatmap hoạt động 1 năm kiểu GitHub contributions.
 *
 * Backend chỉ trả những NGÀY CÓ hoạt động (count>0) → FE tự dựng lưới đủ 365 ngày gần nhất,
 * tra count qua Map, ngày không có = 0. Cột = tuần (7 ô dọc), tô màu theo bậc số lượng.
 * recharts không hợp heatmap → dùng grid div thuần.
 */

// Sequential blue ramp (palette.md): 0 = xám nhạt (lùi về nền), tăng dần đậm theo số hoạt động.
const EMPTY_COLOR = '#eef1f4';
const LEVELS = [
  { min: 1, color: '#9ec5f4' },
  { min: 3, color: '#5598e7' },
  { min: 5, color: '#2a78d6' },
  { min: 7, color: '#184f95' },
];

function colorFor(count: number): string {
  if (count <= 0) return EMPTY_COLOR;
  let color = LEVELS[0].color;
  for (const level of LEVELS) {
    if (count >= level.min) color = level.color;
  }
  return color;
}

// Chia danh sách ngày thành các tuần 7 ô (bắt đầu từ thứ 2). Ngày đầu đã canh về đầu tuần.
function toWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function ActivityHeatmap() {
  const { data, isLoading, isError } = useActivity({});

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-lg border border-gray-200 bg-gray-100" />;
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Không tải được dữ liệu hoạt động.
      </div>
    );
  }

  // Tra nhanh count theo ngày ("yyyy-MM-dd"). Backend chỉ đưa ngày có hoạt động.
  const countByDate = new Map(data.days.map((d) => [d.date, d.count]));//tạo map có key-value cho ngày và count

  const end = new Date();//hôm nay, subday(end, 364) -> lấy hôm nay - 364(1 năm)
  const start = startOfWeek(subDays(end, 364), { weekStartsOn: 1 });//đầu tuần (weekstartOn:1 -> đầu tuần thứ 2 còn nếu 0 thì là chủ nhật)
  const weeks = toWeeks(eachDayOfInterval({ start, end }));//eachDayOfInterval({ start, end }) -> trả về tất cả các này từ start đến end

  // Nhãn tháng cho mỗi cột: chỉ hiện khi tháng khác tuần liền trước (tháng tăng đơn điệu
  // qua các tuần → so với tuần trước là đủ, không cần biến closure gán lại lúc render).
  const monthLabels = weeks.map((week, i) => {
    const month = getMonth(week[0]);//week[0] -> lấy ngày đầu tiên trong tuần -> tức là thứ 2,getMonth lấy tháng chứa ngày đó 
    const prevMonth = i > 0 ? getMonth(weeks[i - 1][0]) : -1;// weeks[i - 1][0] -> [i - 1] -> tuần trước tuần hiện tại, [0] -> phần tử đầu của tuần đó
    return month !== prevMonth ? `Th${month + 1}` : ''; // câu trên mục đích là lấy tháng của tuần trước
  });//mục đích là nếu tháng tuần này # tháng tuần trước đó thì hiển thị nhãn còn ko thì không hiển thị

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Hoạt động 1 năm qua</h2>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          {/* Hàng nhãn tháng — text tràn phải qua các ô trống (như GitHub) */}
          <div className="flex gap-1 text-xs text-gray-400">
            {monthLabels.map((label, i) => (
              <div key={i} className="w-3 whitespace-nowrap">
                {label}
              </div>
            ))}
          </div>

          {/* Lưới: mỗi cột 1 tuần, mỗi ô 1 ngày */}
          <div className="flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const count = countByDate.get(key) ?? 0;
                  return (
                    <div
                      key={key}
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: colorFor(count) }}
                      title={`${format(day, 'dd/MM/yyyy')}: ${count} lần đổi trạng thái`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chú thích bậc màu */}
      <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
        <span>Ít</span>
        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: EMPTY_COLOR }} />
        {LEVELS.map((level) => (
          <div
            key={level.min}
            className="h-3 w-3 rounded-sm"
            style={{ backgroundColor: level.color }}
          />
        ))}
        <span>Nhiều</span>
      </div>
    </div>
  );
}

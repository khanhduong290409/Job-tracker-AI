import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import type { ApiResponse } from '@/types/api';
import { useCvJdMatch, useReanalyzeMatch } from '../api/queries';
import type { CvJdMatch } from '../types';

interface Props {
  applicationId: number;
}

const RECOMMENDATION_LABELS: Record<string, string> = {
  STRONG_FIT: 'Rất phù hợp',
  GOOD_FIT: 'Phù hợp tốt',
  FAIR_FIT: 'Tạm phù hợp',
  WEAK_FIT: 'Ít phù hợp',
};

// Đọc lỗi từ AxiosError → message hướng dẫn. Phân biệt 400 (thiếu CV parse) vs 503 (AI down).
function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const apiMsg = (error.response?.data as ApiResponse<unknown> | undefined)?.error?.message;
    if (status === 400) {
      return apiMsg ?? 'Cần một CV đã phân tích (parse xong) gắn với đơn này để so khớp.';
    }
    if (status === 503) {
      return 'AI đang quá tải, vui lòng thử lại sau ít phút.';
    }
  }
  return 'Phân tích thất bại, vui lòng thử lại.';
}

function scoreColor(score: number | null): string {
  if (score == null) return 'text-gray-400';
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

/**
 * Khối "Độ khớp CV–JD (AI)" trong trang chi tiết application.
 * Lazy như JdInsightSection; thêm nút "Phân tích lại" (force=true) khi đã có kết quả.
 */
export function AiMatchCard({ applicationId }: Props) {
  const [enabled, setEnabled] = useState(false);
  const { data, isError, error, isFetching, refetch } = useCvJdMatch(applicationId, enabled);
  const { mutate: reanalyze, isPending: isReanalyzing } = useReanalyzeMatch(applicationId);

  function analyze() {
    if (!enabled) setEnabled(true);
    else refetch();
  }

  const busy = isFetching || isReanalyzing;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">Độ khớp CV–JD (AI)</h2>
        {data ? (
          <Button size="sm" variant="outline" onClick={() => reanalyze()} disabled={busy}>
            {isReanalyzing ? 'Đang phân tích...' : 'Phân tích lại'}
          </Button>
        ) : (
          <Button size="sm" onClick={analyze} disabled={busy}>
            {isFetching ? 'Đang phân tích...' : 'Phân tích độ khớp'}
          </Button>
        )}
      </div>

      {!enabled && (
        <p className="mt-2 text-sm text-gray-500">
          So khớp CV mặc định với JD này, chấm điểm và gợi ý cải thiện.
        </p>
      )}

      {isError && <p className="mt-3 text-sm text-red-600">{describeError(error)}</p>}

      {data && <MatchView match={data} />}
    </div>
  );
}

// ── Render kết quả ─────────────────────────────────────────────────────────────

function MatchView({ match }: { match: CvJdMatch }) {
  const bd = match.scoreBreakdown;
  const recoLabel = match.recommendation
    ? (RECOMMENDATION_LABELS[match.recommendation] ?? match.recommendation)
    : null;

  return (
    <div className="mt-4 space-y-4 text-sm">
      {/* Điểm tổng + đề xuất */}
      <div className="flex items-end gap-3">
        <span className={`text-4xl font-bold ${scoreColor(match.matchScore)}`}>
          {match.matchScore ?? '—'}
        </span>
        <span className="text-gray-500">/ 100</span>
        {recoLabel && (
          <span className="ml-auto rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            {recoLabel}
          </span>
        )}
      </div>

      {/* Breakdown */}
      {bd && (
        <div className="space-y-2">
          <ScoreBar label="Kỹ năng chuyên môn" value={bd.technicalSkills} />
          <ScoreBar label="Kinh nghiệm" value={bd.experience} />
          <ScoreBar label="Học vấn" value={bd.education} />
          <ScoreBar label="Soft skills" value={bd.softSkills} />
        </div>
      )}

      {match.overallAssessment && (
        <p className="whitespace-pre-wrap text-gray-700">{match.overallAssessment}</p>
      )}

      <BulletGroup title="Điểm mạnh" items={match.strengths ?? []} color="text-green-700" />
      <BulletGroup title="Còn thiếu" items={match.gaps ?? []} color="text-red-700" />
      <BulletGroup title="Gợi ý cải thiện" items={match.suggestions ?? []} color="text-blue-700" />

      <ChipGroup
        title="Từ khóa khớp"
        chips={match.matchedKeywords ?? []}
        className="bg-green-50 text-green-700"
      />
      <ChipGroup
        title="Từ khóa thiếu"
        chips={match.missingKeywords ?? []}
        className="bg-red-50 text-red-700"
      />
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span>{value == null ? '—' : `${v}/100`}</span>
      </div>
      <div className="mt-0.5 h-1.5 w-full rounded-full bg-gray-100">
        <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

function BulletGroup({ title, items, color }: { title: string; items: string[]; color: string }) {
  const list = items.filter(Boolean);
  if (list.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-gray-500">{title}</h3>
      <ul className={`mt-1 list-disc space-y-0.5 pl-5 ${color}`}>
        {list.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function ChipGroup({
  title,
  chips,
  className,
}: {
  title: string;
  chips: string[];
  className: string;
}) {
  const list = chips.filter(Boolean);
  if (list.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-gray-500">{title}</h3>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {list.map((c, i) => (
          <span key={`${c}-${i}`} className={`rounded-full px-2.5 py-0.5 text-xs ${className}`}>
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}


/*
unknown là một type trong TypeScript — nghĩa là "không biết kiểu gì cả". Nó là phiên bản an toàn của any.

Tại sao dùng unknown ở đây?

Hàm describeError nhận lỗi từ khối catch (hoặc từ React Query onError). 
Trong JavaScript, bạn có thể throw bất cứ thứ gì — không chỉ Error, mà cả string, number, object... Nên TypeScript không thể biết chắc kiểu của lỗi → kiểu đúng nhất là unknown.


error.response là object của axios chứa toàn bộ phản hồi từ server khi request bị lỗi (server có trả về HTTP response, ví dụ 400/503). Các field chính:


error.response = {
  status: 400,              // HTTP status code (number)
  statusText: 'Bad Request',
  data: { ... },            // body server trả về (chính là ApiResponse<T> của backend)
  headers: { ... },
  config: { ... },
}



axios.isAxiosError(error) là gì?
Đây là một type guard (hàm bảo vệ kiểu) do axios cung cấp sẵn. Nó kiểm tra xem một giá trị có phải là AxiosError hay không.

Kết quả trả về
Trả về boolean:

true → error là một lỗi do axios ném ra (request thất bại: HTTP 4xx/5xx, timeout, network error...).
false → error là lỗi khác (lỗi JS thường, lỗi do code bạn throw...).
*/
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useJdInsight } from '../api/queries';
import type { JdInsight } from '../types';

interface Props {
  applicationId: number;
}

/**
 * Khối "Phân tích JD (AI)" trong trang chi tiết application.
 * Lazy: chỉ gọi AI khi user bấm nút (enabled). Kết quả cache theo hash JD ở backend.
 */
export function JdInsightSection({ applicationId }: Props) {
  const [enabled, setEnabled] = useState(false);
  const { data, isError, isFetching, refetch } = useJdInsight(applicationId, enabled);

  // Lần đầu: bật enabled → query tự chạy. Lần sau (retry): enabled đã true → refetch thủ công.
  function analyze() {
    if (!enabled) setEnabled(true);
    else refetch();
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">Phân tích JD (AI)</h2>
        {!data && (
          <Button size="sm" onClick={analyze} disabled={isFetching}>
            {isFetching ? 'Đang phân tích...' : 'Phân tích JD'}
          </Button>
        )}
      </div>

      {!enabled && (
        <p className="mt-2 text-sm text-gray-500">
          Dùng AI trích xuất kỹ năng, tech stack, trách nhiệm... từ nội dung JD.
        </p>
      )}

      {isError && (
        <p className="mt-3 text-sm text-red-600">
          Phân tích thất bại. AI có thể đang quá tải — bấm "Phân tích JD" để thử lại.
        </p>
      )}

      {data && <JdInsightView insight={data} />}
    </div>
  );
}

// ── Render kết quả ─────────────────────────────────────────────────────────────

function JdInsightView({ insight }: { insight: JdInsight }) {
  const info: { label: string; value: string | null }[] = [
    { label: 'Công ty', value: insight.companyName },
    { label: 'Vị trí', value: insight.position },
    { label: 'Địa điểm', value: insight.location },
    { label: 'Hình thức', value: insight.workType },
    { label: 'Loại hình', value: insight.employmentType },
    { label: 'Mức lương', value: insight.salaryRange },
    { label: 'Cấp độ', value: insight.experienceLevel },
    { label: 'Kinh nghiệm', value: insight.yearsOfExperience },
    { label: 'Học vấn', value: insight.education },
  ];
  const ts = insight.techStack;

  return (
    <div className="mt-4 space-y-4 text-sm">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
        {info
          .filter((r) => r.value)
          .map((r) => (
            <div key={r.label}>
              <dt className="text-gray-500">{r.label}</dt>
              <dd className="text-gray-900">{r.value}</dd>
            </div>
          ))}
      </dl>

      <ChipGroup
        title="Kỹ năng yêu cầu"
        chips={(insight.requiredSkills ?? []).map((s) =>
          s.yearsRequired ? `${s.skill} (${s.yearsRequired}y)` : (s.skill ?? ''),
        )}
      />
      <ChipGroup
        title="Ưu tiên có"
        chips={(insight.niceToHaveSkills ?? []).map((s) => s.skill ?? '')}
      />
      <ChipGroup title="Soft skills" chips={insight.softSkills ?? []} />

      {ts && (
        <>
          <ChipGroup title="Ngôn ngữ" chips={ts.languages ?? []} />
          <ChipGroup title="Framework" chips={ts.frameworks ?? []} />
          <ChipGroup title="Database" chips={ts.databases ?? []} />
          <ChipGroup title="Công cụ" chips={ts.tools ?? []} />
          <ChipGroup title="Nền tảng" chips={ts.platforms ?? []} />
        </>
      )}

      <BulletGroup title="Trách nhiệm" items={insight.responsibilities ?? []} />
      <BulletGroup title="Quyền lợi" items={insight.benefits ?? []} />
    </div>
  );
}

function ChipGroup({ title, chips }: { title: string; chips: string[] }) {
  const list = chips.filter(Boolean); // bỏ chuỗi rỗng (skill null → '')
  if (list.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-gray-500">{title}</h3>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {list.map((c, i) => (
          <span
            key={`${c}-${i}`}
            className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700"
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function BulletGroup({ title, items }: { title: string; items: string[] }) {
  const list = items.filter(Boolean);
  if (list.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-gray-500">{title}</h3>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-gray-700">
        {list.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

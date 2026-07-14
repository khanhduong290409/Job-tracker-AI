import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import type { ApiResponse } from '@/types/api';
import { useDraftEmail } from '../api/queries';
import { EMAIL_TEMPLATE_LABELS, type EmailTemplateKey } from '../types';

interface Props {
  applicationId: number;
}

// Danh sách template để render <option> — giữ đúng thứ tự cố định (Object.keys không đảm bảo, nên liệt kê tay).
const TEMPLATE_KEYS: EmailTemplateKey[] = [
  'FOLLOW_UP_AFTER_APPLY',
  'THANK_YOU_AFTER_INTERVIEW',
  'STATUS_INQUIRY',
];

// Nhãn tiếng Việt cho tone AI trả về (output string tolerant — giá trị lạ thì hiện nguyên văn).
const TONE_LABELS: Record<string, string> = {
  FORMAL: 'Trang trọng',
  FRIENDLY: 'Thân thiện',
  ENTHUSIASTIC: 'Nhiệt tình',
};

// Đọc lỗi mutation → message. 503 = AI down; còn lại lấy message backend hoặc fallback.
function draftErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 503) {
      return 'AI đang quá tải, vui lòng thử lại sau ít phút.';
    }
    const apiMsg = (error.response?.data as ApiResponse<unknown> | undefined)?.error?.message;
    if (apiMsg) return apiMsg;
  }
  return 'Soạn nháp thất bại, vui lòng thử lại.';
}

/**
 * Khối "Soạn email gửi HR (AI)" trong trang chi tiết application.
 * User chọn template + ghi chú → bấm soạn → AI trả về nháp → form sửa subject/body,
 * rồi Copy nội dung hoặc mở sẵn mail client bằng link mailto.
 * Không gửi server-side (xem notes/handoff.md Phase 6 scope 1b).
 */
export function EmailDraftSection({ applicationId }: Props) {
  const { mutate: draftEmail, isPending, isError, error } = useDraftEmail(applicationId);

  // ── Input soạn nháp ──
  const [templateKey, setTemplateKey] = useState<EmailTemplateKey>('FOLLOW_UP_AFTER_APPLY');
  const [instructions, setInstructions] = useState('');

  // ── Nháp trả về (editable) — seed từ onSuccess vì backend stateless, user sửa được ──
  const [hasDraft, setHasDraft] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [toEmail, setToEmail] = useState('');
  const [tone, setTone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generate() {
    draftEmail(
      { templateKey, customInstructions: instructions.trim() || undefined },
      {
        onSuccess: (res) => {
          setSubject(res.subject ?? '');
          setBody(res.body ?? '');
          setToEmail(res.toEmail ?? '');
          setTone(res.tone);
          setHasDraft(true);// state này đánh dấu đã có pháp AI trả về chưa (response)
          setCopied(false);// nut bấm copy để copy text
        },
      },
    );
  }

  async function copyBody() {
    try {
      await navigator.clipboard.writeText(body);//navigator.clipboard: method có sẵn của trình duyệt
      setCopied(true);//.writetext: chép chuỗi body vào clipboard
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard bị chặn (không HTTPS / không cấp quyền) — bỏ qua, user vẫn copy tay được.
    }
  }

  // dựng 1 link mailto: loại link đặc biệt, khi bấm vào sẽ mở appmail
  //tại sao dùng encodeURIComponent: subject và body có dấu cách, xuống dòng, kí tự đặc biêt.. dùng encodeURIComponent để mã hoá chúng thành dạng an toàn
  const mailtoHref = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const toneLabel = tone ? (TONE_LABELS[tone] ?? tone) : null;

  return (
    <div className="mt-8 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-lg font-semibold text-gray-900">Soạn email gửi HR (AI)</h2>

      {/* Input: chọn loại email + ghi chú thêm */}
      <div className="mt-3 space-y-2">
        <select
          value={templateKey}
          onChange={(e) => setTemplateKey(e.target.value as EmailTemplateKey)}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {TEMPLATE_KEYS.map((key) => (
            <option key={key} value={key}>
              {EMAIL_TEMPLATE_LABELS[key]}
            </option>
          ))}
        </select>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="Yêu cầu thêm cho AI (tùy chọn) — ví dụ: nhấn mạnh kinh nghiệm React, giọng văn thân thiện"
          rows={2}
          maxLength={500}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <Button size="sm" onClick={generate} disabled={isPending}>
          {isPending ? 'Đang soạn...' : hasDraft ? 'Soạn lại' : 'Soạn nháp'}
        </Button>
      </div>

      {isError && <p className="mt-3 text-sm text-red-600">{draftErrorMessage(error)}</p>}

      {/* Nháp trả về — sửa được rồi Copy / mở mail client */}
      {hasDraft && (
        <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          {toneLabel && (
            <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              Giọng văn: {toneLabel}
            </span>
          )}

          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Người nhận</label>
            <input
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              placeholder="Chưa gắn HR cho đơn này — nhập email người nhận"
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Tiêu đề</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Nội dung</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={copyBody}>
              {copied ? 'Đã copy ✓' : 'Copy nội dung'}
            </Button>
            <Button asChild size="sm">
              <a href={mailtoHref}>Mở trong ứng dụng mail</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

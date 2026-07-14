/**
 * Mirror DTO của email module backend (xem docs/04-ai-integration.md Template 5).
 *
 * templateKey là INPUT client chọn (3 giá trị cố định) → dùng union literal cho type-safe
 * (khác field enum-like của AI output vốn để `string` cho tolerant). subject/body/tone/toEmail
 * là OUTPUT từ AI/server, backend trả String nullable → đánh dấu `| null`, component tự guard.
 */

// ── Request: POST /api/v1/applications/{id}/emails/draft ──────────────────────

export type EmailTemplateKey =
  | 'FOLLOW_UP_AFTER_APPLY'
  | 'THANK_YOU_AFTER_INTERVIEW'
  | 'STATUS_INQUIRY';

export interface EmailDraftRequest {
  templateKey: EmailTemplateKey;
  customInstructions?: string | null;
}

// Nhãn tiếng Việt cho dropdown chọn loại email.
export const EMAIL_TEMPLATE_LABELS: Record<EmailTemplateKey, string> = {
  FOLLOW_UP_AFTER_APPLY: 'Theo dõi sau khi nộp đơn',
  THANK_YOU_AFTER_INTERVIEW: 'Cảm ơn sau phỏng vấn',
  STATUS_INQUIRY: 'Hỏi tình trạng đơn ứng tuyển',
};

// ── Response ──────────────────────────────────────────────────────────────────

export interface EmailDraftResponse {
  subject: string | null;
  body: string | null;
  tone: string | null; // FORMAL | FRIENDLY | ENTHUSIASTIC
  toEmail: string | null; // email HR, server điền từ contactPerson (null nếu đơn chưa gắn HR)
}

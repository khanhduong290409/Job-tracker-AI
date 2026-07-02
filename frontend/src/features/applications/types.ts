import type {
  ApplicationSource,
  ApplicationStatus,
  EmploymentType,
  WorkType,
} from '@/types/common';

/**
 * Mirror các DTO của backend Application module (xem docs/03-api-contract.md).
 * Quy ước: ngày giờ là string ISO (LocalDate "YYYY-MM-DD", Instant "...Z") — backend serialize ra string.
 */

// TimelineEventType — feature-local: không có DB CHECK (validate ở app layer), nên để ở đây thay vì common.ts.
export const TIMELINE_EVENT_TYPES = [
  'APPLIED',
  'PHONE_SCREEN',
  'TECHNICAL_INTERVIEW',
  'ONSITE_INTERVIEW',
  'OFFER_RECEIVED',
  'FOLLOW_UP',
  'NOTE',
  'OTHER',
] as const;

export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

// Nhãn tiếng Việt cho dropdown + hiển thị event. Record → compile error nếu thêm type mà quên nhãn.
export const TIMELINE_EVENT_LABELS: Record<TimelineEventType, string> = {
  APPLIED: 'Đã nộp đơn',
  PHONE_SCREEN: 'Phỏng vấn điện thoại',
  TECHNICAL_INTERVIEW: 'Phỏng vấn kỹ thuật',
  ONSITE_INTERVIEW: 'Phỏng vấn trực tiếp',
  OFFER_RECEIVED: 'Nhận offer',
  FOLLOW_UP: 'Follow-up',
  NOTE: 'Ghi chú',
  OTHER: 'Khác',
};

// ── Sub-objects ─────────────────────────────────────────────────────────────

export interface ContactPerson {
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  linkedinUrl: string | null;
}

export interface StatusHistory {
  id: number;
  fromStatus: ApplicationStatus | null; // null = bản ghi baseline lúc tạo
  toStatus: ApplicationStatus;
  note: string | null;
  changedAt: string;
}

export interface TimelineEvent {
  id: number;
  eventType: TimelineEventType;
  eventDate: string;
  title: string | null;
  description: string | null;
  createdAt: string;
}

// ── Responses ───────────────────────────────────────────────────────────────

// List item (nhẹ — không có jdContent, statusHistory, timelineEvents)
export interface ApplicationListItem {
  id: number;
  companyName: string;
  companyDomain: string | null;
  position: string;
  location: string | null;
  workType: WorkType | null;
  employmentType: EmploymentType | null;
  status: ApplicationStatus;
  source: ApplicationSource;
  appliedDate: string | null;
  cvVersionId: number | null;
  createdAt: string;
  updatedAt: string;
}

// Detail (đầy đủ)
export interface Application {
  id: number;
  companyName: string;
  companyDomain: string | null;
  position: string;
  location: string | null;
  workType: WorkType | null;
  employmentType: EmploymentType | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  jdContent: string;
  jdUrl: string | null;
  source: ApplicationSource;
  sourceDetail: string | null;
  appliedDate: string | null;
  status: ApplicationStatus;
  contactPerson: ContactPerson | null;
  notes: string | null;
  cvVersionId: number | null;
  statusHistory: StatusHistory[];
  timelineEvents: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

// ── Requests ──────────────────────────────────────────────────────────────────

// Input cho contact person — field optional (khác ContactPerson response: nullable)
export interface ContactPersonInput {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  linkedinUrl?: string;
}

export interface CreateApplicationRequest {
  companyName: string;
  companyDomain?: string;
  position: string;
  location?: string;
  workType?: WorkType;
  employmentType?: EmploymentType;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  jdContent: string;
  jdUrl?: string;
  source: ApplicationSource;
  sourceDetail?: string;
  appliedDate?: string; // "YYYY-MM-DD"
  status?: ApplicationStatus; // không gửi → backend default SAVED
  cvVersionId?: number;
  contactPerson?: ContactPersonInput;
  notes?: string;
}

// PATCH — mọi field optional, KHÔNG đổi status (dùng changeStatus). cvVersionId ĐƯỢC phép đổi (gắn CV).
export type UpdateApplicationRequest = Partial<
  Omit<CreateApplicationRequest, 'status'>
>;//Omit<T, K> — lấy type T nhưng bỏ các field tên K. Ở đây chỉ bỏ status (đổi status qua changeStatus riêng).
// Partial<T> — làm tất cả field của T thành optional(không bắt buộc)
export interface ChangeStatusRequest {
  newStatus: ApplicationStatus;
  note?: string;
}

export interface CreateTimelineEventRequest {
  eventType: TimelineEventType;
  eventDate: string; // ISO instant "...Z"
  title?: string;
  description?: string;
}

// ── List query params ─────────────────────────────────────────────────────────

export interface ApplicationListParams {
  statuses?: ApplicationStatus[];
  source?: ApplicationSource;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
  sortBy?: 'appliedDate' | 'createdAt' | 'companyName';
  sortDir?: 'asc' | 'desc';
}

import type { ApplicationStatus } from '@/types/common';

// Nhãn tiếng Việt + màu Tailwind cho từng status — single source of truth,
// dùng chung bởi ApplicationStatusBadge và dropdown filter.
// Record<ApplicationStatus, ...> → compile error nếu thêm status mới mà quên config.
export const APPLICATION_STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; className: string }
> = {
  SAVED:               { label: 'Đã lưu',                className: 'bg-gray-100 text-gray-600' },
  APPLIED:             { label: 'Đã nộp',                className: 'bg-blue-100 text-blue-700' },
  PHONE_SCREEN:        { label: 'Phỏng vấn điện thoại',  className: 'bg-indigo-100 text-indigo-700' },
  TECHNICAL_INTERVIEW: { label: 'Phỏng vấn kỹ thuật',    className: 'bg-purple-100 text-purple-700' },
  ONSITE:              { label: 'Phỏng vấn trực tiếp',   className: 'bg-violet-100 text-violet-700' },
  OFFER:               { label: 'Có offer',              className: 'bg-amber-100 text-amber-700' },
  ACCEPTED:            { label: 'Đã nhận',               className: 'bg-green-100 text-green-700' },
  REJECTED:            { label: 'Bị từ chối',            className: 'bg-red-100 text-red-700' },
  WITHDRAWN:           { label: 'Đã rút',                className: 'bg-gray-100 text-gray-500' },
};

// Mirror ApplicationStateMachine của backend — CHỈ để gợi ý UX (dropdown đổi status).
// Server vẫn là nơi enforce thật (validateTransition). Terminal state → mảng rỗng.
// LƯU Ý: nếu backend đổi transition table thì phải sync lại đây.
export const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SAVED: ['APPLIED', 'WITHDRAWN'],
  APPLIED: ['PHONE_SCREEN', 'TECHNICAL_INTERVIEW', 'REJECTED', 'WITHDRAWN'],
  PHONE_SCREEN: ['TECHNICAL_INTERVIEW', 'REJECTED', 'WITHDRAWN'],
  TECHNICAL_INTERVIEW: ['ONSITE', 'OFFER', 'REJECTED', 'WITHDRAWN'],
  ONSITE: ['OFFER', 'REJECTED', 'WITHDRAWN'],
  OFFER: ['ACCEPTED', 'REJECTED', 'WITHDRAWN'],
  ACCEPTED: [],
  REJECTED: [],
  WITHDRAWN: [],
};

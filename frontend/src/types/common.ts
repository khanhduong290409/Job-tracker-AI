/**
 * Enum types mirror DB CHECK constraints (xem `docs/02-database-schema.md`).
 *
 * Lưu ý: tsconfig set `erasableSyntaxOnly: true` → KHÔNG dùng TS `enum`.
 * Pattern: union literal type cho compile-time + `as const` array cho runtime iteration (render select, validate, v.v.).
 */

export const APPLICATION_STATUSES = [
  'SAVED',
  'APPLIED',
  'PHONE_SCREEN',
  'TECHNICAL_INTERVIEW',
  'ONSITE',
  'OFFER',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const CV_PARSE_STATUSES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
] as const;

export type CvParseStatus = (typeof CV_PARSE_STATUSES)[number];

// Application domain enums (mirror backend enum + DB CHECK của work_type/employment_type)

export const WORK_TYPES = ['ONSITE', 'HYBRID', 'REMOTE'] as const;

export type WorkType = (typeof WORK_TYPES)[number];

export const EMPLOYMENT_TYPES = ['INTERN', 'FULLTIME', 'PARTTIME', 'CONTRACT'] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const APPLICATION_SOURCES = [
  'LINKEDIN',
  'TOPDEV',
  'ITVIEC',
  'GLASSDOOR',
  'COMPANY_WEBSITE',
  'REFERRAL',
  'OTHER',
] as const;

export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];

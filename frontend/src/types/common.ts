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

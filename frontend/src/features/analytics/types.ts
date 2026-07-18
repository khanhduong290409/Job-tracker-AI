/**
 * Mirror 5 DTO của analytics module backend (xem docs/03-api-contract.md mục Analytics).
 *
 * Khác với module `ai/` (output AI, tolerant string vì model có thể trả giá trị lạ), số liệu
 * ở đây tính trực tiếp từ dữ liệu của user (status/source có sẵn trong DB) → dùng lại union
 * literal `ApplicationStatus`/`ApplicationSource` từ `types/common.ts` cho chặt kiểu, không
 * cần `| null` tràn lan như module ai.
 */

import type { ApplicationSource, ApplicationStatus } from '@/types/common';

// ── US-001: GET /analytics/overview ────────────────────────────────────────────

export interface MonthComparison {
  applications: string; // % chênh lệch số đơn so tháng trước, VD "+15%"
  offers: string; // số offer chênh lệch so tháng trước, VD "+1"
}

export interface OverviewResponse {
  totalApplications: number;
  activeApplications: number;
  totalOffers: number;
  offerRate: number; // 0.0–1.0, FE tự format %
  avgResponseTimeDays: number | null; // null = chưa có đơn nào được phản hồi
  comparedToLastMonth: MonthComparison;
}

// ── US-002: GET /analytics/funnel ───────────────────────────────────────────────

export interface FunnelStage {
  stage: ApplicationStatus; // APPLIED | PHONE_SCREEN | TECHNICAL_INTERVIEW | ONSITE | OFFER
  count: number; // số đơn TỪNG đạt tới stage này (không phải đang ở stage này)
  conversionRate: number; // count / count(stage trước); stage đầu = 1.0
}

export interface FunnelResponse {
  stages: FunnelStage[];
}

// ── US-003: GET /analytics/time-series ──────────────────────────────────────────

export type TimeSeriesMetric = 'applications' | 'interviews';
export type TimeSeriesInterval = 'day' | 'week' | 'month';

export interface TimeSeriesParams {
  metric?: TimeSeriesMetric;
  interval?: TimeSeriesInterval;
  from?: string; // "yyyy-MM-dd"
  to?: string; // "yyyy-MM-dd"
}

export interface TimeSeriesPoint {
  period: string; // "yyyy-MM-dd", mốc đầu ngày/tuần/tháng
  count: number;
}

export interface TimeSeriesResponse {
  metric: TimeSeriesMetric;
  interval: TimeSeriesInterval;
  points: TimeSeriesPoint[];
}

// ── US-004: GET /analytics/sources ──────────────────────────────────────────────

export interface SourceStat {
  source: ApplicationSource;
  count: number; // tổng đơn từ nguồn này
  offers: number; // số đơn từ nguồn này TỪNG đạt OFFER
  conversionRate: number; // offers / count
}

export interface SourceAnalysisResponse {
  sources: SourceStat[]; // đã sort giảm dần theo count
}

// ── US-006: GET /analytics/activity ─────────────────────────────────────────────

export interface ActivityParams {
  from?: string; // "yyyy-MM-dd"
  to?: string; // "yyyy-MM-dd"
}

export interface ActivityDay {
  date: string; // "yyyy-MM-dd"
  count: number; // số lần đổi status trong ngày
}

export interface ActivityResponse {
  days: ActivityDay[]; // chỉ trả ngày có hoạt động (count>0), FE tự vẽ ô trống
}

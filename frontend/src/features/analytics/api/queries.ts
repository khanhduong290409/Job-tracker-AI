import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from './analytics-api';
import type { ActivityParams, TimeSeriesParams } from '../types';

/**
 * Hooks đọc số liệu dashboard. Tất cả là useQuery (không có mutation — analytics chỉ đọc).
 *
 * Số liệu chỉ đổi khi user thêm/sửa application, không phải liên tục → staleTime 5 phút
 * để 5 query không refetch lại mỗi lần focus lại tab. Vào lại trang sau đó vẫn tự làm mới.
 */
const STALE_TIME = 5 * 60 * 1000;

const ANALYTICS_KEYS = {
  overview: ['analytics', 'overview'] as const,
  funnel: ['analytics', 'funnel'] as const,
  sources: ['analytics', 'sources'] as const,
  // time-series/activity đưa params vào key → đổi filter (metric/interval/khoảng ngày)
  // là 1 cache entry riêng, không đè lên kết quả filter cũ.
  timeSeries: (params: TimeSeriesParams) => ['analytics', 'time-series', params] as const,
  activity: (params: ActivityParams) => ['analytics', 'activity', params] as const,
};

export function useOverview() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.overview,
    queryFn: () => analyticsApi.getOverview(),
    staleTime: STALE_TIME,
  });
}

export function useFunnel() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.funnel,
    queryFn: () => analyticsApi.getFunnel(),
    staleTime: STALE_TIME,
  });
}

export function useTimeSeries(params: TimeSeriesParams) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.timeSeries(params),
    queryFn: () => analyticsApi.getTimeSeries(params),
    staleTime: STALE_TIME,
  });
}

export function useSources() {
  return useQuery({
    queryKey: ANALYTICS_KEYS.sources,
    queryFn: () => analyticsApi.getSources(),
    staleTime: STALE_TIME,
  });
}

export function useActivity(params: ActivityParams) {
  return useQuery({
    queryKey: ANALYTICS_KEYS.activity(params),
    queryFn: () => analyticsApi.getActivity(params),
    staleTime: STALE_TIME,
  });
}

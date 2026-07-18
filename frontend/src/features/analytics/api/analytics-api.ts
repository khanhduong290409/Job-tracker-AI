import { api } from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api';
import type {
  ActivityParams,
  ActivityResponse,
  FunnelResponse,
  OverviewResponse,
  SourceAnalysisResponse,
  TimeSeriesParams,
  TimeSeriesResponse,
} from '../types';

/**
 * Gọi 5 endpoint analytics module (xem docs/03-api-contract.md mục Analytics).
 * Tất cả là GET chỉ-đọc, userId lấy từ token ở backend (không truyền từ FE).
 * Response bọc ApiResponse<T> → unwrap `.data.data!` như các module khác.
 *
 * time-series và activity có param optional (metric/interval/from/to). Truyền cả
 * object params kể cả khi field undefined — axios tự bỏ qua field undefined khi
 * build query string, nên không cần lọc thủ công.
 */
export const analyticsApi = {
  // GET /analytics/overview — 4 ô số tổng quan + so tháng trước.
  getOverview: async (): Promise<OverviewResponse> => {
    const res = await api.get<ApiResponse<OverviewResponse>>('/analytics/overview');
    return res.data.data!;
  },

  // GET /analytics/funnel — phễu tuyển dụng APPLIED → OFFER.
  getFunnel: async (): Promise<FunnelResponse> => {
    const res = await api.get<ApiResponse<FunnelResponse>>('/analytics/funnel');
    return res.data.data!;
  },

  // GET /analytics/time-series — số đơn/phỏng vấn theo thời gian.
  getTimeSeries: async (params: TimeSeriesParams): Promise<TimeSeriesResponse> => {
    const res = await api.get<ApiResponse<TimeSeriesResponse>>('/analytics/time-series', {
      params,
    });
    return res.data.data!;
  },

  // GET /analytics/sources — count + conversion theo nguồn ứng tuyển.
  getSources: async (): Promise<SourceAnalysisResponse> => {
    const res = await api.get<ApiResponse<SourceAnalysisResponse>>('/analytics/sources');
    return res.data.data!;
  },

  // GET /analytics/activity — heatmap hoạt động theo ngày.
  getActivity: async (params: ActivityParams): Promise<ActivityResponse> => {
    const res = await api.get<ApiResponse<ActivityResponse>>('/analytics/activity', {
      params,
    });
    return res.data.data!;
  },
};

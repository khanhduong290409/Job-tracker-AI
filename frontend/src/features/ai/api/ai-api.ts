import { api } from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api';
import type { CvJdMatch, ExtractJdRequest, JdInsight } from '../types';

/**
 * Gọi 3 endpoint AI module (xem docs/03-api-contract.md).
 * Tất cả response bọc ApiResponse<T> → unwrap `.data.data!` như các module khác.
 */
export const aiApi = {
  // POST /ai/extract-jd — stateless, trích JD thô để auto-fill form tạo application.
  extractJd: async (body: ExtractJdRequest): Promise<JdInsight> => {
    const res = await api.post<ApiResponse<JdInsight>>('/ai/extract-jd', body);
    return res.data.data!;
  },

  // GET /applications/{id}/jd-insight — JD insight của 1 application (backend cache theo hash JD).
  getJdInsight: async (applicationId: number): Promise<JdInsight> => {
    const res = await api.get<ApiResponse<JdInsight>>(
      `/applications/${applicationId}/jd-insight`,
    );
    return res.data.data!;
  },

  // GET /applications/{id}/cv-jd-match — độ khớp CV–JD. force=true → bỏ cache, phân tích lại.
  getCvJdMatch: async (applicationId: number, force = false): Promise<CvJdMatch> => {
    const res = await api.get<ApiResponse<CvJdMatch>>(
      `/applications/${applicationId}/cv-jd-match`,
      { params: { force } },
    );
    return res.data.data!;
  },
};

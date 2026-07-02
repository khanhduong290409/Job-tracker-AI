import { api } from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api';
import type { CvParsedData, CvVersion, CvVersionDetail } from '../types';

export const cvApi = {
  upload: async (file: File, label: string): Promise<CvVersion> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('label', label);

    const res = await api.post<ApiResponse<CvVersion>>('/cv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data!;
  },

  list: async (): Promise<CvVersion[]> => {
    const res = await api.get<ApiResponse<CvVersion[]>>('/cv');
    return res.data.data!;
  },

  getById: async (id: number): Promise<CvVersionDetail> => {
    const res = await api.get<ApiResponse<CvVersionDetail>>(`/cv/${id}`);
    return res.data.data!;
  },

  // US-CV-002: lưu lại parsed data đã sửa (thay thế toàn bộ).
  updateParsedData: async (id: number, parsedData: CvParsedData): Promise<CvVersionDetail> => {
    const res = await api.patch<ApiResponse<CvVersionDetail>>(`/cv/${id}/parsed-data`, parsedData);
    return res.data.data!;
  },

  // Chạy lại parse (vd CV bị FAILED). Trả về detail với status PENDING → polling tiếp tục.
  reparse: async (id: number): Promise<CvVersionDetail> => {
    const res = await api.post<ApiResponse<CvVersionDetail>>(`/cv/${id}/reparse`);
    return res.data.data!;
  },

  setDefault: async (id: number): Promise<CvVersion> => {
    const res = await api.patch<ApiResponse<CvVersion>>(`/cv/${id}/default`);
    //.patch là HTTP method — dùng để cập nhật một phần resource (khác PUT là thay toàn bộ).
    return res.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/cv/${id}`);
  },
};

import { api } from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api';
import type { EmailDraftRequest, EmailDraftResponse } from '../types';

/** Gọi endpoint soạn nháp email (xem docs/03-api-contract.md). Response bọc ApiResponse<T>. */
export const emailApi = {
  // POST /applications/{id}/emails/draft — AI soạn nháp email gửi HR (stateless, không lưu).
  draft: async (
    applicationId: number,
    body: EmailDraftRequest,
  ): Promise<EmailDraftResponse> => {
    const res = await api.post<ApiResponse<EmailDraftResponse>>(
      `/applications/${applicationId}/emails/draft`,
      body,
    );
    return res.data.data!;
  },
};

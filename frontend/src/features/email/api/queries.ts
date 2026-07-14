import { useMutation } from '@tanstack/react-query';
import { emailApi } from './email-api';
import type { EmailDraftRequest } from '../types';

// Soạn nháp = hành động theo nút bấm (user chọn template rồi bấm "Soạn nháp"), sinh nội dung
// mới mỗi lần → mutation, KHÔNG cache theo key. Backend stateless nên không có gì để invalidate.
export function useDraftEmail(applicationId: number) {
  return useMutation({
    mutationFn: (body: EmailDraftRequest) => emailApi.draft(applicationId, body),
  });
}

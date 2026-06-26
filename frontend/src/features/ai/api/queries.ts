import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { aiApi } from './ai-api';
import type { ExtractJdRequest } from '../types';

const AI_KEYS = {
  jdInsight: (id: number) => ['ai', 'jd-insight', id] as const,
  cvJdMatch: (id: number) => ['ai', 'cv-jd-match', id] as const,
};

// ── extract-jd ────────────────────────────────────────────────────────────────

// Stateless, trigger theo hành động (nút "Phân tích JD" ở form tạo application) → mutation.
// Không cache theo key vì input là JD thô tạm thời, không gắn resource nào.
export function useExtractJd() {
  return useMutation({
    mutationFn: (body: ExtractJdRequest) => aiApi.extractJd(body),
  });
}

// ── jd-insight / cv-jd-match (lazy query) ─────────────────────────────────────
// AI call tốn phí + chậm → KHÔNG auto-fetch lúc mount. Caller truyền `enabled` (bật khi
// user bấm nút). staleTime Infinity vì kết quả đã được backend cache theo hash JD —
// không cần refetch tự động; muốn làm mới thì dùng "phân tích lại" (force) bên dưới.

export function useJdInsight(applicationId: number, enabled: boolean) {
  return useQuery({
    queryKey: AI_KEYS.jdInsight(applicationId),
    queryFn: () => aiApi.getJdInsight(applicationId),
    enabled,
    staleTime: Infinity,
  });
}
//cái này cũng phân vân dùng giữa usequery và mutation nhưng mà nên dùng usequery vì 
//bản chất của nó mặc dù có bước lưu nhưng mà nó vẫn làm việc tìm cached nếu có sẵn cached ở backend
//để phân biết dùng useQuery: kết quả giống nhau, có thay đổi state hay không thì dùng useQuery sẽ tiện hơn
//xem đoạn learning từ 299-235 để biết cách phân biệt
export function useCvJdMatch(applicationId: number, enabled: boolean) {
  return useQuery({
    queryKey: AI_KEYS.cvJdMatch(applicationId),
    queryFn: () => aiApi.getCvJdMatch(applicationId),
    enabled,
    staleTime: Infinity,
  });
}

// "Phân tích lại" — gọi force=true (bỏ cache backend) rồi ghi đè cache query để
// useCvJdMatch hiển thị kết quả mới ngay, không cần refetch riêng.
export function useReanalyzeMatch(applicationId: number) {
  const queryClient = useQueryClient();// lấy bộ chứ cache để ghi đè data mới vào key cache
  return useMutation({
    mutationFn: () => aiApi.getCvJdMatch(applicationId, true),
    onSuccess: (data) => {
      queryClient.setQueryData(AI_KEYS.cvJdMatch(applicationId), data);
    },
  });
}

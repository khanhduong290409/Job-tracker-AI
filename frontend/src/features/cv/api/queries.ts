import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CvParsedData } from '../types';
import { cvApi } from './cv-api';

// Query key factory — đảm bảo tất cả CV keys nhất quán trong toàn app.
// CV_KEYS.all = ['cv'] → invalidateQueries prefix-match, xóa cả list lẫn detail.
//as = ép kiểu trong TypeScript. const = bất biến. Kết hợp lại: "coi array này như hằng số, không đổi được."
const CV_KEYS = {
  all: ['cv'] as const,
  detail: (id: number) => ['cv', id] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

// PENDING (vừa upload/reparse, async chưa chạy) + PROCESSING (đang parse) → đều cần poll tiếp.
const isParsing = (status?: string) => status === 'PENDING' || status === 'PROCESSING';

export function useCvList() {
  return useQuery({
    queryKey: CV_KEYS.all,
    queryFn: cvApi.list,
    // Poll mỗi 3s nếu có bất kỳ CV nào đang parse — tự dừng khi tất cả xong.
    refetchInterval: (query) =>
      query.state.data?.some((cv) => isParsing(cv.parseStatus)) ? 3000 : false,
  });//bên dưới có giải thích dòng này
}

export function useCv(id: number) {
  return useQuery({
    queryKey: CV_KEYS.detail(id),
    queryFn: () => cvApi.getById(id),
    // Poll mỗi 3s khi backend đang parse PDF — tự dừng khi status đổi sang COMPLETED/FAILED.
    // query.state.data là cached data hiện tại (undefined lần đầu → không poll, fetch 1 lần bình thường).
    refetchInterval: (query) => (isParsing(query.state.data?.parseStatus) ? 3000 : false),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useUploadCv() {
  const queryClient = useQueryClient();
  return useMutation({
    // mutationFn chỉ nhận 1 argument → gộp file + label vào 1 object
    mutationFn: ({ file, label }: { file: File; label: string }) =>
      cvApi.upload(file, label),
    onSuccess: () => {
      // Invalidate list để CV mới xuất hiện ngay
      queryClient.invalidateQueries({ queryKey: CV_KEYS.all });
    },
  });
}

export function useSetDefaultCv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cvApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CV_KEYS.all });
    },
  });
}

export function useDeleteCv() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => cvApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CV_KEYS.all });
    },
  });
}

// id cố định theo trang detail → nhận ở hook (khác setDefault/delete nhận id ở mutationFn vì gọi từ list).
export function useUpdateParsedData(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (parsedData: CvParsedData) => cvApi.updateParsedData(id, parsedData),
    onSuccess: (updated) => {
      // Ghi thẳng vào cache detail → editor thấy data mới ngay, không cần refetch.
      queryClient.setQueryData(CV_KEYS.detail(id), updated);
    },
  });
}

export function useReparseCv(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cvApi.reparse(id),
    onSuccess: (updated) => {
      // Cập nhật cache về PENDING → useCv tự poll tiếp tới khi COMPLETED/FAILED.
      queryClient.setQueryData(CV_KEYS.detail(id), updated);
      queryClient.invalidateQueries({ queryKey: CV_KEYS.all });
    },
  });
}

//CÓ GIẢI THÍCH TẤT CẢ TRONG FILE LEARNING
/*
query.state.data?.some((cv) => isParsing(cv.parseStatus)) ? 3000 : false,

Ý nghĩa dòng này
Đây là cấu hình refetchInterval của React Query — quyết định có tự động gọi lại API định kỳ hay không, và bao lâu một lần.


refetchInterval: (query) =>
  query.state.data?.some((cv) => isParsing(cv.parseStatus)) ? 3000 : false,
Đọc từ trong ra ngoài:

Phần	Ý nghĩa
query.state.data	Dữ liệu CV list đang cache hiện tại (mảng các CV).
?.	Optional chaining — lần đầu data còn undefined thì không lỗi, trả undefined.
.some((cv) => isParsing(cv.parseStatus))	Kiểm tra: có ÍT NHẤT một CV đang ở trạng thái PENDING hoặc PROCESSING không?
? 3000 : false	Nếu có → trả 3000 (poll lại mỗi 3 giây). Nếu không → trả false (ngừng poll).
*/
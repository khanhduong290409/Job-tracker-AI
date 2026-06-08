import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cvApi } from './cv-api';

// Query key factory — đảm bảo tất cả CV keys nhất quán trong toàn app.
// CV_KEYS.all = ['cv'] → invalidateQueries prefix-match, xóa cả list lẫn detail.
//as = ép kiểu trong TypeScript. const = bất biến. Kết hợp lại: "coi array này như hằng số, không đổi được."
const CV_KEYS = {
  all: ['cv'] as const,
  detail: (id: number) => ['cv', id] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useCvList() {
  return useQuery({
    queryKey: CV_KEYS.all,
    queryFn: cvApi.list,
    // Poll mỗi 3s nếu có bất kỳ CV nào đang parse — tự dừng khi tất cả xong.
    refetchInterval: (query) =>
      query.state.data?.some((cv) => cv.parseStatus === 'PROCESSING') ? 3000 : false,
  });
}

export function useCv(id: number) {
  return useQuery({
    queryKey: CV_KEYS.detail(id),
    queryFn: () => cvApi.getById(id),
    // Poll mỗi 3s khi backend đang parse PDF — tự dừng khi status đổi sang COMPLETED/FAILED.
    // query.state.data là cached data hiện tại (undefined lần đầu → không poll, fetch 1 lần bình thường).
    refetchInterval: (query) =>
      query.state.data?.parseStatus === 'PROCESSING' ? 3000 : false,
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

//CÓ GIẢI THÍCH TẤT CẢ TRONG FILE LEARNING
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { applicationApi } from './application-api';
import type {
  ApplicationListParams,
  ChangeStatusRequest,
  CreateApplicationRequest,
  CreateTimelineEventRequest,
  UpdateApplicationRequest,
} from '../types';
/*
Tóm tắt vai trò
Import	          Vai trò	                       Khi nào dùng
useQuery	        Fetch & cache data	           GET request
useMutation	      Thay đổi data	                 POST/PUT/DELETE
useQueryClient	  Thao tác cache thủ công	       Invalidate sau mutation
keepPreviousData	Tránh flash UI khi refetch	   Pagination, filter
 */

//lí do dùng mãng thay vì string:
//dùng để quản lí từng tầng, và khi dùng queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.all });
//nó sẽ fetch các phần tử có key là application, tức là fetch cả list lẫn details
// nhưng mà chỉ fetch với các api đang hoạt động, ví dụ đang ở detail 5 thì nó sẽ chỉ userquery detail 5
const APPLICATION_KEYS = {
  all: ['applications'] as const,
  list: (params: ApplicationListParams) => ['applications', 'list', params] as const,
  detail: (id: number) => ['applications', 'detail', id] as const,
};

// ── Queries ───────────────────────────────────────────────────────────────────

export function useApplications(params: ApplicationListParams = {}) {
  return useQuery({
    queryKey: APPLICATION_KEYS.list(params),
    queryFn: () => applicationApi.list(params),
    // Giữ data trang/filter cũ trong lúc fetch trang/filter mới → list không nhấp nháy về rỗng.
    placeholderData: keepPreviousData,
  });
}
/*
data trả về có shape:

{
  items: ApplicationListItem[],  // danh sách application trang hiện tại
  pagination: {
    page: number,          // trang hiện tại
    size: number,          // số item/trang
    totalElements: number, // tổng số application
    totalPages: number,    // tổng số trang
    hasNext: boolean,      // còn trang sau?
    hasPrevious: boolean,  // có trang trước?
  }
}
*/

export function useApplication(id: number) {
  return useQuery({
    queryKey: APPLICATION_KEYS.detail(id),
    queryFn: () => applicationApi.getById(id),
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateApplicationRequest) => applicationApi.create(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.all });
    },
  });
}

export function useUpdateApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    // mutationFn nhận 1 arg → gộp id + body vào 1 object
    mutationFn: ({ id, body }: { id: number; body: UpdateApplicationRequest }) =>
      applicationApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.all });
    },
  });
}

export function useChangeStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: ChangeStatusRequest }) =>
      applicationApi.changeStatus(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.all });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => applicationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.all });
    },
  });
}

export function useAddTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: CreateTimelineEventRequest }) =>
      applicationApi.addTimelineEvent(id, body),
    // Chỉ detail có timeline → invalidate đúng detail của app đó (arg 2 = variables).
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.detail(id) });
    },
  });
}
/*
queryClient.invalidateQueries({ queryKey: APPLICATION_KEYS.all })
// tức là: queryKey: ['applications']
React Query không tìm query nào có key đúng bằng ['applications']. Nó tìm tất cả query đang active có key bắt đầu bằng ['applications']:


['applications', 'list', { page: 1 }]  ← đánh dấu stale → tự refetch
['applications', 'list', { page: 2 }]  ← đánh dấu stale → tự refetch
['applications', 'detail', 3]          ← đánh dấu 
*/

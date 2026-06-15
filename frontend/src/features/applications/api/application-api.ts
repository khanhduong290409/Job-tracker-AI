import { api } from '@/lib/api/axios';
import type { ApiResponse, PaginatedResponse } from '@/types/api';
import type {
  Application,
  ApplicationListItem,
  ApplicationListParams,
  ChangeStatusRequest,
  CreateApplicationRequest,
  CreateTimelineEventRequest,
  TimelineEvent,
  UpdateApplicationRequest,
} from '../types';

const BASE = '/applications';

export const applicationApi = {
  create: async (body: CreateApplicationRequest): Promise<Application> => {
    const res = await api.post<ApiResponse<Application>>(BASE, body);
    return res.data.data!;
  },

  list: async (
    params: ApplicationListParams = {},
  ): Promise<PaginatedResponse<ApplicationListItem>> => {
    const res = await api.get<ApiResponse<PaginatedResponse<ApplicationListItem>>>(BASE, {
      params,
      // indexes: null → mảng serialize thành statuses=A&statuses=B (lặp key, không brackets)
      // khớp @ModelAttribute Spring (bind List theo tên field). Mặc định axios dùng statuses[]=A.
      paramsSerializer: { indexes: null },
    });
    return res.data.data!;
  },//paramsSerializer chuyển { statuses: ["PENDING", "APPROVED"] } thành ?statuses[]=PENDING&statuses[]=APPROVED
 

  getById: async (id: number): Promise<Application> => {
    const res = await api.get<ApiResponse<Application>>(`${BASE}/${id}`);
    return res.data.data!;
  },

  update: async (id: number, body: UpdateApplicationRequest): Promise<Application> => {
    const res = await api.patch<ApiResponse<Application>>(`${BASE}/${id}`, body);
    return res.data.data!;
  },

  changeStatus: async (id: number, body: ChangeStatusRequest): Promise<Application> => {
    const res = await api.put<ApiResponse<Application>>(`${BASE}/${id}/status`, body);
    return res.data.data!;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`${BASE}/${id}`);
  },

  addTimelineEvent: async (
    id: number,
    body: CreateTimelineEventRequest,
  ): Promise<TimelineEvent> => {
    const res = await api.post<ApiResponse<TimelineEvent>>(
      `${BASE}/${id}/timeline-events`,
      body,
    );
    return res.data.data!;
  },
};

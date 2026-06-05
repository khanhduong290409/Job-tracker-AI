import { api } from '@/lib/api/axios';
import type { ApiResponse } from '@/types/api';
import type { AuthResponse, UserProfile } from '../types';
//syntax: api.post<KiểuTrảVề>(url, body)
export const authApi = {
  googleLogin: async (code: string, redirectUri: string): Promise<AuthResponse> => {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/google', { code, redirectUri });
    return res.data.data!;
  },

  refresh: async (refreshToken: string): Promise<AuthResponse> => {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/refresh', { refreshToken });
    return res.data.data!;
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken });
  },

  getMe: async (): Promise<UserProfile> => {
    const res = await api.get<ApiResponse<UserProfile>>('/auth/me');
    return res.data.data!;
  },
};

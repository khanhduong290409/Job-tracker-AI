import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { env } from '../../config/env';
import type { ApiResponse } from '../../types/api';

const ACCESS_TOKEN_KEY = 'jt_access_token';
const REFRESH_TOKEN_KEY = 'jt_refresh_token';

/**
 * Source of truth cho JWT tokens. Auth store + axios cùng dùng.
 * Dùng localStorage để token persist qua refresh page.
 */
export const tokenStorage = {
  getAccess: (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (accessToken: string, refreshToken: string): void => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: (): void => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const api = axios.create({
  baseURL: env.VITE_API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ---------- Request interceptor: attach Bearer token ----------
//api.interceptors.request.use() đăng kí 1 function chạy trước mỗi request

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// ---------- Response interceptor: 401 → refresh → retry ----------
/*
Array<{...}> — mảng các object
resolve: (token: string) => void — function nhận token, không trả về gì
reject: (err: unknown) => void — function nhận error, không trả về gì
= [] — khởi tạo rỗng

Mảng này lưu các request đang chờ token mới.
p/s: khởi tạo mảng rỗng, mỗi phần tử trong mảng là object chứa 2 function.
 */
//InternalAxiosReqeustConfig là 1 type có sẵn của axios, cú pháp & { _retry?: boolean }; để thêm biến _retry?: boolean  vào biến axios hợp thành 1 type 
type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushQueue(err: unknown, token: string | null): void {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (err || !token) reject(err);
    else resolve(token);
  });
  pendingQueue = [];
}

type RefreshResponseData = {
  accessToken: string;
  refreshToken: string;
};

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) throw new Error('No refresh token available');

  // Gọi bằng `axios` gốc (không qua instance `api`) để tránh trigger interceptor → tránh loop.
  const res = await axios.post<ApiResponse<RefreshResponseData>>(
    `${env.VITE_API_BASE_URL}/auth/refresh`,
    { refreshToken },
  );
  const data = res.data.data;
  if (!data?.accessToken || !data?.refreshToken) {
    throw new Error('Invalid refresh response');
  }
  tokenStorage.set(data.accessToken, data.refreshToken);
  return data.accessToken;
}

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes('/auth/refresh') || url.includes('/auth/google');
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;

    // Reject thẳng nếu: không phải 401, không có config, đã retry rồi, hoặc đang gọi auth endpoint
    if (
      status !== 401 ||
      !original ||
      original._retry ||
      isAuthEndpoint(original.url)
    ) {
      return Promise.reject(error);
    }

    // Đang có request khác refresh → đợi token mới rồi retry
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original._retry = true;
            original.headers.set('Authorization', `Bearer ${token}`);
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      flushQueue(null, newToken);
      original.headers.set('Authorization', `Bearer ${newToken}`);
      return api(original);
    } catch (refreshErr) {
      flushQueue(refreshErr, null);
      tokenStorage.clear();
      // Hard redirect — reset clean state. Bỏ qua nếu đang ở /login để tránh reload vô hạn.
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login')
      ) {
        window.location.href = '/login';
      }
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);




/**
 * fetch — built-in browser API:
typescript// Phải tự xử lý nhiều thứ:
const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
})
if (!res.ok) throw new Error(...)  // fetch không tự throw khi 4xx/5xx
const data = await res.json()      // phải parse thủ công


axios — thư viện:
typescript// Tự động xử lý:
const { data } = await apiClient.get(url)
// ✅ Tự parse JSON
// ✅ Tự throw error khi 4xx/5xx
// ✅ Interceptors (gắn token, handle 401 refresh tự động)
// ✅ Timeout config đơn giản
 */
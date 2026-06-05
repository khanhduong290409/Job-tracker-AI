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
//InternalAxiosReqeustConfig là 1 type có sẵn của axios, cú pháp & { _retry?: boolean }; để thêm biến _retry?: boolean  vào biến axios hợp thành 1 type
type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/*
 * Promise của lần refresh đang chạy. Nhiều request cùng bị 401 sẽ CÙNG await
 * biến này → server chỉ bị gọi /auth/refresh đúng 1 lần. null = không có ai đang refresh.
 */
let refreshPromise: Promise<string> | null = null;

type RefreshResponseData = {
  accessToken: string;
  refreshToken: string;
};

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) throw new Error('No refresh token available');

  // Gọi bằng `axios` gốc (không qua instance `api`) để tránh trigger interceptor → tránh loop.
  //syntax: axios.post< Type >( url, body )
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

/*
 * Đảm bảo chỉ refresh đúng 1 lần dù bị gọi đồng thời nhiều lần:
 * - Lần gọi đầu: refreshPromise đang null → khởi động refresh, cất Promise lại.
 * - Các lần gọi sau (trong lúc đang refresh): thấy refreshPromise đã có → dùng chung luôn.
 * - .finally: refresh xong (thành/bại) thì xóa biến, cho lần 401 tiếp theo refresh lại được.
 */
function getNewToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
  //đoạn finally nó sẽ chạy cuối cùng, sau khi promise kết thúc
  //tức là refreshPromise = null sẽ chạy sau cả return refreshPromise
  //nên ở đây nó chỉ có chức năng dọn refreshPromise

/*
    Dòng thời gian thực tế

    t = 0ms      A vào getNewToken() → refreshPromise = Promise → return
    t = 0.001ms  B vào getNewToken() → thấy refreshPromise → return Promise đó
    t = 0.001ms  C vào getNewToken() → thấy refreshPromise → return Promise đó
                ...đợi server...
    t = 200ms    Server trả về → .finally chạy → refreshPromise = null
*/
}

function isAuthEndpoint(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes('/auth/refresh') || url.includes('/auth/google');
}
//syntax: 
/*
  api.interceptors.response.use(
  successCallback,  // chạy khi response 2xx
  errorCallback     // chạy khi response 4xx/5xx
)
 */

api.interceptors.response.use(
  (res) => res, // callback 1: response thành công → pass through
  async (error: AxiosError) => {// callback 2: response lỗi → xử lý ở đây
    const original = error.config as RetryableConfig | undefined;//error.config là config của request đã gây ra lỗi — chứa url, headers, body... để sau này có thể retry lại đúng request đó.
    const status = error.response?.status;

    // Reject thẳng nếu: không phải 401, không có config, đã retry rồi, hoặc đang gọi auth endpoint
    if (
      status !== 401 ||   // không phải lỗi token
      !original ||        // không có config (hiếm gặp)
      original._retry ||  // đã retry rồi, tránh vòng lặp vô hạn
      isAuthEndpoint(original.url)  // đang gọi /auth/refresh hoặc /auth/google
    ) {
      return Promise.reject(error);  // ném lỗi ra ngoài, không xử lý
    }


    original._retry = true;

      // A, B, C cùng dừng ở đây chờ CHUNG 1 Promise refresh (getNewToken lo việc gộp).
/*
    Dòng thời gian thực tế


    t = 0ms      A vào getNewToken() → refreshPromise = Promise → return
    t = 0.001ms  B vào getNewToken() → thấy refreshPromise → return Promise đó
    t = 0.001ms  C vào getNewToken() → thấy refreshPromise → return Promise đó
                ...đợi server...
    t = 200ms    Server trả về → .finally chạy → refreshPromise = null
*/
    try {

      const newToken = await getNewToken();
      original.headers.set('Authorization', `Bearer ${newToken}`);
      return api(original); // có token mới → tự gửi lại request của mình
    } catch (refreshErr) {
      tokenStorage.clear();//Tại sao lại clear? -> bên dưới có giải thích
      // Hard redirect — reset clean state. Bỏ qua nếu đang ở /login để tránh reload vô hạn.
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login')
      ) {
        window.location.href = '/login';
      }
      return Promise.reject(refreshErr);
    }
  },
);
/**
 * // Ví dụ error.config:
{
  url: '/profile',
  method: 'get',
  headers: { Authorization: 'Bearer eyJ...expired' },
  _retry: undefined   // ← field ta tự thêm vào qua RetryableConfig
}

status = error.response?.status
// → 401 (token hết hạn)
// → 403 (không có quyền)
// → 500 (server lỗi)




Tại sao cần original._retry?
Lần 1: GET /profile → 401 → _retry = undefined → tiến hành refresh
Lần 2: GET /profile → 401 → _retry = true      → reject thẳng, không refresh nữa
Nếu không có flag này, refresh thành công nhưng server vẫn trả 401 → refresh lại → vòng lặp vô hạn.
Tại sao cần isAuthEndpoint?
POST /auth/refresh → 401
→ không có flag này → interceptor cố refresh token của... refresh endpoint
→ vòng lặp vô hạn
 */



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


Tại sao lại clear?
Khi rơi vào catch ở đây, có nghĩa:

Access token đã hết hạn (mới bị 401).
Refresh token cũng không dùng được (refresh mới fail xong).
Cả hai token đều vô dụng. Giữ lại trong localStorage chỉ gây hại: lần sau mở trang, code đọc token cũ lên, bắn request, bị 401, lại refresh, lại fail → lặp vô tận.

Xóa đi là để dọn sạch, trở về trạng thái "chưa đăng nhập".


 */
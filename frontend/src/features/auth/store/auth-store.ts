import { create } from 'zustand';
import { tokenStorage } from '../../../lib/api/axios';

/**
 * Skeleton auth store cho Phase 0. Phase 1 sẽ gọi `setAuth` sau khi login/refresh
 * thành công và `clearAuth` khi logout. UI lấy `user` + `isAuthenticated` để render.
 */

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

const USER_KEY = 'jt_user';

function loadUserFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    // Fail-safe: localStorage bị tay sửa thành garbage → coi như chưa login
    return null;
  }
}

const initialUser = loadUserFromStorage();
const initialAuthenticated =
  initialUser !== null && tokenStorage.getAccess() !== null;

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  isAuthenticated: initialAuthenticated,
  setAuth: (user, accessToken, refreshToken) => {
    tokenStorage.set(accessToken, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  clearAuth: () => {
    tokenStorage.clear();
    localStorage.removeItem(USER_KEY);
    set({ user: null, isAuthenticated: false });
  },
}));

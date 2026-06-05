import { create } from 'zustand';
import { tokenStorage } from '../../../lib/api/axios';
import type { UserProfile } from '../types';

// Phase 1: dùng UserProfile từ types.ts thay cho AuthUser cũ (thêm gmailConnected + createdAt)

interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  setAuth: (user: UserProfile, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

const USER_KEY = 'jt_user';

function loadUserFromStorage(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    // Fail-safe: localStorage bị tay sửa thành garbage → coi như chưa login
    return null;
  }
}

const initialUser = loadUserFromStorage();
const initialAuthenticated =
  initialUser !== null && tokenStorage.getAccess() !== null;

export const useAuthStore = create<AuthState>((set) => ({
  //create<AuthState>(...) — tạo Zustand store
  //(set) -> hàm mặc định khi create zustand store được truyền vào 
  // Mục đích duy nhất: cập nhật state trong store.
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

/*
tại sao ta cần lưu AuthState vào zustand ? trong khi thao tác nó cũng chỉ là ở phạm vi localstorage?

Vì localStorage và Zustand phục vụ 2 mục đích khác nhau:

localStorage — lưu dữ liệu lâu dài, tồn tại khi refresh trang. Nhưng React không biết localStorage thay đổi → component không tự re-render.

Zustand — lưu state trong memory, React theo dõi được → component tự re-render khi state thay đổi.
*/
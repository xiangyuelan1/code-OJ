import { create } from 'zustand';
import { accessAPI } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  points?: number;
  level?: number;
  isActive?: boolean;
  createdAt?: string;
}

interface AccessStatus {
  hasAccess: boolean;
  accessType: string;
  expiresAt?: string;
  message?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessStatus: AccessStatus | null;
  accessLoading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  checkAccess: () => Promise<AccessStatus | null>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  accessStatus: null,
  accessLoading: false,
  setAuth: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    set({ user, token, isAuthenticated: true, accessStatus: null });
  },
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false, accessStatus: null });
  },
  setLoading: (loading) => set({ isLoading: loading }),
  checkAccess: async () => {
    const { isAuthenticated, user } = get();
    if (!isAuthenticated || user?.role === 'ADMIN') {
      const status: AccessStatus = { hasAccess: true, accessType: 'admin' };
      set({ accessStatus: status });
      return status;
    }
    set({ accessLoading: true });
    try {
      const res = await accessAPI.check();
      if (res.success && res.data) {
        const status: AccessStatus = {
          hasAccess: res.data.hasAccess ?? false,
          accessType: res.data.accessType ?? '',
          expiresAt: res.data.expiresAt,
          message: res.data.message,
        };
        set({ accessStatus: status, accessLoading: false });
        return status;
      }
      const status: AccessStatus = { hasAccess: false, accessType: '', message: '无法验证访问权限' };
      set({ accessStatus: status, accessLoading: false });
      return status;
    } catch {
      const status: AccessStatus = { hasAccess: false, accessType: '', message: '访问检查失败' };
      set({ accessStatus: status, accessLoading: false });
      return status;
    }
  },
}));

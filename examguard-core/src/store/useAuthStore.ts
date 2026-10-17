/**
 * useAuthStore - Zustand Store quản lý xác thực & phân quyền
 *
 * Chiến lược bảo mật Token:
 * ─────────────────────────────────────────────────────────────────
 * ✅ Access Token  → Lưu trong RAM (Zustand state) - KHÔNG lưu localStorage
 *                   • Mất khi reload → tự động lấy lại qua /api/auth/refresh
 *                   • JS trên trang KHÔNG thể persist → hacker XSS không lấy được
 *
 * ✅ Refresh Token → Lưu trong httpOnly Cookie (server set)
 *                   • JS không thể đọc document.cookie
 *                   • Tự động được gửi kèm mọi request nhờ withCredentials: true
 *                   • Chỉ bị mất nếu cookie hết hạn hoặc server clear
 *
 * ✅ User info     → Lưu trong sessionStorage (chỉ tab hiện tại, xóa khi đóng tab)
 *                   • Tiện để hydrate nhanh, không chứa secret
 * ─────────────────────────────────────────────────────────────────
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ─── Types ────────────────────────────────────────────────────────
export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string;
  role?: {
    _id: string;
    name: string;
    permissions: string[];
  };
  roles?: any[];
  roleNames?: string[];
  department?: string;
  permissions: string[];
  isFaceRegistered?: boolean;
  facePhoto?: string;
  faceRegisteredAt?: string | Date;
}

interface AuthState {
  // ── Core State ──
  user: AuthUser | null;
  accessToken: string | null;   // Chỉ trong RAM - không persist
  isAuthenticated: boolean;
  isInitialized: boolean;        // Đã chạy xong bootstrap chưa
  loading: boolean;

  // ── Actions ──
  setAccessToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (v: boolean) => void;
  clearSession: () => void;

  // ── Computed helpers (inline) ──
  hasRole: (roleName: string) => boolean;
  can: (permissionCode: string) => boolean;
}

// ─── Session storage helpers (chỉ user info, không chứa token) ────
const SESSION_KEY = 'examguard_session_user';

const saveSessionUser = (user: AuthUser | null) => {
  if (user) {
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); } catch (_) {}
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
};

const loadSessionUser = (): AuthUser | null => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ─── Store Definition ─────────────────────────────────────────────
export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    // ── Initial State ──
    user: loadSessionUser(),            // Từ sessionStorage (chỉ metadata, không token)
    accessToken: null,                  // LUÔN null khi khởi động (RAM only)
    isAuthenticated: false,
    isInitialized: false,
    loading: true,

    // ── Setters ──
    setAccessToken: (token) => {
      set({
        accessToken: token,
        isAuthenticated: !!(token && get().user)
      });
    },

    setUser: (user) => {
      saveSessionUser(user);
      set({
        user,
        isAuthenticated: !!(get().accessToken && user)
      });
    },

    setLoading: (loading) => set({ loading }),

    setInitialized: (v) => set({ isInitialized: v }),

    clearSession: () => {
      saveSessionUser(null);
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isInitialized: true,
        loading: false
      });
    },

    // ── Role Check ──
    hasRole: (roleName: string): boolean => {
      const { user } = get();
      if (!user) return false;
      const target = roleName.toLowerCase().trim();

      const primaryRoleName = typeof user.role === 'object' ? user.role?.name : user.role;
      if (primaryRoleName && String(primaryRoleName).toLowerCase().trim() === target) return true;

      if (user.roles && Array.isArray(user.roles)) {
        const match = user.roles.some((r: any) => {
          const rName = typeof r === 'object' ? r?.name : r;
          return rName && String(rName).toLowerCase().trim() === target;
        });
        if (match) return true;
      }

      if (user.roleNames && Array.isArray(user.roleNames)) {
        if (user.roleNames.some((r: any) => String(r).toLowerCase().trim() === target)) return true;
      }

      return false;
    },

    // ── Permission Check ──
    can: (permissionCode: string): boolean => {
      const { user, hasRole } = get();
      if (!user) return false;

      // Admin có mọi quyền
      if (hasRole('admin') || user.permissions?.includes('all') || user.permissions?.includes('*')) return true;

      // Giảng viên & Cán bộ Coi thi
      if (hasRole('teacher')) {
        const teacherDefaults = [
          'dashboard.view',
          'papers.view', 'papers.manage',
          'exams.view', 'proctor.live', 'proctor.override',
          'grading.review', 'grading.adjust', 'grading.approve',
          'classes.view', 'students.view',
          'face.kyc', 'posts.view'
        ];
        if (teacherDefaults.includes(permissionCode)) return true;
      }

      // Giáo vụ & Quản lý Đào tạo
      if (hasRole('academic')) {
        const academicDefaults = [
          'dashboard.view', 'reports.view',
          'org.manage', 'courses.view', 'courses.manage',
          'classes.view', 'classes.manage',
          'students.view', 'students.manage',
          'teachers.view', 'teachers.manage',
          'rooms.view', 'rooms.manage',
          'exams.view', 'exams.manage',
          'papers.view', 'posts.view', 'posts.manage'
        ];
        if (academicDefaults.includes(permissionCode)) return true;
      }

      // Sinh viên / Thí sinh
      if (hasRole('student')) {
        const studentDefaults = [
          'dashboard.view',
          'exams.view',
          'exam.take',
          'exam.result',
          'face.kyc',
          'posts.view'
        ];
        if (studentDefaults.includes(permissionCode)) return true;
      }

      if (!user.permissions || !Array.isArray(user.permissions)) return false;
      return user.permissions.includes(permissionCode);
    }
  }))
);

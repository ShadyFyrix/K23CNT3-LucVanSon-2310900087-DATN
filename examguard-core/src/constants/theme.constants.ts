/**
 * EXAMGUARD AI — OFFICIAL COLOR SYSTEM & DESIGN TOKENS
 * Phong cách: Academic Enterprise & Biometric Security (Trầm, nghiêm túc, dịu mắt)
 * Đường dẫn khuyến nghị: src/constants/theme.constants.ts
 */

export const EXAMGUARD_COLORS = {
  /**
   * 1. MÀU CHỦ ĐẠO (PRIMARY - DEEP ACADEMIC NAVY)
   * Dùng cho Header, Sidebar chính, Nút bấm chính (Primary CTA), Tiêu đề thương hiệu
   */
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#2563EB',
    600: '#1D4ED8', // Màu nút bấm chính & Active state
    700: '#1E40AF', // Màu chủ đạo chuẩn (Brand Primary)
    800: '#1E3A8A', // Màu Header / Khu vực điều hướng trọng tâm
    900: '#172554', // Nền tối sâu
    DEFAULT: '#1E40AF',
  },

  /**
   * 2. MÀU ĐIỂM NHẤN SINH TRẮC HỌC AI (SECONDARY - MUTED BIOMETRIC TEAL)
   * Dùng cho khung quét Face KYC 5 góc, đường lưới 3D Pose, chỉ báo Liveness
   */
  biometric: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488', // Màu chuẩn cho khung nhận diện AI (Dịu mắt, không chói)
    700: '#0F766E',
    800: '#115E59',
    DEFAULT: '#0D9488',
  },

  /**
   * 3. HỆ MÀU NỀN & BỀ MẶT TRUNG TÍNH (NEUTRAL SLATE)
   * Tối ưu chống mỏi mắt cho thí sinh làm bài thi (65%-35% Split View) & Giám thị
   */
  slate: {
    50: '#F8FAFC',  // Nền tổng thể giao diện làm bài (Light mode)
    100: '#F1F5F9', // Nền khu vực đề thi / Khung phụ
    200: '#E2E8F0', // Đường viền (Border) chuẩn
    300: '#CBD5E1', // Nút/Ô câu hỏi chưa chọn
    400: '#94A3B8', // Icon phụ / Placeholder
    500: '#64748B', // Chữ mô tả phụ (Muted text)
    600: '#475569', // Chữ nội dung đề thi (Secondary text)
    700: '#334155', // Nền Card trong chế độ Giám sát tối
    800: '#1E293B', // Nền Panel Giám thị (Proctor Surface)
    900: '#0F172A', // Nền chính Dashboard Giám sát 3D / Phòng chờ
    950: '#020617',
  },

  /**
   * 4. MÀU NGỮ NGHĨA & TRẠNG THÁI HỆ THỐNG (SEMANTIC STATUS)
   * Đã giảm độ chói để giữ sự điềm tĩnh trong phòng thi
   */
  status: {
    success: {
      light: '#ECFDF5',
      border: '#A7F3D0',
      main: '#059669', // Đã KYC APPROVED / Check-in hợp lệ / Đáp án đúng
      dark: '#065F46',
    },
    warning: {
      light: '#FFFBEB',
      border: '#FDE68A',
      main: '#D97706', // Nghi vấn (Suspicious) / Cờ xem lại câu hỏi / Đi muộn
      dark: '#92400E',
    },
    danger: {
      light: '#FEF2F2',
      border: '#FECACA',
      main: '#DC2626', // Vi phạm AI (Violation) / Tráo người (Impersonation)
      dark: '#991B1B',
    },
    info: {
      light: '#F0F9FF',
      border: '#BAE6FD',
      main: '#0284C7', // Đã nộp bài (Checkout) / Thông báo hệ thống
      dark: '#075985',
    },
    proctorExemption: {
      light: '#F5F3FF',
      border: '#DDD6FE',
      main: '#6D28D9', // Miễn trừ Giám thị ghé bàn (STAFF_EXEMPTION - 0đ trừ)
      dark: '#4C1D95',
    },
  },

  /**
   * 5. MÀU TRẠNG THÁI BÀN THI 3D & MA TRẬN CÂU HỎI (DESK & QUESTION MATRIX)
   * Ánh xạ trực tiếp với sinh_vien_ca_thi.trang_thai trong SYSTEM_BLUEPRINT
   */
  examDeskState: {
    not_checkin: '#94A3B8',       // Xám đá: Chưa check-in
    checkin: '#059669',           // Xanh ngọc trầm: Đang làm bài bình thường
    suspicious: '#D97706',        // Vàng hổ phách: Điểm uy tín < 50 hoặc nghi vấn
    suspended: '#EA580C',         // Cam trầm: Đình chỉ thi / Khóa bài làm
    checkout: '#0284C7',          // Xanh dương dịu: Đã nộp bài hoàn tất
    violation_blink: '#DC2626',   // Đỏ trầm: Phát hiện vi phạm mới
    proctor_override: '#6D28D9',  // Tím nhã nhặn: Cán bộ coi thi đang kiểm tra tại bàn
  },

  /**
   * 6. THANG MÀU ĐIỂM UY TÍN (REPUTATION / TRUST SCORE 0 - 100)
   */
  trustScore: {
    excellent: '#059669', // 90 - 100 điểm (An toàn tuyệt đối - Chu kỳ cam 20s)
    good: '#0D9488',      // 70 - 89 điểm (Ổn định - Chu kỳ cam 15s)
    warning: '#D97706',   // 50 - 69 điểm (Cần lưu ý - Chu kỳ cam 10s)
    critical: '#DC2626',  // < 50 điểm (Báo động đỏ / Nghi vấn cao)
  },
} as const;

// Export Type để hỗ trợ Autocomplete & Type-Safety trên toàn bộ dự án React
export type ExamGuardColorTheme = typeof EXAMGUARD_COLORS;
export type DeskStatusKey = keyof typeof EXAMGUARD_COLORS.examDeskState;

/**
 * Hàm Helper lấy màu tự động theo Điểm Uy Tín (diem_uy_tin: 0 -> 100)
 */
export const getTrustScoreColor = (score: number): string => {
  if (score >= 90) return EXAMGUARD_COLORS.trustScore.excellent;
  if (score >= 70) return EXAMGUARD_COLORS.trustScore.good;
  if (score >= 50) return EXAMGUARD_COLORS.trustScore.warning;
  return EXAMGUARD_COLORS.trustScore.critical;
};

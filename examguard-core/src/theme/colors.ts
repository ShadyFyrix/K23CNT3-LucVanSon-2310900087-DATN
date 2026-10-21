/**
 * EXAMGUARD AI — HỆ THỐNG MÀU CHỦ ĐẠO TOÀN DIỆN (SYSTEM COLOR PALETTE)
 * Thiết kế theo chuẩn Enterprise Academic / Defense:
 * - Tôn nghiêm, học thuật, đáng tin cậy.
 * - Tuyệt đối KHÔNG sử dụng màu loè loẹt, chói mắt (No neon / gaudy colors).
 * - Lưu trữ dưới dạng biến TypeScript có định kiểu tĩnh nghiêm ngặt (Strictly Typed).
 */

export interface ColorShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface SystemThemeColors {
  /** Màu chủ đạo nhận diện thương hiệu ExamGuard AI (Deep Academic Navy / Royal Slate) */
  primary: ColorShades;
  /** Nền tảng trung tính (Neutral Slate / Obsidian) */
  neutral: ColorShades;
  /** Màu trạng thái thành công / Đạt kiểm tra sinh trắc học / Đã nộp bài */
  success: ColorShades;
  /** Màu trạng thái cảnh báo / Nhắc nhở quy chế / Rà soát */
  warning: ColorShades;
  /** Màu trạng thái vi phạm / Báo động đỏ / Đình chỉ thi */
  danger: ColorShades;
  /** Màu chỉ dẫn thông tin hệ thống / Lịch thi */
  info: ColorShades;
  /** Màu bề mặt giao diện (Surface & Backgrounds) */
  surface: {
    darkBg: string;
    darkCard: string;
    darkCardHover: string;
    darkBorder: string;
    lightBg: string;
    lightCard: string;
    lightCardHover: string;
    lightBorder: string;
  };
  /** Màu chữ chuẩn công thái học (Ergonomic Typography) */
  text: {
    darkPrimary: string;
    darkSecondary: string;
    darkMuted: string;
    lightPrimary: string;
    lightSecondary: string;
    lightMuted: string;
  };
}

export const THEME_COLORS: SystemThemeColors = {
  // ── MÀU CHỦ ĐẠO: DEEP ACADEMIC NAVY / SLATE BLUE (Trang nghiêm, tin cậy, không loè loẹt) ──
  primary: {
    50: '#F0F5FF',
    100: '#E0EBFE',
    200: '#BAD3FD',
    300: '#8FB8FA',
    400: '#5F95F5',
    500: '#2563EB', // Blue-600 chuẩn quốc tế
    600: '#1D4ED8',
    700: '#1E40AF', // Deep Academic Navy
    800: '#1E3A8A', // Deep Blue 800
    900: '#172554', // Dark Obsidian Navy
    950: '#0A1128', // Core Brand Foundation
  },

  // ── MÀU TRUNG TÍNH: SLATE METALLIC (Công thái học, êm mắt khi làm bài thi 180 phút) ──
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#0B0F19', // Nền tối triệt tiêu mỏi mắt
  },

  // ── MÀU THÀNH CÔNG: SUBTLE EMERALD (Xanh ngọc trầm, chuẩn khảo thí) ──
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669', // Điểm danh thành công, KYC hợp lệ
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
    950: '#022C22',
  },

  // ── MÀU CẢNH BÁO: MUTED AMBER (Vàng hổ phách dịu, cảnh báo nghiêm túc) ──
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706', // Nhắc nhở giám thị, trừ điểm nhẹ
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
    950: '#451A03',
  },

  // ── MÀU NGUY CẤP: CRIMSON RED (Đỏ thẫm cảnh báo an ninh, không chói loá) ──
  danger: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626', // Vi phạm quy chế thi, phát hiện tráo người
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
    950: '#450A0A',
  },

  // ── MÀU THÔNG TIN: SLATE CYAN (Chỉ dẫn khảo thí) ──
  info: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    200: '#BAE6FD',
    300: '#7DD3FC',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
    700: '#0369A1',
    800: '#075985',
    900: '#0C4A6E',
    950: '#082F49',
  },

  // ── MÀU BỀ MẶT BỀ BỈ (SURFACES) ──
  surface: {
    darkBg: '#0B0F19',          // Nền phòng thi tối
    darkCard: '#131B2E',        // Khối đề thi & phiếu trả lời
    darkCardHover: '#1B253F',   // Trạng thái hover câu hỏi
    darkBorder: '#1E293B',      // Đường biên thanh mảnh tinh tế
    lightBg: '#F8FAFC',         // Nền ban ngày
    lightCard: '#FFFFFF',       // Thẻ câu hỏi sáng
    lightCardHover: '#F1F5F9',  // Trạng thái hover sáng
    lightBorder: '#E2E8F0',     // Viền sáng
  },

  // ── MÀU CHỮ (TYPOGRAPHY) ──
  text: {
    darkPrimary: '#F8FAFC',     // Chữ chính (Trắng kem, không chói)
    darkSecondary: '#94A3B8',   // Chữ phụ (Xám bạc)
    darkMuted: '#64748B',       // Chữ ghi chú (Xám chì)
    lightPrimary: '#0F172A',    // Chữ chính ban ngày
    lightSecondary: '#475569',  // Chữ phụ ban ngày
    lightMuted: '#94A3B8',      // Chữ ghi chú ban ngày
  }
} as const;

/** Hằng số tiện ích truy cập nhanh màu chủ đạo hệ thống */
export const BRAND_PRIMARY = THEME_COLORS.primary[700]; // #1E40AF (Deep Academic Navy)
export const BRAND_ACCENT = THEME_COLORS.primary[500];  // #2563EB (Royal Interactive Blue)
export const BRAND_BG_DARK = THEME_COLORS.surface.darkBg; // #0B0F19
export const BRAND_CARD_DARK = THEME_COLORS.surface.darkCard; // #131B2E
export const BRAND_BORDER_DARK = THEME_COLORS.surface.darkBorder; // #1E293B

export type ThemeColorsType = typeof THEME_COLORS;

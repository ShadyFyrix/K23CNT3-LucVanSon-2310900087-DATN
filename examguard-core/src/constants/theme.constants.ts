/**
 * EXAMGUARD AI — OFFICIAL COLOR SYSTEM & DESIGN TOKENS
 * Phong cách: Cyber-Electric Dark Luxury & Frosted Glass
 * Khóa màu chuẩn: #03195b, #0b2cb1, #1951fc, #3781fc, #cbe9fd (Zir Tech / Basel Design 2026)
 * Điểm nhấn ánh tím Neon: #7c3aed, #a855f7 (Solana NFT / High-Tech Futuristic)
 */

export const EXAMGUARD_COLORS = {
  /**
   * 1. BẢNG MÀU CHỦ ĐẠO (PRIMARY GRADIENT STACK TỪ ẢNH MẪU 1)
   */
  palette: {
    sapphireDeep: '#03195b',  // Cấp 1: Deep Sapphire Midnight Base
    royalCobalt: '#0b2cb1',   // Cấp 2: Royal Electric Blue
    electricBlue: '#1951fc',  // Cấp 3: Vibrant Electric Blue (Màu lõi)
    azureGlow: '#3781fc',     // Cấp 4 & 5: Radiant Sky Azure Glow
    frostedIce: '#cbe9fd',    // Cấp 6: Frosted Ice Specular Highlight
  },

  primary: {
    50: '#F0F7FF',
    100: '#CBE9FD', // Frosted Ice
    200: '#93C5FD',
    300: '#60A5FA',
    400: '#3781FC', // Azure Glow
    500: '#1951FC', // Vibrant Electric Blue (Primary Brand CTA)
    600: '#0B2CB1', // Royal Electric Blue
    700: '#08218A',
    800: '#03195B', // Deep Sapphire
    900: '#020E38',
    950: '#01071F',
    DEFAULT: '#1951FC',
  },

  /**
   * 2. MÀU ĐIỂM NHẤN TÍM NEON & AMBIENT GLOW (TỪ ẢNH MẪU 2)
   */
  neon: {
    violet: '#7C3AED',
    purple: '#8B5CF6',
    glow: '#A855F7',
    fuchsia: '#C026D3',
    DEFAULT: '#7C3AED',
  },

  /**
   * 3. MÀU SINH TRẮC HỌC AI & TRẠNG THÁI KHẢO THÍ (BIOMETRICS)
   */
  biometric: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    DEFAULT: '#0D9488',
  },

  /**
   * 4. HỆ MÀU BỀ MẶT TỐI DEEP OBSIDIAN (TỪ ẢNH MẪU 2)
   */
  surface: {
    darkBg: '#070814',       // Nền đen sâu thăm thẳm
    darkCanvas: '#0A0C1E',   // Canvas làm việc
    darkCard: '#11142F',     // Thẻ Bento Glass
    darkCardSub: '#171B3E',  // Thẻ con / Input
    darkBorder: 'rgba(255, 255, 255, 0.08)',
    glowBorder: 'rgba(25, 81, 252, 0.35)',
    specular: 'rgba(203, 233, 253, 0.2)',
  },

  /**
   * 5. MÀU TRẠNG THÁI CHUẨN
   */
  status: {
    success: {
      light: '#ECFDF5',
      border: '#A7F3D0',
      main: '#10B981',
      dark: '#065F46',
    },
    warning: {
      light: '#FFFBEB',
      border: '#FDE68A',
      main: '#F59E0B',
      dark: '#92400E',
    },
    danger: {
      light: '#FEF2F2',
      border: '#FECACA',
      main: '#EF4444',
      dark: '#991B1B',
    },
    info: {
      light: '#F0F9FF',
      border: '#BAE6FD',
      main: '#3781FC',
      dark: '#0B2CB1',
    },
    proctorExemption: {
      light: '#F5F3FF',
      border: '#DDD6FE',
      main: '#8B5CF6',
      dark: '#4C1D95',
    },
  },
};

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EXAMGUARD_COLORS } from '../../constants/theme.constants';

export type BiometricScanStatus = 'idle' | 'scanning' | 'success' | 'failed';

interface FaceIdVerificationAnimationProps {
  status?: BiometricScanStatus;
  similarity?: number | null;
  size?: number; // default 160
  label?: string;
  showLivenessRing?: boolean;
  className?: string;
}

/**
 * Component Hiệu ứng Sinh Trắc Học Face ID Verification Chuẩn Quốc Tế
 * Tham chiếu phong cách: IconScout Lottie Face ID Verification
 * Tự động đồng bộ với EXAMGUARD_COLORS (Muted Biometric Teal #0D9488 & Deep Academic Navy #1E40AF)
 */
export const FaceIdVerificationAnimation: React.FC<FaceIdVerificationAnimationProps> = ({
  status = 'idle',
  similarity = null,
  size = 160,
  label,
  showLivenessRing = true,
  className = ''
}) => {
  const isScanning = status === 'scanning';
  const isSuccess = status === 'success';
  const isFailed = status === 'failed';

  // Màu sắc chủ đạo phản ánh trạng thái
  const bracketColor = isSuccess
    ? EXAMGUARD_COLORS.status.success.main
    : isFailed
    ? EXAMGUARD_COLORS.status.danger.main
    : isScanning
    ? EXAMGUARD_COLORS.biometric[500]
    : EXAMGUARD_COLORS.primary[500];

  const laserColor = isSuccess
    ? EXAMGUARD_COLORS.status.success.main
    : isFailed
    ? EXAMGUARD_COLORS.status.danger.main
    : EXAMGUARD_COLORS.biometric[400];

  return (
    <div className={`relative flex flex-col items-center justify-center select-none ${className}`}>
      {/* Vòng hào quang xung quanh */}
      <AnimatePresence>
        {isScanning && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{
              scale: [0.95, 1.15, 0.95],
              opacity: [0.15, 0.35, 0.15]
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            style={{
              width: size * 1.35,
              height: size * 1.35,
              backgroundColor: EXAMGUARD_COLORS.biometric[500]
            }}
            className="absolute rounded-full blur-2xl pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* SVG Canvas chứa khung Face ID và các điểm mốc sinh trắc học */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={
          isFailed
            ? { x: [-6, 6, -4, 4, -2, 2, 0] }
            : isSuccess
            ? { scale: [1, 1.05, 1] }
            : {}
        }
        transition={{ duration: 0.5 }}
        className="relative z-10"
      >
        <defs>
          {/* Gradient cho tia laser quét */}
          <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={laserColor} stopOpacity="0" />
            <stop offset="25%" stopColor={laserColor} stopOpacity="0.6" />
            <stop offset="50%" stopColor={laserColor} stopOpacity="1" />
            <stop offset="75%" stopColor={laserColor} stopOpacity="0.6" />
            <stop offset="100%" stopColor={laserColor} stopOpacity="0" />
          </linearGradient>

          {/* Ánh sáng vùng quét mờ dưới tia laser */}
          <linearGradient id="laserBeamGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={laserColor} stopOpacity="0.35" />
            <stop offset="100%" stopColor={laserColor} stopOpacity="0" />
          </linearGradient>

          <filter id="biometricGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── 1. VÒNG QUAY LIVENESS ANTI-SPOOFING ── */}
        {showLivenessRing && (
          <motion.circle
            cx="100"
            cy="100"
            r="92"
            stroke={bracketColor}
            strokeWidth="1.5"
            strokeDasharray="4 8"
            strokeOpacity="0.3"
            animate={isScanning ? { rotate: 360 } : { rotate: 0 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: 'center' }}
          />
        )}

        {/* ── 2. BỐN KHUNG GÓC FACE ID BRACKETS (Chuẩn Apple Face ID) ── */}
        {/* Góc trên bên trái */}
        <motion.path
          d="M 28 58 L 28 38 C 28 32.477 32.477 28 38 28 L 58 28"
          stroke={bracketColor}
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#biometricGlow)"
          animate={isScanning ? { opacity: [0.8, 1, 0.8] } : { opacity: 0.9 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        {/* Góc trên bên phải */}
        <motion.path
          d="M 142 28 L 162 28 C 167.523 28 172 32.477 172 38 L 172 58"
          stroke={bracketColor}
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#biometricGlow)"
          animate={isScanning ? { opacity: [0.8, 1, 0.8] } : { opacity: 0.9 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        {/* Góc dưới bên trái */}
        <motion.path
          d="M 28 142 L 28 162 C 28 167.523 32.477 172 38 172 L 58 172"
          stroke={bracketColor}
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#biometricGlow)"
          animate={isScanning ? { opacity: [0.8, 1, 0.8] } : { opacity: 0.9 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        {/* Góc dưới bên phải */}
        <motion.path
          d="M 172 142 L 172 162 C 172 167.523 167.523 172 162 172 L 142 172"
          stroke={bracketColor}
          strokeWidth="4"
          strokeLinecap="round"
          filter="url(#biometricGlow)"
          animate={isScanning ? { opacity: [0.8, 1, 0.8] } : { opacity: 0.9 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* ── 3. KHUÔN MẶT ĐIỂM MỐC SINH TRẮC HỌC (3D Biometric Facial Mesh) ── */}
        {!isSuccess && (
          <g opacity={isScanning ? 0.9 : 0.6}>
            {/* Đường viền khuôn mặt hình oval mềm */}
            <path
              d="M 68 85 C 68 62 82 50 100 50 C 118 50 132 62 132 85 C 132 118 116 138 100 144 C 84 138 68 118 68 85 Z"
              stroke={bracketColor}
              strokeWidth="1.5"
              strokeDasharray="2 4"
              fill="none"
              opacity="0.5"
            />

            {/* Mắt trái */}
            <motion.ellipse
              cx="84"
              cy="84"
              rx="4"
              ry="3"
              fill={bracketColor}
              animate={isScanning ? { scale: [1, 1.25, 1] } : {}}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            {/* Mắt phải */}
            <motion.ellipse
              cx="116"
              cy="84"
              rx="4"
              ry="3"
              fill={bracketColor}
              animate={isScanning ? { scale: [1, 1.25, 1] } : {}}
              transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
            />

            {/* Sống mũi (Nose Bridge) */}
            <path
              d="M 100 82 L 100 102 L 96 106 L 104 106"
              stroke={bracketColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Vòm miệng (Lips arc) */}
            <path
              d="M 88 122 Q 100 128 112 122"
              stroke={bracketColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
            />

            {/* Các điểm mốc Nodal Points 3D phát sáng */}
            <circle cx="68" cy="85" r="2" fill={laserColor} opacity="0.8" />
            <circle cx="132" cy="85" r="2" fill={laserColor} opacity="0.8" />
            <circle cx="100" cy="50" r="2" fill={laserColor} opacity="0.8" />
            <circle cx="100" cy="144" r="2.5" fill={laserColor} opacity="0.9" />
            <circle cx="84" cy="72" r="1.5" fill={bracketColor} opacity="0.6" />
            <circle cx="116" cy="72" r="1.5" fill={bracketColor} opacity="0.6" />
          </g>
        )}

        {/* ── 4. TIA LASER QUÉT SINH TRẮC HỌC CHUYỂN ĐỘNG LÊN XUỐNG ── */}
        {isScanning && (
          <motion.g
            animate={{ y: [35, 135, 35] }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            {/* Chùm sáng đổ bóng theo vệt quét */}
            <rect x="34" y="0" width="132" height="18" fill="url(#laserBeamGrad)" />
            {/* Thanh laser ngang */}
            <line
              x1="34"
              y1="0"
              x2="166"
              y2="0"
              stroke="url(#laserGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
              filter="url(#biometricGlow)"
            />
          </motion.g>
        )}

        {/* ── 5. KẾT QUẢ THÀNH CÔNG: DẤU CHECKMARK VẼ NÉT MƯỢT MÀ ── */}
        {isSuccess && (
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 200 }}
          >
            {/* Vòng tròn nền xanh ngọc */}
            <circle
              cx="100"
              cy="100"
              r="40"
              fill={EXAMGUARD_COLORS.status.success.light}
              stroke={EXAMGUARD_COLORS.status.success.main}
              strokeWidth="2.5"
            />
            {/* Dấu tích hợp lệ */}
            <motion.path
              d="M 86 100 L 96 110 L 116 88"
              stroke={EXAMGUARD_COLORS.status.success.main}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            />
          </motion.g>
        )}
      </motion.svg>

      {/* ── THÔNG BÁO TIẾN ĐỘ & ĐỘ TƯƠNG ĐỒNG SIMILARITY ── */}
      <div className="mt-3 text-center space-y-1">
        {similarity !== null && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold shadow-sm ${
              isSuccess
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
            }`}
          >
            <span>ArcFace 512D:</span>
            <span>{similarity}%</span>
          </motion.div>
        )}

        {label && (
          <p
            className={`text-xs font-medium tracking-wide ${
              isSuccess
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : isFailed
                ? 'text-rose-600 dark:text-rose-400 font-bold'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {label}
          </p>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import {
  Zap,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  User,
  LayoutGrid,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { EXAMGUARD_COLORS } from '../../../constants/theme.constants';
import { FaceIdVerificationAnimation } from '../../../components/biometrics/FaceIdVerificationAnimation';

export interface FaceCheckInExamData {
  session: {
    id: string;
    code: string;
    title: string;
    roomCode: string;
    roomName: string;
  };
  student: {
    id: string;
    name: string;
    studentCode: string;
    email?: string;
  };
  examStudent: {
    id: string;
    candidateCode: string;
    seatRow: number;
    seatCol: number;
    seatPin?: string;
    trustScore: number;
  };
}

interface FaceCheckInGateProps {
  examData: FaceCheckInExamData;
  bindVideoRef: (el: HTMLVideoElement | null) => void;
  cameraActive: boolean;
  isFaceCheckingIn: boolean;
  faceCheckinError: string | null;
  faceSimilarity: number | null;
  onFaceCheckIn: () => void;
}

/**
 * Cổng Check-In Sinh Trắc Học & Xác Thực Chỗ Ngồi (Face Check-In Gate)
 * Tuân thủ Single Responsibility Principle (SRP)
 * Tích hợp FaceIdVerificationAnimation (IconScout Lottie Style) & Hỗ trợ Chế độ Sáng / Tối
 */
export const FaceCheckInGate: React.FC<FaceCheckInGateProps> = ({
  examData,
  bindVideoRef,
  cameraActive,
  isFaceCheckingIn,
  faceCheckinError,
  faceSimilarity,
  onFaceCheckIn
}) => {
  const { isDark, toggleTheme } = useTheme();

  const scanStatus = isFaceCheckingIn
    ? 'scanning'
    : faceSimilarity !== null
    ? 'success'
    : faceCheckinError
    ? 'failed'
    : 'idle';

  return (
    <div
      className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 md:p-8 font-sans relative overflow-hidden select-none transition-colors duration-200 ${
        isDark ? 'bg-[#0B0F19] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* Glow Background Effect (Muted Biometric Teal & Deep Navy) */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none opacity-25"
        style={{ backgroundColor: EXAMGUARD_COLORS.biometric[600] }}
      />

      {/* ── TOP HEADER ── */}
      <div
        className={`flex items-center justify-between border-b pb-4 max-w-5xl mx-auto w-full relative z-10 ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center space-x-3.5">
          <img
            src="/logo.png"
            alt="ExamGuard AI"
            className="w-10 h-10 object-contain rounded-2xl p-1 bg-white/10 dark:bg-white/5 border border-slate-300/30 shadow-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                EXAMGUARD <span className="text-blue-600 dark:text-blue-400">AI</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping" />
                <span>CỔNG CHECK-IN SINH TRẮC HỌC</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Xác thực khuôn mặt & Đối chiếu sơ đồ chỗ ngồi trước khi mở đề thi
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span>Ca thi: <b className="text-slate-900 dark:text-white">{examData.session.code}</b></span>
            <span>•</span>
            <span>Phòng: <b className="text-teal-600 dark:text-teal-400">{examData.session.roomName || examData.session.roomCode}</b></span>
          </div>

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            title={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? 'border-slate-800 text-amber-400 hover:bg-slate-900'
                : 'border-slate-200 text-blue-600 hover:bg-slate-100'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── CENTER GRID ── */}
      <div className="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 my-auto relative z-10 py-4">
        {/* Left: Camera Feed & Biometric HUD (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
          <div
            className={`relative rounded-3xl overflow-hidden aspect-video sm:aspect-[4/3] flex items-center justify-center border-2 shadow-2xl transition-colors ${
              isDark
                ? 'bg-slate-950 border-slate-800/80 shadow-black/60'
                : 'bg-slate-900 border-slate-300 shadow-slate-300/40'
            }`}
          >
            {/* Webcam Live Video */}
            <video
              ref={bindVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* IconScout Biometric Face ID Verification Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <FaceIdVerificationAnimation
                status={scanStatus}
                similarity={faceSimilarity}
                size={220}
                showLivenessRing={true}
              />
            </div>

            {/* HUD Status Badges */}
            <div className="absolute top-3.5 left-3.5 flex items-center space-x-2 bg-slate-950/80 backdrop-blur px-3 py-1 rounded-full border border-slate-700/60 text-xs">
              <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-semibold text-emerald-400 text-[11px] uppercase tracking-wider">
                {cameraActive ? 'Camera AI Sẵn Sàng' : 'Đang kết nối Camera...'}
              </span>
            </div>

            <div className="absolute top-3.5 right-3.5 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded text-[11px] text-slate-300 font-mono border border-slate-800 flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
              <span>Liveness: Active • 30 FPS</span>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={onFaceCheckIn}
              disabled={isFaceCheckingIn || !cameraActive || faceSimilarity !== null}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-xs uppercase tracking-wider shadow-xl transition-all flex items-center justify-center space-x-2.5 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer ${
                faceSimilarity !== null
                  ? 'bg-emerald-600 text-white shadow-emerald-600/25'
                  : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 hover:from-blue-600 hover:to-teal-600 text-white shadow-blue-700/25'
              }`}
            >
              {isFaceCheckingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>ĐANG ĐỐI CHIẾU ARCFACE 512D & CHỖ NGỒI...</span>
                </>
              ) : faceSimilarity !== null ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>XÁC THỰC THÀNH CÔNG • ĐANG MỞ ĐỀ THI</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>QUÉT KHUÔN MẶT ĐIỂM DANH VÀO BÀI THI</span>
                </>
              )}
            </button>

            {faceCheckinError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-400 flex items-center space-x-2 animate-in shake">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{faceCheckinError}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Candidate Card & Desk Matrix Assignment (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-4">
          <div
            className={`border rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl transition-colors ${
              isDark ? 'bg-[#131B2E] border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block mb-1">
                HỒ SƠ THÍ SINH
              </span>
              <div className="flex items-center space-x-3.5 pt-1">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-teal-600/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-base">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {examData.student.name}
                  </h3>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    MSSV: {examData.student.studentCode}
                  </p>
                  <p className="text-xs text-slate-400">
                    SBD: <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{examData.examStudent.candidateCode}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Desk Map Coordinates */}
            <div
              className={`p-4 rounded-2xl border relative overflow-hidden transition-colors ${
                isDark
                  ? 'bg-gradient-to-br from-blue-950/30 via-slate-900/50 to-teal-950/30 border-blue-500/20'
                  : 'bg-gradient-to-br from-blue-50/50 via-slate-50 to-teal-50/50 border-blue-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="flex items-center space-x-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>VỊ TRÍ CHỖ NGỒI QUY ĐỊNH</span>
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-normal">
                    Đã phân bổ
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                  <div className={`p-2 rounded-xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <span className="text-[10px] text-slate-400 block">DÃY/HÀNG</span>
                    <span className="text-lg font-black text-slate-900 dark:text-white">
                      H{examData.examStudent.seatRow}
                    </span>
                  </div>
                  <div className={`p-2 rounded-xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <span className="text-[10px] text-slate-400 block">CỘT BÀN</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                      C{examData.examStudent.seatCol}
                    </span>
                  </div>
                  <div className={`p-2 rounded-xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <span className="text-[10px] text-slate-400 block">MÃ PIN</span>
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {examData.examStudent.seatPin || '4821'}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center pt-1">
                  Thí sinh ngồi đúng bàn <b>H{examData.examStudent.seatRow}-C{examData.examStudent.seatCol}</b> theo sơ đồ phòng thi
                </p>
              </div>
            </div>

            {/* Regulations Note */}
            <div
              className={`p-3 rounded-2xl border text-[11px] space-y-1 ${
                isDark
                  ? 'bg-slate-950/40 border-slate-800/80 text-slate-400'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className="font-semibold block text-slate-700 dark:text-slate-300">
                Quy định xác thực sinh trắc học:
              </span>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Khuôn mặt phải nhìn thẳng, cởi khẩu trang và kính râm.</li>
                <li>Camera AI sẽ đối chiếu liên tục trong suốt 100% thời gian thi.</li>
                <li>Nếu tráo người thi hộ, hệ thống sẽ tự động đình chỉ bài thi.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-600 relative z-10 pt-2 font-mono">
        ExamGuard AI • Cổng Khảo Thí Bảo Mật & Chống Gian Lận Sinh Trắc Học v3.3
      </div>
    </div>
  );
};

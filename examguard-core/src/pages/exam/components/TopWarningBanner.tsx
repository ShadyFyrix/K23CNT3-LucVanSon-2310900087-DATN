import React from 'react';
import { ShieldAlert, Check } from 'lucide-react';

export interface SecurityAlertData {
  eventType?: string;
  title: string;
  message: string;
  penalty: number;
  newScore: number;
}

export interface DirectWarningData {
  message: string;
  timestamp?: Date;
}

interface TopWarningBannerProps {
  securityAlert: SecurityAlertData | null;
  directWarning: DirectWarningData | null;
  onDismissSecurityAlert: () => void;
  onDismissDirectWarning: () => void;
}

/**
 * Component Hiển thị Thanh Thông Báo Vi Phạm & Cảnh Báo Trên Top Màn Hình
 * Tuân thủ Single Responsibility Principle (SRP) & Không cản trở thí sinh làm bài
 */
export const TopWarningBanner: React.FC<TopWarningBannerProps> = ({
  securityAlert,
  directWarning,
  onDismissSecurityAlert,
  onDismissDirectWarning,
}) => {
  if (!securityAlert && !directWarning) return null;

  return (
    <>
      {/* ── THÔNG BÁO CẢNH BÁO AN NINH TRÊN TOP MÀN HÌNH ── */}
      {securityAlert && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[95%] max-w-4xl bg-slate-900/95 border-2 border-red-500/90 backdrop-blur-md rounded-2xl shadow-2xl shadow-red-950/80 p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 text-white animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/20 text-red-400 border border-red-500/30 uppercase tracking-wider">
                  CẢNH BÁO VI PHẠM
                </span>
                <span className="text-xs sm:text-sm font-bold text-white truncate">
                  {securityAlert.title}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-red-200 truncate mt-0.5 font-medium">
                "{securityAlert.message}"
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <div className="hidden sm:flex items-center space-x-2 bg-slate-950/80 px-3 py-1 rounded-xl border border-slate-800 text-xs">
              <span className="text-red-400 font-black">-{securityAlert.penalty}đ</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400 text-[11px]">Uy tín:</span>
              <span
                className={`font-black ${
                  securityAlert.newScore >= 80
                    ? 'text-emerald-400'
                    : securityAlert.newScore >= 50
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {securityAlert.newScore}/100
              </span>
            </div>

            <button
              onClick={onDismissSecurityAlert}
              className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl transition shadow-md shadow-red-600/30 flex items-center space-x-1 uppercase tracking-wider"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Đã hiểu</span>
            </button>
          </div>
        </div>
      )}

      {/* ── CẢNH BÁO TRỰC TIẾP TỪ GIÁM THỊ TRÊN TOP MÀN HÌNH ── */}
      {directWarning && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[95%] max-w-4xl bg-slate-900/95 border-2 border-amber-500/90 backdrop-blur-md rounded-2xl shadow-2xl shadow-amber-950/80 p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 text-white animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                  NHẮC NHỞ TỪ GIÁM THỊ
                </span>
                <span className="text-xs sm:text-sm font-bold text-amber-300 truncate">
                  Yêu cầu tuân thủ quy chế phòng thi
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-amber-100 truncate mt-0.5 font-medium">
                "{directWarning.message}"
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <span className="hidden sm:inline text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
              -5 điểm uy tín
            </span>
            <button
              onClick={onDismissDirectWarning}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition shadow-md shadow-amber-500/20 flex items-center space-x-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Tiếp tục làm bài</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

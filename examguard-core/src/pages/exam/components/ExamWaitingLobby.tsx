import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Calendar,
  Clock,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Sun,
  Moon,
  ScanFace,
  LayoutGrid,
  FileText,
  Eye,
  AlertCircle,
  HelpCircle,
  Lock,
  Hourglass
} from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { StudentSessionItem } from '../TakeExam';

interface ExamWaitingLobbyProps {
  studentProfile: {
    id?: string;
    name?: string;
    fullName?: string;
    studentCode?: string;
    className?: string;
    departmentName?: string;
  };
  sessions: StudentSessionItem[];
  activeSession: StudentSessionItem | null;
  isLoading: boolean;
  onSelectSession: (sessionItem: StudentSessionItem) => void;
  onRefresh: () => void;
  onBackToPortal: () => void;
}

export const ExamWaitingLobby: React.FC<ExamWaitingLobbyProps> = ({
  studentProfile,
  sessions,
  activeSession,
  isLoading,
  onSelectSession,
  onRefresh,
  onBackToPortal
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE_UPCOMING' | 'ENDED'>('ALL');

  const filteredSessions = useMemo(() => {
    if (filterTab === 'ACTIVE_UPCOMING') {
      return sessions.filter(s => !s.isEnded && s.status !== 'SUBMITTED');
    }
    if (filterTab === 'ENDED') {
      return sessions.filter(s => s.isEnded || s.status === 'SUBMITTED');
    }
    return sessions;
  }, [sessions, filterTab]);

  const activeCount = sessions.filter(s => s.isHappening).length;
  const upcomingCount = sessions.filter(s => s.isUpcoming).length;
  const endedCount = sessions.filter(s => s.isEnded || s.status === 'SUBMITTED').length;

  return (
    <div
      className={`min-h-screen flex flex-col justify-between font-sans relative overflow-x-hidden transition-colors duration-200 select-none ${
        isDark ? 'bg-[#0B0F19] text-slate-100' : 'bg-slate-50 text-slate-800'
      }`}
    >
      {/* Background Ambient Glows */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* ── TOP HEADER ── */}
      <header
        className={`sticky top-0 z-30 px-4 sm:px-6 py-3.5 border-b backdrop-blur-md transition-colors ${
          isDark ? 'bg-slate-900/85 border-slate-800' : 'bg-white/90 border-slate-200 shadow-sm'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3.5">
            <div className="p-2 rounded-2xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/20 border border-blue-500/30 shadow-md">
              <ShieldCheck className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  EXAMGUARD <span className="text-blue-600 dark:text-blue-400">AI</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  PHÒNG CHỜ VÀO THI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                Hệ thống Khảo thí Trực tuyến & Xác thực Sinh trắc học An toàn
              </p>
            </div>
          </div>

          {/* Student Info & Utility Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Student mini tag */}
            <div className="hidden md:flex items-center space-x-2.5 px-3 py-1.5 rounded-xl border border-slate-700/50 bg-slate-800/40 text-xs">
              <div className="w-6 h-6 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-[11px]">
                <User className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block text-[11px] leading-tight">
                  {studentProfile.name || studentProfile.fullName || 'Sinh viên'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {studentProfile.studentCode ? `MSSV: ${studentProfile.studentCode}` : 'K23'}
                </span>
              </div>
            </div>

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              title="Làm mới danh sách ca thi"
              className={`p-2 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                isDark
                  ? 'border-slate-800 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
            </button>

            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isDark
                  ? 'border-slate-800 text-amber-400 hover:bg-slate-800'
                  : 'border-slate-200 text-blue-600 hover:bg-slate-100'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* Back to student portal */}
            <button
              onClick={onBackToPortal}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                isDark
                  ? 'border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <LogOut className="w-3.5 h-3.5 rotate-180" />
              <span className="hidden sm:inline">Cổng Sinh Viên</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT CONTAINER ── */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 space-y-6 sm:space-y-8 relative z-10">
        
        {/* HERO CARD: CA THI ĐANG MỞ (NẾU CÓ) */}
        {activeSession ? (
          <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-cyan-950/40 shadow-2xl ring-1 ring-emerald-500/30">
            {/* Ambient pulse effect */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[90px] pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>CA THI ĐANG MỞ • SẴN SÀNG VÀO PHÒNG</span>
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-slate-800/80 text-cyan-300 border border-slate-700">
                    Mã ca: {activeSession.session.code}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                  {activeSession.session.title}
                </h2>

                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-slate-300">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>Học phần: <b className="text-white">{activeSession.session.subjectName || activeSession.session.title}</b></span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center space-x-1.5">
                    <LayoutGrid className="w-4 h-4 text-blue-400" />
                    <span>Phòng máy: <b className="text-cyan-300 font-mono">{activeSession.session.roomName}</b></span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Thời lượng: <b className="text-white font-mono">{activeSession.session.durationMinutes} phút</b></span>
                  </div>
                </div>

                {/* Candidate Desk Coordinates */}
                <div className="inline-flex items-center gap-3 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
                  <span className="text-slate-400">Số báo danh: <b className="text-cyan-400 font-mono">{activeSession.candidateCode}</b></span>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400">Chỗ ngồi: <b className="text-white font-mono">Dãy H{activeSession.seatRow} - Cột C{activeSession.seatCol}</b></span>
                  {activeSession.seatPin && (
                    <>
                      <span className="text-slate-600">|</span>
                      <span className="text-slate-400">Mã PIN: <b className="text-amber-400 font-mono">{activeSession.seatPin}</b></span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Button: Go to Face Check-In Gate */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-stretch lg:items-end justify-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onSelectSession(activeSession)}
                  className="py-4 px-6 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 hover:from-emerald-400 hover:to-cyan-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/25 transition-all duration-200 active:scale-95 flex items-center justify-center space-x-2.5 group cursor-pointer"
                >
                  <ScanFace className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>XÁC THỰC KHUÔN MẶT ĐỂ VÀO THI</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-[11px] text-emerald-300/80 text-center lg:text-right">
                  Bắt buộc quét Face ID sinh trắc học trước khi mở đề
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl p-6 border border-blue-500/20 bg-blue-950/20 text-center space-y-2">
            <Sparkles className="w-8 h-8 text-blue-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-200">
              Hiện tại chưa có ca thi nào đang trong giờ làm bài
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Vui lòng theo dõi danh sách các ca thi sắp diễn ra bên dưới. Khi đến giờ mở phòng thi, nút xác thực khuôn mặt sẽ tự động kích hoạt.
            </p>
          </div>
        )}

        {/* ── SECTION: DANH SÁCH TẤT CẢ CA THI CỦA THÍ SINH ── */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/60">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                <span>DANH SÁCH CA THI CỦA BẠN</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {sessions.length} ca thi
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Các môn thi được hội đồng khảo thí xếp lịch cho học kỳ hiện tại
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center space-x-1.5 p-1 rounded-2xl bg-slate-800/40 border border-slate-700/60 self-start sm:self-auto text-xs">
              <button
                type="button"
                onClick={() => setFilterTab('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  filterTab === 'ALL'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tất cả ({sessions.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('ACTIVE_UPCOMING')}
                className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center space-x-1 cursor-pointer ${
                  filterTab === 'ACTIVE_UPCOMING'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Chưa thi ({activeCount + upcomingCount})</span>
                {activeCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('ENDED')}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                  filterTab === 'ENDED'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Đã thi ({endedCount})
              </button>
            </div>
          </div>

          {/* Sessions Grid */}
          {filteredSessions.length === 0 ? (
            <div className="py-12 text-center rounded-3xl border border-dashed border-slate-800 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">Không có ca thi nào trong danh mục này</p>
              <p className="text-xs text-slate-500">Hãy liên hệ với Cán bộ Khảo thí nếu bạn chưa được xếp lịch thi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSessions.map((item) => {
                const s = item.session;
                const isOpening = item.isHappening;
                const isWaiting = item.isUpcoming;
                const isFinished = item.isEnded || item.status === 'SUBMITTED';

                return (
                  <div
                    key={item.id}
                    className={`rounded-3xl p-5 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                      isOpening
                        ? 'bg-gradient-to-br from-emerald-950/30 to-slate-900 border-emerald-500/40 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30'
                        : isWaiting
                        ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700 shadow-sm'
                        : 'bg-slate-950/40 border-slate-800/80 opacity-80'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Status Header Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-cyan-400 font-semibold">
                          {s.code}
                        </span>
                        <div>
                          {isOpening ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              <span>Đang mở ca</span>
                            </span>
                          ) : isWaiting ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center space-x-1">
                              <Hourglass className="w-3 h-3 text-amber-400" />
                              <span>Sắp diễn ra</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                              ✓ Đã kết thúc / Đã nộp
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Subject */}
                      <div>
                        <h4 className="text-base font-bold text-white leading-snug">
                          {s.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {s.subjectName || 'Học phần Khảo thí'}
                        </p>
                      </div>

                      {/* Detail Metrics Grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                          <span className="text-[10px] text-slate-500 block">Khung giờ thi:</span>
                          <span className="font-mono text-slate-200 font-bold block">
                            {new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(s.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(s.startTime).toLocaleDateString('vi-VN')} ({s.durationMinutes} phút)
                          </span>
                        </div>

                        <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-0.5">
                          <span className="text-[10px] text-slate-500 block">Địa điểm & SBD:</span>
                          <span className="font-bold text-cyan-300 block truncate">
                            {s.roomName}
                          </span>
                          <span className="text-[10px] text-slate-300 font-mono block">
                            SBD: <b className="text-white">{item.candidateCode}</b> • Bàn H{item.seatRow}-C{item.seatCol}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Footers */}
                    <div className="pt-4 mt-3 border-t border-slate-800/60 flex items-center justify-between">
                      <div className="text-xs text-slate-400">
                        {isWaiting && (
                          <span className="text-amber-400 font-mono text-[11px] font-semibold flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              Mở sau: {Math.floor(item.countdownSeconds / 60)} phút {item.countdownSeconds % 60}s
                            </span>
                          </span>
                        )}
                        {isOpening && (
                          <span className="text-emerald-400 text-[11px] font-semibold flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đã sẵn sàng điểm danh Face ID</span>
                          </span>
                        )}
                        {isFinished && (
                          <span className="text-slate-400 text-[11px]">
                            {item.officialScore !== null && item.officialScore !== undefined ? (
                              <span>Điểm số: <b className="text-emerald-400 font-mono font-bold">{item.officialScore}/10đ</b></span>
                            ) : (
                              <span>Đã niêm phong bài làm</span>
                            )}
                          </span>
                        )}
                      </div>

                      {/* Buttons */}
                      <div>
                        {isOpening ? (
                          <button
                            type="button"
                            onClick={() => onSelectSession(item)}
                            className="py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center space-x-1.5 active:scale-95 cursor-pointer"
                          >
                            <ScanFace className="w-3.5 h-3.5" />
                            <span>Vào Quét Mặt & Thi</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : isWaiting ? (
                          <button
                            type="button"
                            onClick={() => onSelectSession(item)}
                            className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Xem Phòng Chờ</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onSelectSession(item)}
                            className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs rounded-xl transition flex items-center space-x-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Trạng thái bài</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SECTION: QUY CHẾ VÀO THI & AN NINH SINH TRẮC HỌC ── */}
        <div className="rounded-3xl p-5 sm:p-6 border border-slate-800 bg-slate-900/50 space-y-3">
          <div className="flex items-center space-x-2 text-slate-200 font-bold text-sm">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            <span>QUY TRÌNH 3 BƯỚC THAM GIA PHÒNG THI AN TOÀN AI:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="font-bold text-blue-400 flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-mono">1</span>
                <span>Chọn ca thi đang mở</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Thí sinh kiểm tra số báo danh và phòng máy, bấm nút <b>Vào Quét Mặt & Thi</b> để mở cổng kiểm soát.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="font-bold text-teal-400 flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-teal-500/20 flex items-center justify-center text-[10px] font-mono">2</span>
                <span>Xác thực khuôn mặt (Face ID)</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Nhìn thẳng camera máy tính, hệ thống AI ArcFace 512D sẽ đối chiếu sinh trắc học và vị trí bàn ngồi trước khi cho vào.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
              <div className="font-bold text-emerald-400 flex items-center space-x-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-mono">3</span>
                <span>Làm bài trong Buồng thi AI</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Đề thi mở khóa, hệ thống tự động lưu bài liên tục theo thời gian thực và giám sát tính trung thực.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer className="text-center text-xs text-slate-500 dark:text-slate-600 py-4 border-t border-slate-800/40 relative z-10 font-mono">
        ExamGuard AI • Phòng Chờ Khảo Thí & Điểm Danh Sinh Trắc Học Tự Động v3.3
      </footer>
    </div>
  );
};

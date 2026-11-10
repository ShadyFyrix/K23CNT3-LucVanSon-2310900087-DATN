import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Calendar,
  Clock,
  ScanFace,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Award,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Flame,
  Info,
  Laptop,
  Wifi,
  Eye,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/apiClient';
import { toast } from 'react-hot-toast';

interface StudentExamItem {
  id: string;
  candidateCode: string;
  seatRow?: number;
  seatCol?: number;
  seatPin?: string;
  status: string;
  trustScore?: number;
  officialScore?: number | null;
  isEnded: boolean;
  isUpcoming: boolean;
  isHappening: boolean;
  countdownSeconds?: number;
  session: {
    id: string;
    code: string;
    title: string;
    subjectName: string;
    roomName: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    status: string;
    gradingStatus: string;
  };
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'HISTORY'>('UPCOMING');
  const [activeSession, setActiveSession] = useState<StudentExamItem | null>(null);
  const [nextSession, setNextSession] = useState<StudentExamItem | null>(null);
  const [allSessions, setAllSessions] = useState<StudentExamItem[]>([]);
  const [countdown, setCountdown] = useState<number>(0);

  // Lấy lịch thi và tiến độ thí sinh từ backend
  const fetchStudentSchedule = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/exams/student-schedule', {
        params: { email: user?.email }
      });

      if (res.data?.success) {
        const active = res.data.activeSession || null;
        const next = res.data.nextUpcomingSession || null;
        const sessions: StudentExamItem[] = res.data.sessions || [];

        setActiveSession(active);
        setNextSession(next);
        setAllSessions(sessions);

        if (next?.countdownSeconds) {
          setCountdown(next.countdownSeconds);
        }
      }
    } catch (err: any) {
      console.warn('Không thể tải lịch thi sinh viên, sử dụng dữ liệu mặc định:', err.message);
      // Fallback demo data nếu chưa gán ca thi
      const demoSession: StudentExamItem = {
        id: 'demo-student-session',
        candidateCode: 'SBD-2310900087',
        seatRow: 2,
        seatCol: 4,
        seatPin: '8892',
        status: 'READY',
        trustScore: 98,
        officialScore: null,
        isEnded: false,
        isUpcoming: true,
        isHappening: false,
        countdownSeconds: 3600,
        session: {
          id: 'demo-session-c',
          code: 'THI-INT101-01',
          title: 'Kỹ thuật lập trình C — Kỳ thi Kết thúc Học phần',
          subjectName: 'Kỹ thuật lập trình C (INT101)',
          roomName: 'Phòng Lab Máy tính P302 (Tầng 3)',
          startTime: new Date(Date.now() + 3600 * 1000).toISOString(),
          endTime: new Date(Date.now() + 7200 * 1000).toISOString(),
          durationMinutes: 60,
          status: 'SCHEDULED',
          gradingStatus: 'NOT_GRADED'
        }
      };
      setNextSession(demoSession);
      setCountdown(3600);
      setAllSessions([demoSession]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudentSchedule();
  }, [user?.email]);

  // Bộ đếm ngược thời gian thực cho ca thi kế tiếp
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          fetchStudentSchedule();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // Format thời gian đếm ngược
  const formatCountdown = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const upcomingList = useMemo(() => {
    return allSessions.filter(s => !s.isEnded);
  }, [allSessions]);

  const historyList = useMemo(() => {
    return allSessions.filter(s => s.isEnded || s.status === 'SUBMITTED');
  }, [allSessions]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300 font-sans">
      {/* ── 1. DIGITAL STUDENT BADGE & WELCOME BANNER (EG HERO CARD) ── */}
      <div className="eg-hero-card p-6 lg:p-8 rounded-3xl relative overflow-hidden transition-all shadow-xl">
        {/* Glow ambient background circles */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-[var(--color-electric)]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-64 h-64 rounded-full bg-[var(--color-royal)]/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left: Avatar & Identity info */}
          <div className="flex items-center space-x-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl eg-btn-gradient text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-[var(--accent-glow)] ring-4 ring-white/10 overflow-hidden shrink-0">
                {user?.facePhoto ? (
                  <img src={user.facePhoto} alt={user.fullName} className="w-full h-full object-cover" />
                ) : (
                  user?.fullName?.charAt(0)?.toUpperCase() || 'S'
                )}
              </div>
              {user?.isFaceRegistered && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-full shadow-md" title="Face ID đã kích hoạt">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl lg:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {user?.fullName || 'Sinh viên Dự thi'}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[var(--color-electric)]/15 text-[var(--color-azure)] border border-[var(--color-azure)]/30">
                  Thí sinh K23
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                Email: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.email}</span>
                {user?.department && <span> · Khoa: {user.department}</span>}
              </p>

              {/* Face KYC Status Pill */}
              <div className="mt-3 flex items-center space-x-3">
                {user?.isFaceRegistered ? (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ScanFace className="w-3.5 h-3.5" />
                    <span>Face ID Đã Xác Thực (Hợp Lệ)</span>
                  </div>
                ) : (
                  <div
                    className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    title="Việc quét khuôn mặt được thực hiện bởi Quản trị viên Khảo thí tại phòng thi/trang Admin"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Face ID Chưa Xác Minh (Liên hệ Admin tại phòng thi)</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick KPI Cards */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none px-4 py-3 rounded-2xl eg-cyber-card text-center min-w-[110px]">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Ca Thi Sắp Tới</div>
              <div className="text-xl font-extrabold text-[var(--color-azure)] mt-0.5 font-mono">
                {upcomingList.length}
              </div>
            </div>

            <div className="flex-1 lg:flex-none px-4 py-3 rounded-2xl eg-cyber-card text-center min-w-[110px]">
              <div className="text-[11px] font-bold text-slate-400 uppercase">Môn Đã Thi</div>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono">
                {historyList.length}
              </div>
            </div>

            <button
              onClick={fetchStudentSchedule}
              disabled={loading}
              title="Làm mới lịch thi"
              className="p-3 rounded-2xl eg-glass-pill transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-[var(--color-azure)] ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. SPOTLIGHT EXAM ACTION HERO CARD ── */}
      {activeSession ? (
        /* Ca thi ĐANG DIỄN RA */
        <div className="eg-cyber-card p-6 lg:p-8 rounded-3xl border border-rose-500/40 relative overflow-hidden transition-all shadow-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>CA THI ĐANG DIỄN RA — VÀO THI NGAY</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {activeSession.session.title || activeSession.session.subjectName}
              </h2>
              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-300 pt-1">
                <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1 text-[var(--color-azure)]" /> Mã ca: {activeSession.session.code}</span>
                <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1 text-[var(--color-azure)]" /> Thời gian: {activeSession.session.durationMinutes} phút</span>
                <span className="flex items-center"><Monitor className="w-3.5 h-3.5 mr-1 text-[var(--color-azure)]" /> {activeSession.session.roomName}</span>
                <span className="flex items-center font-bold text-rose-500">Số báo danh: {activeSession.candidateCode}</span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/take-exam/${activeSession.id}`)}
              className="w-full lg:w-auto px-8 py-4 rounded-full eg-btn-gradient text-white font-extrabold text-base shadow-xl shadow-[var(--accent-glow)] transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-3 shrink-0 cursor-pointer"
            >
              <Monitor className="w-5 h-5" />
              <span>VÀO BUỒNG THI NGAY</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : nextSession ? (
        /* Ca thi SẮP TỚI HÔM NAY (Có đếm ngược) */
        <div className="eg-cyber-card p-6 lg:p-8 rounded-3xl border border-[var(--color-azure)]/30 relative overflow-hidden transition-all shadow-lg">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold eg-glass-pill shadow-xs">
                <Clock className="w-3.5 h-3.5 text-[var(--color-azure)]" />
                <span>CA THI TIẾP THEO CỦA BẠN</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white">
                {nextSession.session.title || nextSession.session.subjectName}
              </h2>
              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                <span>Phòng: <strong className="text-slate-800 dark:text-slate-200">{nextSession.session.roomName}</strong></span>
                <span>Thời lượng: <strong className="text-slate-800 dark:text-slate-200">{nextSession.session.durationMinutes} phút</strong></span>
                <span>Số báo danh: <strong className="text-[var(--color-azure)] font-mono">{nextSession.candidateCode}</strong></span>
                {nextSession.seatPin && (
                  <span>Mã PIN bàn: <strong className="font-mono bg-[var(--color-electric)]/10 px-2 py-0.5 rounded text-[var(--color-azure)]">{nextSession.seatPin}</strong></span>
                )}
              </div>
            </div>

            {/* Countdown Box & Direct CTA */}
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="px-5 py-3 rounded-2xl eg-cyber-card text-center shrink-0">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mở phòng sau</div>
                <div className="text-2xl font-black font-mono text-[var(--color-azure)]">
                  {formatCountdown(countdown)}
                </div>
              </div>

              <button
                onClick={() => navigate(`/take-exam/${nextSession.id}`)}
                className="flex-1 lg:flex-none px-6 py-3.5 rounded-full eg-btn-gradient text-white font-bold text-sm shadow-lg shadow-[var(--accent-glow)] transition flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
              >
                <Monitor className="w-4 h-4" />
                <span>Vào Phòng Chờ</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* KHÔNG CÓ CA THI HÔM NAY */
        <div className="eg-cyber-card p-6 rounded-3xl flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-electric)]/10 text-[var(--color-azure)] flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Hôm nay bạn không có lịch thi nào!
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Hãy giữ gìn sức khỏe, chuẩn bị sẵn sàng thiết bị và ôn tập bài kỹ lưỡng cho các ca thi sắp tới.
            </p>
          </div>
        </div>
      )}

      {/* ── 3. INTERACTIVE TABS: MY EXAMS & RESULTS (UNIFIED TAB BAR) ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-white/10">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('UPCOMING')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'UPCOMING'
                  ? 'eg-glass-pill shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Lịch thi sắp tới ({upcomingList.length})
            </button>
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'HISTORY'
                  ? 'eg-glass-pill shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kết quả & Bảng điểm ({historyList.length})
            </button>
          </div>

          <button
            onClick={() => navigate('/exam/result?view=student')}
            className="text-xs font-bold text-[var(--color-azure)] hover:underline flex items-center space-x-1 cursor-pointer"
          >
            <span>Xem chi tiết tra cứu</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab 1: UPCOMING EXAMS LIST */}
        {activeTab === 'UPCOMING' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingList.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                Hiện tại bạn chưa được phân ca thi nào sắp tới.
              </div>
            ) : (
              upcomingList.map((item) => (
                <div
                  key={item.id}
                  className="eg-cyber-card p-5 rounded-3xl transition-all duration-200 hover:shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--color-electric)]/15 text-[var(--color-azure)] border border-[var(--color-azure)]/30">
                        {item.session.code}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 font-mono">
                        {item.session.durationMinutes} phút
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3 line-clamp-2">
                      {item.session.title || item.session.subjectName}
                    </h3>

                    <div className="mt-4 space-y-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                      <p className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {new Date(item.session.startTime).toLocaleString('vi-VN')}</p>
                      <p className="flex items-center"><Monitor className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {item.session.roomName}</p>
                      <p className="flex items-center font-mono">SBD: <strong className="text-slate-800 dark:text-slate-200 ml-1">{item.candidateCode}</strong></p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                      Sẵn sàng thi
                    </span>

                    <button
                      onClick={() => navigate(`/take-exam/${item.id}`)}
                      className="px-4 py-1.5 rounded-full eg-btn-gradient text-white text-xs font-bold shadow-md shadow-[var(--accent-glow)] transition flex items-center space-x-1 cursor-pointer active:scale-95"
                    >
                      <span>Vào thi</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: EXAM RESULTS & TRANSCRIPT */}
        {activeTab === 'HISTORY' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {historyList.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400 text-xs">
                Bạn chưa hoàn thành bài thi nào để hiển thị kết quả.
              </div>
            ) : (
              historyList.map((item) => (
                <div
                  key={item.id}
                  className="eg-cyber-card p-5 rounded-3xl transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">{item.session.code}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Đã Nộp Bài
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2">
                    {item.session.title || item.session.subjectName}
                  </h3>

                  <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Điểm Chính Thức</div>
                      <div className="text-2xl font-black text-[var(--color-azure)] mt-0.5 font-mono">
                        {item.officialScore !== null && item.officialScore !== undefined
                          ? `${item.officialScore.toFixed(1)} / 10`
                          : 'Đang chấm'}
                      </div>
                    </div>
                    {item.trustScore !== undefined && (
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Trust Score AI</div>
                        <div className={`text-sm font-extrabold mt-0.5 font-mono ${
                          (item.trustScore || 100) >= 80 ? 'text-emerald-500' : 'text-amber-500'
                        }`}>
                          {item.trustScore}%
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(item.session.startTime).toLocaleDateString('vi-VN')}
                    </span>
                    <button
                      onClick={() => navigate(`/exam/result?view=student&sessionStudentId=${item.id}`)}
                      className="px-3.5 py-1.5 rounded-full eg-glass-pill-subtle text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Xem chi tiết & Đáp án</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── 4. AI PROCTORING & ROOM CHECKLIST (4 PILLARS) ── */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-[var(--color-azure)]" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Bộ Quy Tắc Chuẩn Bị Phòng Thi Biometric AI
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="eg-cyber-card p-4 rounded-3xl transition">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-electric)]/10 text-[var(--color-azure)] flex items-center justify-center mb-2.5">
              <Eye className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-xs text-slate-800 dark:text-white">Ánh Sáng & Góc Quay</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Ngồi chính diện camera, chiếu sáng đều khuôn mặt, không đeo khẩu trang hay kính râm.
            </p>
          </div>

          <div className="eg-cyber-card p-4 rounded-3xl transition">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-electric)]/10 text-[var(--color-azure)] flex items-center justify-center mb-2.5">
              <Laptop className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-xs text-slate-800 dark:text-white">Khóa Màn Hình (SEB)</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Không chuyển tab, không mở phần mềm bên ngoài, không cắm màn hình phụ.
            </p>
          </div>

          <div className="eg-cyber-card p-4 rounded-3xl transition">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-electric)]/10 text-[var(--color-azure)] flex items-center justify-center mb-2.5">
              <Wifi className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-xs text-slate-800 dark:text-white">Mạng & Nguồn Điện</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Cắm sạc máy tính trong suốt ca thi, sử dụng mạng dây hoặc Wifi có kết nối ổn định.
            </p>
          </div>

          <div className="eg-cyber-card p-4 rounded-3xl transition">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-electric)]/10 text-[var(--color-azure)] flex items-center justify-center mb-2.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <h4 className="font-bold text-xs text-slate-800 dark:text-white">Không Gian Yên Tĩnh</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Không có người thứ hai trong phòng, không giao tiếp hoặc sử dụng điện thoại di động.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

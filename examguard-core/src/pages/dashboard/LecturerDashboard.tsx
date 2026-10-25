import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserSquare2,
  Calendar,
  Clock,
  Eye,
  FileCheck2,
  BookOpen,
  Award,
  ChevronRight,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Users,
  Building2,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
  FileText,
  Activity,
  Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/apiClient';
import { toast } from 'react-hot-toast';

interface ExamSessionItem {
  _id: string;
  code: string;
  title: string;
  subject?: { name: string; courseCode: string };
  examPaper?: { code: string; title: string; durationMinutes: number; totalScore: number };
  room?: { name: string; campus?: { name: string } };
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  status: string;
  gradingStatus: string;
  proctor1?: { _id: string; fullName: string; email: string };
  proctor2?: { _id: string; fullName: string; email: string };
}

export default function LecturerDashboard() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ExamSessionItem[]>([]);
  const [examPapersCount, setExamPapersCount] = useState<number>(0);
  const [studentsCount, setStudentsCount] = useState<number>(0);

  const fetchLecturerData = useCallback(async () => {
    try {
      setLoading(true);
      // Lấy danh sách ca thi
      const [sessionsRes, papersRes, studentsRes] = await Promise.allSettled([
        apiClient.get('/exams/sessions'),
        apiClient.get('/exams/papers'),
        apiClient.get('/students?limit=1')
      ]);

      if (sessionsRes.status === 'fulfilled' && sessionsRes.value.data?.success) {
        setSessions(sessionsRes.value.data.data || []);
      }

      if (papersRes.status === 'fulfilled' && papersRes.value.data?.success) {
        const papers = papersRes.value.data.data || [];
        setExamPapersCount(papers.length);
      }

      if (studentsRes.status === 'fulfilled') {
        const total = studentsRes.value.data?.total || studentsRes.value.data?.data?.length || 0;
        setStudentsCount(total);
      }
    } catch (err: any) {
      console.error('Lỗi tải dữ liệu giảng viên:', err);
      toast.error('Không thể đồng bộ dữ liệu ca coi thi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLecturerData();
  }, [fetchLecturerData]);

  // Lọc ca thi hôm nay hoặc đang diễn ra
  const todaySessions = useMemo(() => {
    return sessions.filter(s => s.status !== 'COMPLETED' && s.status !== 'CANCELLED');
  }, [sessions]);

  // Ca thi đang diễn ra ngay lúc này
  const liveSession = useMemo(() => {
    return sessions.find(s => s.status === 'IN_PROGRESS' || s.status === 'CHECKING_IN') || todaySessions[0] || null;
  }, [sessions, todaySessions]);

  // Ca thi cần rà soát & duyệt điểm
  const pendingGradingSessions = useMemo(() => {
    return sessions.filter(
      s => s.status === 'COMPLETED' && (s.gradingStatus === 'AUTO_GRADED' || s.gradingStatus === 'REVIEWING' || s.gradingStatus === 'NOT_GRADED')
    );
  }, [sessions]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* ── 1. WELCOME LECTURER COCKPIT BANNER ── */}
      <div className={`relative overflow-hidden rounded-3xl border p-6 lg:p-8 transition-all ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-slate-800 shadow-xl'
          : 'bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-white border-indigo-200/80 shadow-md'
      }`}>
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-10 w-64 h-64 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 ring-4 ring-white/10 shrink-0">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'G'}
            </div>

            <div>
              <div className="flex items-center space-x-2.5">
                <h1 className="text-xl lg:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {user?.fullName || 'Giảng viên / Giám thị'}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  Cán bộ Khảo thí
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                Email: <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.email}</span>
                {user?.department && <span> · Bộ môn: {user.department}</span>}
              </p>

              <div className="mt-3 flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Sẵn sàng trực ban Coi thi & Giám sát 3D
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className={`flex-1 lg:flex-none px-4 py-3 rounded-2xl border text-center min-w-[120px] ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-slate-200'
            }`}>
              <div className="text-[11px] font-bold text-slate-400 uppercase">Ca Coi Thi</div>
              <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                {todaySessions.length}
              </div>
            </div>

            <div className={`flex-1 lg:flex-none px-4 py-3 rounded-2xl border text-center min-w-[120px] ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-slate-200'
            }`}>
              <div className="text-[11px] font-bold text-slate-400 uppercase">Chờ Duyệt Điểm</div>
              <div className="text-xl font-extrabold text-amber-500 mt-0.5">
                {pendingGradingSessions.length}
              </div>
            </div>

            <button
              onClick={fetchLecturerData}
              disabled={loading}
              title="Đồng bộ dữ liệu"
              className={`p-3 rounded-2xl border transition ${
                isDark ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white/80 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. LIVE PROCTORING DIRECT ACTION BANNER ── */}
      {liveSession ? (
        <div className={`p-6 lg:p-8 rounded-3xl border relative overflow-hidden transition-all shadow-xl ${
          isDark
            ? 'bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900 border-blue-500/40 ring-2 ring-blue-500/20'
            : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-white border-blue-300 ring-2 ring-blue-200'
        }`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white animate-pulse">
                <Eye className="w-3.5 h-3.5" />
                <span>BUỒNG GIÁM THỊ PHÒNG 3D — SẴN SÀNG GIÁM SÁT</span>
              </div>
              <h2 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white">
                {liveSession.title}
              </h2>
              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-300 pt-1">
                <span className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1 text-blue-500" /> Mã ca: {liveSession.code}</span>
                <span className="flex items-center"><Building2 className="w-3.5 h-3.5 mr-1 text-blue-500" /> {liveSession.room?.name || 'Phòng Lab P302'}</span>
                <span className="flex items-center"><Clock className="w-3.5 h-3.5 mr-1 text-blue-500" /> {liveSession.durationMinutes || 60} phút</span>
                <span className="flex items-center font-bold text-indigo-600 dark:text-indigo-400">
                  Môn: {liveSession.subject?.name || 'Kỹ thuật lập trình'}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate(`/live-proctor/${liveSession._id}`)}
              className="w-full lg:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-base shadow-xl shadow-blue-600/30 transition transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center space-x-3 shrink-0"
            >
              <Eye className="w-5 h-5" />
              <span>VÀO BUỒNG GIÁM THỊ 3D NGAY</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* ── 3. TWO COLUMNS: PENDING GRADING & ASSIGNED SESSIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Ca thi cần rà soát & duyệt điểm rọc phách */}
        <div className={`p-6 rounded-3xl border space-y-4 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <FileCheck2 className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                Ca Thi Cần Duyệt Điểm Rọc Phách ({pendingGradingSessions.length})
              </h3>
            </div>
            <button
              onClick={() => navigate('/grading-review')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {pendingGradingSessions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Không có ca thi nào đang chờ duyệt điểm. Tất cả bài thi đã được phê duyệt!
              </div>
            ) : (
              pendingGradingSessions.slice(0, 4).map((s) => (
                <div
                  key={s._id}
                  className={`p-4 rounded-2xl border transition flex items-center justify-between ${
                    isDark ? 'bg-slate-950/60 border-slate-800/80 hover:border-amber-500/40' : 'bg-slate-50 border-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      {s.code}
                    </span>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                      {s.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      {s.subject?.name} · {s.room?.name || 'Phòng P302'}
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(`/grading-review/${s._id}`)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition flex items-center space-x-1 shrink-0 ml-3"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Duyệt điểm</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Lịch các ca coi thi đã lên kế hoạch */}
        <div className={`p-6 rounded-3xl border space-y-4 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-indigo-500" />
              <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                Lịch Phân Công Coi Thi ({todaySessions.length})
              </h3>
            </div>
            <button
              onClick={() => navigate('/exam-sessions')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1"
            >
              <span>Xem sơ đồ Gantt</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {todaySessions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Hiện tại không có ca coi thi nào trong lịch trực.
              </div>
            ) : (
              todaySessions.slice(0, 4).map((s) => (
                <div
                  key={s._id}
                  className={`p-4 rounded-2xl border transition flex items-center justify-between ${
                    isDark ? 'bg-slate-950/60 border-slate-800/80 hover:border-indigo-500/40' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        {s.code}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {new Date(s.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                      {s.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {s.room?.name || 'Phòng Lab P302'} · {s.durationMinutes || 60} phút
                    </p>
                  </div>

                  <button
                    onClick={() => navigate(`/live-proctor/${s._id}`)}
                    className="px-3.5 py-1.5 rounded-xl border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 text-xs font-bold transition flex items-center space-x-1 shrink-0 ml-3"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Phòng 3D</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── 4. QUICK ACTION CARDS (EDUTECH PAPERS & PROCTORING) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div
          onClick={() => navigate('/exam-papers')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${
            isDark ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/40' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Ngân Hàng Đề Thi</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Soạn thảo đề thi EduTech trắc nghiệm & tự luận, upload file Word/PDF.
          </p>
          <div className="mt-3 text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center space-x-1">
            <span>{examPapersCount} đề thi đã tạo</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        <div
          onClick={() => navigate('/live-proctor')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${
            isDark ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/40' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-3">
            <Eye className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Giám Thị Phòng 3D</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Mô hình bàn thi 3D thời gian thực, can thiệp bù giờ và tạm dừng AI khi hỗ trợ.
          </p>
          <div className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center space-x-1">
            <span>Mở buồng giám thị</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>

        <div
          onClick={() => navigate('/exam/result?view=lecturer')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${
            isDark ? 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/40' : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
            <Award className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 dark:text-white">Bảng Điểm & Phổ Điểm</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tra cứu phổ điểm toàn ca thi, xem ma trận thống kê câu hỏi và xuất file Excel.
          </p>
          <div className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
            <span>Tra cứu phổ điểm</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

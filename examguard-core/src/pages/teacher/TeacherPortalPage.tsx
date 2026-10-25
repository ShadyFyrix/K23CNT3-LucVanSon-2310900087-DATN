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
  Search,
  ScanFace,
  Mail,
  Phone,
  Presentation
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/apiClient';
import { toast } from 'react-hot-toast';

export default function TeacherPortalPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'SHIFTS' | 'GRADING' | 'PAPERS' | 'PROFILE'>('SHIFTS');
  const [loading, setLoading] = useState(true);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);

  const fetchTeacherData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, sessionsRes, papersRes] = await Promise.allSettled([
        apiClient.get('/teachers/me'),
        apiClient.get('/exams/sessions'),
        apiClient.get('/exams/papers')
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data?.success) {
        setTeacherProfile(profileRes.value.data.data);
      }

      if (sessionsRes.status === 'fulfilled' && sessionsRes.value.data?.success) {
        setSessions(sessionsRes.value.data.data || []);
      }

      if (papersRes.status === 'fulfilled' && papersRes.value.data?.success) {
        setPapers(papersRes.value.data.data || []);
      }
    } catch (err: any) {
      console.warn('Lỗi tải dữ liệu giảng viên:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  // Ca thi chưa hoàn thành (lịch coi thi)
  const scheduledSessions = useMemo(() => {
    return sessions.filter((s: any) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED');
  }, [sessions]);

  // Ca thi đã xong cần duyệt điểm
  const gradingSessions = useMemo(() => {
    return sessions.filter(
      (s: any) => s.status === 'COMPLETED' && (s.gradingStatus === 'AUTO_GRADED' || s.gradingStatus === 'REVIEWING' || s.gradingStatus === 'NOT_GRADED')
    );
  }, [sessions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans animate-in fade-in duration-300">
      {/* ── 1. DIGITAL LECTURER BADGE HEADER ── */}
      <div className={`p-6 lg:p-8 rounded-3xl border relative overflow-hidden transition-all shadow-xl ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-slate-800'
          : 'bg-gradient-to-r from-indigo-50/90 via-blue-50/70 to-white border-indigo-200/80 shadow-md'
      }`}>
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30 ring-4 ring-white/10 shrink-0">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'G'}
            </div>

            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white">
                  {teacherProfile?.fullName || user?.fullName || 'Giảng viên / Giám thị'}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                  {teacherProfile?.academicRank || 'Thạc sĩ'} · Cán bộ Coi thi
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Khoa / Bộ môn: <span className="font-semibold text-slate-700 dark:text-slate-300">{teacherProfile?.department?.name || 'Công nghệ Thông tin'}</span>
                {' · '}Mã GV: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{teacherProfile?.teacherCode || 'GV-CNTT01'}</span>
              </p>

              <div className="mt-2.5 flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Đang trực ca Giám thị Phòng 3D
                </span>
                <span className="text-xs text-slate-400 font-mono">Email: {user?.email}</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className={`flex-1 lg:flex-none px-4 py-3 rounded-2xl border text-center min-w-[110px] ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-slate-200'
            }`}>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Ca Coi Thi</div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
                {scheduledSessions.length}
              </div>
            </div>

            <div className={`flex-1 lg:flex-none px-4 py-3 rounded-2xl border text-center min-w-[110px] ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-slate-200'
            }`}>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Chờ Duyệt Điểm</div>
              <div className="text-xl font-black text-amber-500 mt-0.5">
                {gradingSessions.length}
              </div>
            </div>

            <div className={`flex-1 lg:flex-none px-4 py-3 rounded-2xl border text-center min-w-[110px] ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-slate-200'
            }`}>
              <div className="text-[10px] font-bold text-slate-400 uppercase">Đề Thi Bộ Môn</div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {papers.length}
              </div>
            </div>

            <button
              onClick={fetchTeacherData}
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

      {/* ── 2. NAVIGATION TABS ── */}
      <div className="flex items-center space-x-2 border-b pb-3 border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('SHIFTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'SHIFTS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Lịch Coi Thi & Phòng 3D ({scheduledSessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('GRADING')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'GRADING'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Rà Soát & Duyệt Điểm Rọc Phách ({gradingSessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PAPERS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'PAPERS'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Ngân Hàng Đề Thi ({papers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
            activeTab === 'PROFILE'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserSquare2 className="w-4 h-4" />
          <span>Hồ Sơ & Xác Thực Giám Thị</span>
        </button>
      </div>

      {/* ── TAB CONTENT ── */}
      {/* 1. LỊCH COI THI & BUỒNG GIÁM THỊ 3D */}
      {activeTab === 'SHIFTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scheduledSessions.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs">
              Hiện tại Thầy/Cô không có ca coi thi nào trong lịch phân công.
            </div>
          ) : (
            scheduledSessions.map((s: any) => (
              <div
                key={s._id}
                className={`p-5 rounded-2xl border transition-all duration-200 hover:shadow-lg ${
                  isDark
                    ? 'bg-slate-900/60 border-slate-800/80 hover:border-indigo-500/40'
                    : 'bg-white border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {s.code}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {s.durationMinutes || 60} phút
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3 line-clamp-2">
                  {s.title}
                </h3>

                <div className="mt-4 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <p className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {new Date(s.startTime).toLocaleString('vi-VN')}</p>
                  <p className="flex items-center"><Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {s.room?.name || 'Phòng Lab P302'}</p>
                  <p className="flex items-center">Môn: <strong className="text-slate-800 dark:text-slate-200 ml-1">{s.subject?.name || 'Kỹ thuật lập trình'}</strong></p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5 animate-pulse" />
                    Sẵn sàng giám sát
                  </span>

                  <button
                    onClick={() => navigate(`/live-proctor/${s._id}`)}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Mở Buồng 3D</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. RÀ SOÁT & DUYỆT ĐIỂM */}
      {activeTab === 'GRADING' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {gradingSessions.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-xs">
                Không có ca thi nào cần duyệt điểm. Tất cả bài thi đã được rà soát hoàn tất!
              </div>
            ) : (
              gradingSessions.map((s: any) => (
                <div
                  key={s._id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">{s.code}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Chờ Rà Soát
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2">
                    {s.title}
                  </h3>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    {s.subject?.name} · {s.room?.name || 'Phòng Lab P302'}
                  </p>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Đã chấm tự động AI
                    </span>

                    <button
                      onClick={() => navigate(`/grading-review/${s._id}`)}
                      className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition flex items-center space-x-1"
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      <span>Rà Soát & Duyệt Điểm</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. NGÂN HÀNG ĐỀ THI */}
      {activeTab === 'PAPERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tổng số đề thi do bộ môn biên soạn: <strong>{papers.length}</strong> đề thi
            </p>
            <button
              onClick={() => navigate('/exam-papers')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center space-x-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Soạn Đề Thi Mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {papers.map((p: any) => (
              <div
                key={p._id}
                className={`p-5 rounded-2xl border transition-all ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {p.code}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {p.durationMinutes} phút · {p.totalScore || 10}đ
                  </span>
                </div>

                <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-2.5 line-clamp-1">
                  {p.title}
                </h3>

                <p className="text-xs text-slate-400 mt-1">
                  {p.subjectName || 'Học phần CNTT'}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {p.totalQuestions || 20} câu hỏi
                  </span>
                  <button
                    onClick={() => navigate('/exam-papers')}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center space-x-1"
                  >
                    <span>Xem đề thi</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. HỒ SƠ GIẢNG VIÊN & XÁC THỰC GIÁM THỊ */}
      {activeTab === 'PROFILE' && (
        <div className={`p-6 rounded-3xl border space-y-6 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b pb-2 border-slate-200 dark:border-slate-800">
            Thông Tin Cán Bộ Giảng Dạy & Khảo Thí
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-slate-400 block mb-1">Họ và tên giảng viên</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                {teacherProfile?.fullName || user?.fullName}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Học hàm / Học vị</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {teacherProfile?.academicRank || 'Thạc sĩ Khoa học Máy tính'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Mã số cán bộ (MSGV)</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {teacherProfile?.teacherCode || 'GV-CNTT01'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Email công vụ</span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{user?.email}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Số điện thoại liên hệ</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{teacherProfile?.phone || '0912 345 678'}</span>
            </div>
            <div>
              <span className="text-slate-400 block mb-1">Khoa / Bộ môn công tác</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{teacherProfile?.department?.name || 'Khoa Công nghệ Thông tin'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

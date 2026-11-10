import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Sparkles,
  RefreshCw,
  Award,
  Building2,
  BarChart3,
  ShieldCheck,
  Clock,
  Eye,
  FileCheck2,
  ScanFace,
  AlertTriangle,
  CheckCircle2,
  Activity,
  BookOpen,
  Monitor,
  Users,
  UserCheck,
  ChevronRight,
  ShieldAlert,
  Sliders,
  CalendarRange,
  Zap,
  Radio,
  Search,
  ArrowUpRight,
  Play,
  Flame,
  Layers,
  Check
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { apiClient } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import StudentDashboard from './dashboard/StudentDashboard';
import LecturerDashboard from './dashboard/LecturerDashboard';

const VIOLATION_COLORS: { [key: string]: string } = {
  LOOK_AWAY: '#f59e0b',
  MULTIPLE_FACES: '#ef4444',
  NO_FACE: '#f97316',
  PHONE_DETECTED: '#dc2626',
  SUSPICIOUS_OBJECT: '#8b5cf6',
  PROCTOR_INSPECTION: '#10b981',
  SEB_INTEGRITY_BREACH: '#e11d48',
  MANUAL_WARNING: '#64748b'
};

const VIOLATION_LABELS: { [key: string]: string } = {
  LOOK_AWAY: 'Quay mặt (>3s)',
  MULTIPLE_FACES: '2 khuôn mặt',
  NO_FACE: 'Rời vị trí',
  PHONE_DETECTED: 'Điện thoại',
  SUSPICIOUS_OBJECT: 'Vật thể lạ',
  PROCTOR_INSPECTION: 'Giám thị ghé bàn (0đ)',
  SEB_INTEGRITY_BREACH: 'Vi phạm toàn vẹn',
  MANUAL_WARNING: 'Nhắc nhở thủ công'
};

// Motion Variants cho hiệu ứng Staggered Cascade chuẩn UX Pro Max
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 24
    }
  }
};

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [adminViewOverride, setAdminViewOverride] = useState<'AUTO' | 'ADMIN' | 'LECTURER' | 'STUDENT'>('AUTO');
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>(null);
  const [sessionSearch, setSessionSearch] = useState('');

  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/dashboard/stats');
      if (res.data.success) {
        setStatsData(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      toast.error('Không thể tải dữ liệu Dashboard Khảo thí');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const summary = statsData?.summary || {};
  const recentSessions = statsData?.recentSessions || [];
  const rawBreakdown = statsData?.violationBreakdown || [];

  const chartData = rawBreakdown.map((item: any) => ({
    name: VIOLATION_LABELS[item.type] || item.type,
    count: item.count,
    color: VIOLATION_COLORS[item.type] || '#64748b'
  }));

  const finalChartData = chartData.length > 0 ? chartData : [
    { name: 'Quay mặt (>3s)', count: 7, color: '#f59e0b' },
    { name: '2 khuôn mặt', count: 2, color: '#ef4444' },
    { name: 'Rời vị trí', count: 1, color: '#f97316' },
    { name: 'Giám thị ghé bàn', count: 9, color: '#10b981' },
    { name: 'Nhắc nhở thủ công', count: 1, color: '#64748b' }
  ];

  const filteredSessions = recentSessions.filter((s: any) => {
    if (!sessionSearch.trim()) return true;
    const q = sessionSearch.toLowerCase().trim();
    return (
      s.title?.toLowerCase().includes(q) ||
      s.code?.toLowerCase().includes(q) ||
      s.subject?.name?.toLowerCase().includes(q) ||
      s.room?.code?.toLowerCase().includes(q)
    );
  });

  const activeSession = recentSessions.find((s: any) => s.status === 'IN_PROGRESS') || recentSessions[0];

  const isStudent = hasRole('student') && !hasRole('admin');
  const isTeacher = hasRole('teacher') && !hasRole('admin');

  if (isStudent && adminViewOverride === 'AUTO') {
    return <StudentDashboard />;
  }

  if (isTeacher && adminViewOverride === 'AUTO') {
    return <LecturerDashboard />;
  }

  if (adminViewOverride === 'STUDENT') {
    return (
      <div className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-blue-500/10 to-teal-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center justify-between text-xs font-bold shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span>Chế độ Xem trước: <strong>Cổng Sinh Viên Dự Thi</strong></span>
          </div>
          <button
            onClick={() => setAdminViewOverride('ADMIN')}
            className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
          >
            Quay lại Khảo thí Toàn trường
          </button>
        </div>
        <StudentDashboard />
      </div>
    );
  }

  if (adminViewOverride === 'LECTURER') {
    return (
      <div className="space-y-4">
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-500/15 via-blue-500/10 to-teal-500/15 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 flex items-center justify-between text-xs font-bold shadow-sm">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-ping" />
            <span>Chế độ Xem trước: <strong>Bàn Làm Việc Giảng Viên / Giám Thị 3D</strong></span>
          </div>
          <button
            onClick={() => setAdminViewOverride('ADMIN')}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition cursor-pointer"
          >
            Quay lại Khảo thí Toàn trường
          </button>
        </div>
        <LecturerDashboard />
      </div>
    );
  }

  const avgTrust = summary.avgTrustScore || 98.7;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 w-full pb-16 font-sans select-none relative"
    >
      {/* ─── 1. BENTO HERO COMMAND STAGE (TIÊU ĐIỂM CHÍNH ÁP ĐẢO VỚI HÀO QUANG AURORA) ─── */}
      <motion.div
        variants={itemVariants}
        className="eg-hero-card p-6 lg:p-8 relative overflow-hidden"
      >
        {/* Shimmer Light Reflection Sweep */}
        <div className="eg-shimmer-sweep" />

        {/* Dynamic Glowing Ambient Aura Orbs */}
        <div className="absolute top-0 right-10 w-96 h-96 bg-[var(--color-electric)]/20 rounded-full blur-[100px] pointer-events-none eg-aurora-glow" />
        <div className="absolute bottom-0 left-20 w-80 h-80 bg-[var(--color-royal)]/15 rounded-full blur-[90px] pointer-events-none eg-aurora-glow" style={{ animationDelay: '4s' }} />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left Column: Command Title & Role Switcher */}
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full eg-glass-pill shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="text-[11px] font-mono font-bold tracking-wider text-[var(--color-azure)] uppercase">
                  ArcFace AI Zero-Trust Active
                </span>
              </div>

              {/* Role Switcher Pill */}
              <div className="flex items-center bg-white/80 dark:bg-[#070814]/90 backdrop-blur-xl p-1 rounded-full border border-slate-200 dark:border-white/10 shadow-inner">
                <button
                  onClick={() => setAdminViewOverride('ADMIN')}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    adminViewOverride === 'ADMIN' || adminViewOverride === 'AUTO'
                      ? 'eg-glass-pill font-extrabold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Toàn trường
                </button>
                <button
                  onClick={() => setAdminViewOverride('LECTURER')}
                  className="px-3.5 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  Giảng viên
                </button>
                <button
                  onClick={() => setAdminViewOverride('STUDENT')}
                  className="px-3.5 py-1 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  Thí sinh
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchDashboardStats}
                title="Làm mới dữ liệu telemetry"
                className="p-2 eg-glass-pill text-[var(--color-azure)] hover:opacity-80 rounded-full transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-azure)] ${loading ? 'animate-spin' : ''}`} />
              </motion.button>
            </div>

            <div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
                Trung Tâm Chỉ Huy <span className="eg-text-gradient">Khảo Thí & Giám Sát AI</span>
              </h1>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium leading-relaxed mt-2 max-w-xl">
                Giám sát trực tiếp phòng thi qua bản sao 3D WebGL, nhận diện sinh trắc học ArcFace đa luồng và tự động xử lý cảnh báo theo chuẩn Zero-Trust.
              </p>
            </div>
          </div>

          {/* Right Column: 3D Live Exam Spotlight Pod (Tâm điểm thị giác thời gian thực) */}
          <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="w-full lg:w-96 rounded-3xl p-5 bg-white/95 dark:bg-[#070814]/85 backdrop-blur-2xl border border-slate-200/80 dark:border-[#3781fc]/40 shadow-xl dark:shadow-[0_20px_50px_rgba(25,81,252,0.35),inset_0_1.5px_2px_rgba(255,255,255,0.4)] relative overflow-hidden group shrink-0"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-[var(--color-electric)]/15 rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-all duration-700" />
            
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                </span>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-300">
                  Phòng Thi Trực Tiếp
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold px-3 py-0.5 rounded-full eg-glass-pill text-[var(--color-azure)]">
                {activeSession?.room?.code || 'LAB01'}
              </span>
            </div>

            <div className="space-y-1 mb-3.5">
              <h3 className="text-base font-black text-slate-900 dark:text-white line-clamp-1 tracking-tight">
                {activeSession?.subject?.name || activeSession?.title || 'Kỹ thuật lập trình C & AI Giám sát'}
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-mono text-[var(--color-azure)] bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10 text-[11px]">
                  {activeSession?.code || 'CA-202611-P302'}
                </span>
                <span>•</span>
                <span className="text-slate-500 dark:text-slate-400 font-mono">{activeSession?.durationMinutes || 45} phút</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-2xl bg-slate-50 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/5 text-center mb-3.5">
              <div>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Quy mô</span>
                <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white">{activeSession?.room?.capacity || 24} máy</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Xác thực</span>
                <span className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400">100% KYC</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Vi phạm</span>
                <span className="text-xs font-mono font-extrabold text-[var(--color-azure)]">0 ca</span>
              </div>
            </div>

            {/* Nút Giám Thị 3D Đồng Bộ Toàn Hệ Thống */}
            <Link
              to={activeSession ? `/live-proctor/${activeSession._id}` : '/live-proctor'}
              className="w-full eg-btn-gradient py-2.5 px-4 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg hover:shadow-[0_0_25px_rgba(var(--color-electric-rgb),0.5)] transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4 text-white" />
              <span>Vào Buồng Giám Thị 3D</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* ─── 2. LARGE SCALE TELEMETRY STRIP ─── */}
      <motion.div
        variants={itemVariants}
        className="eg-cyber-card p-6 md:p-8"
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-white/10">
          {/* Stat 1 */}
          <div className="flex flex-col space-y-1">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              Ca thi khảo thí
            </span>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {summary.totalSessions || 14}
              <span className="text-sm font-sans text-[var(--color-azure)] font-bold ml-2">ca</span>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{summary.activeSessions || 1} ca</span> đang diễn ra
            </span>
          </div>

          {/* Stat 2 */}
          <div className="flex flex-col space-y-1 pt-4 lg:pt-0 lg:pl-8">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              Chỉ số uy tín TB
            </span>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              {avgTrust}
              <span className="text-sm font-sans text-slate-500 dark:text-slate-400 font-bold ml-1">/100</span>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold pt-1">
              Chuẩn an ninh Zero-Trust
            </span>
          </div>

          {/* Stat 3 */}
          <div className="flex flex-col space-y-1 pt-4 lg:pt-0 lg:pl-8">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              ArcFace AI Core
            </span>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono eg-text-gradient tracking-tight">
              512-D
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              Pose + Anti-Spoofing Active
            </span>
          </div>

          {/* Stat 4 */}
          <div className="flex flex-col space-y-1 pt-4 lg:pt-0 lg:pl-8">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
              Rà soát chấm thi
            </span>
            <div className="text-3xl sm:text-4xl lg:text-5xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight">
              100%
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              Rọc phách mù tự động
            </span>
          </div>
        </div>
      </motion.div>

      {/* ─── 3. CAPSULE QUICK ACTION BAR (ĐỒNG BỘ 1 MÀU CHỦ ĐẠO DUY NHẤT) ─── */}
      <motion.div
        variants={itemVariants}
        className="bg-white/95 dark:bg-[#0B0C1E]/90 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 rounded-3xl p-3 px-5 shadow-lg flex items-center justify-between gap-3 overflow-x-auto"
      >
        <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 shrink-0">
          Truy cập nhanh:
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/exam-sessions"
            className="eg-glass-pill px-4 py-2 flex items-center gap-2 text-xs font-bold transition"
          >
            <CalendarRange className="w-3.5 h-3.5 text-[var(--color-azure)]" />
            <span>Lịch & Ca Thi</span>
          </Link>
          <Link
            to="/exam-papers"
            className="eg-glass-pill px-4 py-2 flex items-center gap-2 text-xs font-bold transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--color-azure)]" />
            <span>Ngân Hàng Đề</span>
          </Link>
          <Link
            to="/live-proctor"
            className="eg-glass-pill px-4 py-2 flex items-center gap-2 text-xs font-bold transition shadow-sm"
          >
            <Eye className="w-3.5 h-3.5 text-[var(--color-azure)]" />
            <span>Phòng Giám Sát 3D</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-azure)] animate-ping" />
          </Link>
          <Link
            to="/grading-review"
            className="eg-glass-pill px-4 py-2 flex items-center gap-2 text-xs font-bold transition"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-[var(--color-azure)]" />
            <span>Rà Soát Chấm Điểm</span>
          </Link>
          <Link
            to="/face-kyc"
            className="eg-glass-pill px-4 py-2 flex items-center gap-2 text-xs font-bold transition"
          >
            <ScanFace className="w-3.5 h-3.5 text-[var(--color-azure)]" />
            <span>Đăng Ký Face ID</span>
          </Link>
        </div>
      </motion.div>

      {/* ─── 4. LOWER BENTO SPLIT: LIVE EXAM STREAM & AI VIOLATIONS CHART ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột 1 & 2: Tiến Độ Ca Thi Realtime (2/3) */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-2 eg-cyber-card p-6 flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--color-azure)]" />
                  Tiến Độ Ca Thi Khảo Thí
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Giám sát danh sách phòng thi đang vận hành và đã hoàn thành
                </p>
              </div>

              {/* Lọc ca thi */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    placeholder="Lọc ca thi..."
                    className="pl-8 pr-3 py-1.5 rounded-full text-xs bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-[var(--color-azure)] w-36 sm:w-44 transition"
                  />
                </div>
                <Link
                  to="/exam-sessions"
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold eg-glass-pill transition flex items-center gap-1 shadow-sm"
                >
                  Tất cả <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Bảng Dữ Liệu Tinh Gọn Kính */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-transparent">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/90 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-white/10">
                  <tr>
                    <th className="px-4 py-3">Môn học & Mã ca</th>
                    <th className="px-4 py-3">Phòng thi</th>
                    <th className="px-4 py-3">Khung giờ</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/[0.06] font-medium text-slate-700 dark:text-slate-300">
                  {filteredSessions.length > 0 ? (
                    filteredSessions.map((session: any) => (
                      <tr key={session._id} className="hover:bg-[var(--color-electric)]/5 dark:hover:bg-white/[0.04] transition-colors">
                        <td className="px-4 py-3.5">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {session.subject?.name || session.title}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {session.code}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                            <Building2 className="w-3.5 h-3.5 text-[var(--color-azure)]" />
                            {session.room?.code || 'LAB01'}
                          </span>
                          <span className="block text-[10px] text-slate-500 dark:text-slate-400">{session.room?.capacity || 24} máy thi</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="block font-semibold">
                            {new Date(session.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(session.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{session.durationMinutes} phút</span>
                        </td>
                        <td className="px-4 py-3.5">
                          {session.status === 'IN_PROGRESS' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Đang thi
                            </span>
                          ) : session.status === 'COMPLETED' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                              Đã kết thúc
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--color-electric)]/15 text-[var(--color-azure)] border border-[var(--color-azure)]/30">
                              Sắp tới
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-2">
                          <Link
                            to={`/live-proctor/${session._id}`}
                            className="eg-btn-gradient px-3.5 py-1.5 rounded-full font-bold text-[11px] inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <Eye className="w-3 h-3 text-white" />
                            <span>Giám thị 3D</span>
                          </Link>
                          <Link
                            to={`/grading-review/${session._id}`}
                            className="px-3.5 py-1.5 eg-glass-pill rounded-full font-semibold text-[11px] transition-all inline-block shadow-xs cursor-pointer"
                          >
                            Duyệt điểm
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                        Chưa có ca thi nào phù hợp. Nhấn "Lịch & Ca thi" để tạo mới.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Cột 3: Biểu Đồ Vi Phạm AI & Trụ Cột Zero-Trust (1/3) */}
        <motion.div
          variants={itemVariants}
          className="eg-cyber-card p-6 flex flex-col justify-between space-y-4"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[var(--color-azure)]" />
                  Phân Loại Cảnh Báo AI
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tần suất nhận diện qua ArcFace Core</p>
              </div>
            </div>

            <div className="h-56 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={finalChartData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#94a3b8" opacity={0.25} />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#64748b" />
                  <YAxis dataKey="name" type="category" width={115} tick={{ fontSize: 10 }} stroke="#64748b" />
                  <Tooltip
                    formatter={(value: any) => [`${value} lượt`, 'Tần suất']}
                    contentStyle={{ borderRadius: '16px', border: '1px solid rgba(var(--color-azure-rgb),0.3)', fontSize: '11px', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}
                  />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    {finalChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tiêu chuẩn Bảo Mật Zero-Trust Tinh Gọn */}
          <div className="bg-slate-50/90 dark:bg-[#070814]/80 rounded-2xl p-4 border border-slate-200/80 dark:border-white/10 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <ShieldAlert className="w-4 h-4 text-[var(--color-azure)]" />
              <span>Tiêu Chuẩn Bảo Mật Zero-Trust</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Rọc phách điện tử</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Khóa quyền ngoài giờ</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Giám thị ghé: 0đ phạt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Nhật ký bất biến</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

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
  ShieldAlert
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { apiClient } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';

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
  PROCTOR_INSPECTION: 'Giám thị kiểm tra (0đ)',
  SEB_INTEGRITY_BREACH: 'Vi phạm khóa màn hình',
  MANUAL_WARNING: 'Nhắc nhở thủ công'
};

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<any>(null);

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

  // Fallback demo chart data nếu chưa có vi phạm
  const finalChartData = chartData.length > 0 ? chartData : [
    { name: 'Quay mặt (>3s)', count: 8, color: '#f59e0b' },
    { name: '2 khuôn mặt', count: 3, color: '#ef4444' },
    { name: 'Rời vị trí', count: 2, color: '#f97316' },
    { name: 'Giám thị kiểm tra (0đ)', count: 12, color: '#10b981' },
    { name: 'Nhắc nhở thủ công', count: 1, color: '#64748b' }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* ─── ExamGuard AI Hero Header ─── */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-[#0c1222] to-slate-900 p-6 lg:p-8 border border-white/5">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
                <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="text-sky-400 font-bold text-xs uppercase tracking-widest">
                ExamGuard AI — Trung tâm Khảo thí & Giám sát
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Bảng Điều hành Khảo thí Thời gian thực
            </h1>
            <p className="text-slate-400 text-sm max-w-xl font-medium">
              Giám sát ca thi 3D, đối soát Face ID YuNet + ArcFace, tự động chấm trắc nghiệm và rà soát kết quả theo chuẩn Zero-Trust.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={fetchDashboardStats}
              className="p-2.5 bg-white/5 hover:bg-white/10 text-white backdrop-blur-md rounded-xl transition-all flex items-center gap-2 text-xs font-semibold border border-white/10"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
            <div className="bg-sky-500/10 border border-sky-500/20 text-sky-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Hệ thống AI Hoạt động</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── ExamGuard Quick Actions ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          to="/exam-sessions"
          className="group flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-500/5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-500 flex items-center justify-center group-hover:bg-sky-500 group-hover:text-white transition-all">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Lịch & Ca thi</p>
            <p className="text-[11px] text-slate-400">Xếp chỗ & Tạo mã PIN</p>
          </div>
        </Link>
        <Link
          to="/exam-papers"
          className="group flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center group-hover:bg-violet-500 group-hover:text-white transition-all">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Ngân hàng Đề thi</p>
            <p className="text-[11px] text-slate-400">Đáp án đúng & Giải thích</p>
          </div>
        </Link>
        <Link
          to="/live-proctor"
          className="group flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 hover:border-red-300 hover:shadow-lg hover:shadow-red-500/5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all relative">
            <Eye className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Phòng thi 3D Live</p>
            <p className="text-[11px] text-slate-400">Giám thị & Camera AI</p>
          </div>
        </Link>
        <Link
          to="/grading-review"
          className="group flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/5 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">Rà soát Chấm thi</p>
            <p className="text-[11px] text-slate-400">Tự động chấm 1 lần</p>
          </div>
        </Link>
      </div>

      {/* ─── 4 Thẻ Thống kê Khảo thí then chốt ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ca thi */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md uppercase">
              Ca thi
            </span>
          </div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Đang diễn ra</h3>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            {loading ? <span className="inline-block w-16 h-7 bg-slate-100 rounded animate-pulse" /> : `${summary.activeSessions || 1} / ${summary.totalSessions || 1}`}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Sắp tới: <span className="font-bold text-sky-600">{summary.scheduledSessions || 0} ca</span> · Hoàn thành: <span className="font-bold text-emerald-600">{summary.completedSessions || 0} ca</span>
          </p>
        </div>

        {/* Thí sinh dự thi */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md uppercase">
              Thí sinh
            </span>
          </div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Đang làm bài</h3>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            {loading ? <span className="inline-block w-16 h-7 bg-slate-100 rounded animate-pulse" /> : `${summary.inExamCandidates || 1} thí sinh`}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Đã nộp bài: <span className="font-bold text-violet-600">{summary.submittedCandidates || 0}</span> · Đã KYC: <span className="font-bold text-emerald-600">{summary.kycStudents || summary.totalStudents || 1}</span>
          </p>
        </div>

        {/* Điểm uy tín trung bình */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
              Chỉ số uy tín
            </span>
          </div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Điểm uy tín TB</h3>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            {loading ? <span className="inline-block w-16 h-7 bg-slate-100 rounded animate-pulse" /> : `${summary.avgTrustScore || 95} / 100`}
          </p>
          <p className="text-[11px] text-emerald-600 mt-1 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mức độ tin cậy: Xuất sắc
          </p>
        </div>

        {/* Giám sát AI & False Positive Filter */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <ScanFace className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md uppercase">
              Coi thi AI
            </span>
          </div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cán bộ coi thi kiểm tra</h3>
          <p className="text-2xl font-extrabold text-slate-900 mt-1 tracking-tight">
            {loading ? <span className="inline-block w-16 h-7 bg-slate-100 rounded animate-pulse" /> : `${summary.proctorPresences || 0} lượt`}
          </p>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            Xác minh ArcFace: <span className="font-bold text-emerald-600">0đ phạt (An toàn)</span>
          </p>
        </div>
      </div>

      {/* ─── Grid Biểu đồ & Giám sát ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột 1 & 2: Danh sách Ca thi Realtime */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-sky-500" />
                Ca thi Hiện tại & Sắp diễn ra
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Theo dõi tiến độ làm bài và trạng thái giám sát các phòng thi</p>
            </div>
            <Link to="/exam-sessions" className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1">
              Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3 py-2.5 rounded-l-lg">Mã ca / Môn học</th>
                  <th className="px-3 py-2.5">Phòng thi</th>
                  <th className="px-3 py-2.5">Thời gian</th>
                  <th className="px-3 py-2.5">Trạng thái</th>
                  <th className="px-3 py-2.5 text-right rounded-r-lg">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {recentSessions.length > 0 ? (
                  recentSessions.map((session: any) => (
                    <tr key={session._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-3">
                        <span className="font-bold text-slate-900 block">{session.title}</span>
                        <span className="text-[11px] text-slate-400">{session.code} · {session.subject?.name || 'Môn học'}</span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {session.room?.code || 'P302'}
                        </span>
                        <span className="block text-[10px] text-slate-400">{session.room?.capacity || 40} bàn</span>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        <span className="block font-semibold">
                          {new Date(session.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(session.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[10px] text-slate-400">{session.durationMinutes} phút</span>
                      </td>
                      <td className="px-3 py-3">
                        {session.status === 'IN_PROGRESS' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Đang thi
                          </span>
                        ) : session.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            Đã kết thúc
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                            Sắp bắt đầu
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right space-x-1">
                        <Link
                          to={`/live-proctor/${session._id}`}
                          className="px-2.5 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-md font-bold text-[11px] transition-all inline-block"
                        >
                          Giám thị 3D
                        </Link>
                        <Link
                          to={`/grading-review/${session._id}`}
                          className="px-2.5 py-1 bg-sky-50 text-sky-600 hover:bg-sky-100 rounded-md font-bold text-[11px] transition-all inline-block"
                        >
                          Duyệt điểm
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-400">
                      Chưa có ca thi nào. Nhấn vào mục "Lịch & Ca thi" để khởi tạo ca thi mới.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột 3: Biểu đồ Phân bổ Cảnh báo AI */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-violet-500" />
              Phân loại Cảnh báo AI
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Tần suất các loại sự kiện vi phạm trong ca thi</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finalChartData} layout="vertical" margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(value: any) => [`${value} lượt`, 'Số lần']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {finalChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Quy tắc Zero-Trust Indicator */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <ShieldAlert className="w-4 h-4 text-sky-600" />
              <span>Cơ chế Bảo mật Zero-Trust</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Rọc phách điện tử</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Khóa quyền ngoài giờ thi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Mặt Giám thị: 0đ phạt</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Nhật ký bất biến</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

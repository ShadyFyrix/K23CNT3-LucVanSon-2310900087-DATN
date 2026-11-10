import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  FileCheck2,
  User,
  Mail,
  Phone,
  Building2,
  Layers,
  HelpCircle,
  Eye,
  Camera,
  FileText,
  AlertCircle,
  Key,
  Lock,
  Edit3,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { apiClient } from '../../api/apiClient';
import { toast } from 'react-hot-toast';
import { Modal } from '../../components/Modal';

export default function StudentPortalPage() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'TRANSCRIPT' | 'PROFILE' | 'RULES'>('SCHEDULE');
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [scheduleData, setScheduleData] = useState<any>({ sessions: [], activeSession: null, nextUpcomingSession: null });

  // Modal Edit Profile
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Modal Change Password
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleOpenEdit = () => {
    setEditFullName(studentProfile?.fullName || user?.fullName || '');
    setEditPhone(studentProfile?.phone || '');
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingProfile(true);
      const res = await apiClient.put('/auth/profile', {
        fullName: editFullName,
        phone: editPhone
      });
      if (res.data.success) {
        toast.success('Cập nhật thông tin thành công!');
        setIsEditModalOpen(false);
        fetchStudentData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật thông tin');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Vui lòng điền đầy đủ mật khẩu');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Xác nhận mật khẩu mới không khớp');
      return;
    }
    try {
      setIsSavingPassword(true);
      const res = await apiClient.put('/auth/change-password', {
        currentPassword,
        newPassword
      });
      if (res.data.success) {
        toast.success('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới.');
        setIsPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Mật khẩu hiện tại không chính xác');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, scheduleRes] = await Promise.allSettled([
        apiClient.get('/students/me'),
        apiClient.get('/exams/student-schedule', { params: { email: user?.email } })
      ]);

      if (profileRes.status === 'fulfilled' && profileRes.value.data?.success) {
        setStudentProfile(profileRes.value.data.data);
      }

      if (scheduleRes.status === 'fulfilled' && scheduleRes.value.data?.success) {
        setScheduleData(scheduleRes.value.data);
      }
    } catch (err: any) {
      console.warn('Lỗi tải dữ liệu sinh viên:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const sessions = scheduleData.sessions || [];
  const activeSession = scheduleData.activeSession;
  const nextSession = scheduleData.nextUpcomingSession;

  const upcomingSessions = useMemo(() => sessions.filter((s: any) => !s.isEnded), [sessions]);
  const historySessions = useMemo(() => sessions.filter((s: any) => s.isEnded || s.status === 'SUBMITTED'), [sessions]);

  // Tính điểm trung bình tích lũy từ các bài thi đã có điểm
  const averageScore = useMemo(() => {
    const scoredList = historySessions.filter((s: any) => s.officialScore !== null && s.officialScore !== undefined);
    if (scoredList.length === 0) return 8.5; // Demo baseline nếu bài thi đang chấm
    const sum = scoredList.reduce((acc: number, curr: any) => acc + Number(curr.officialScore), 0);
    return (sum / scoredList.length).toFixed(1);
  }, [historySessions]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans animate-in fade-in duration-300">
      {/* ── 1. DIGITAL STUDENT BADGE HEADER ── */}
      <div className="eg-hero-card p-6 lg:p-8 rounded-3xl relative overflow-hidden transition-all shadow-xl">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-[var(--color-electric)]/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-5">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl eg-btn-gradient text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-[var(--accent-glow)] ring-4 ring-white/10 overflow-hidden">
                {user?.facePhoto || studentProfile?.facePhoto ? (
                  <img
                    src={user?.facePhoto || studentProfile?.facePhoto}
                    alt={user?.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  user?.fullName?.charAt(0)?.toUpperCase() || 'S'
                )}
              </div>
              <div
                className={`absolute -bottom-1 -right-1 p-1 rounded-full shadow-md text-white ${
                  user?.isFaceRegistered || studentProfile?.isFaceRegistered ? 'bg-emerald-500' : 'bg-blue-500'
                }`}
                title={user?.isFaceRegistered ? 'Face ID đã kích hoạt' : 'Xác thực sinh trắc học tại Cổng thi'}
              >
                {user?.isFaceRegistered || studentProfile?.isFaceRegistered ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <ScanFace className="w-4 h-4" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white">
                  {studentProfile?.fullName || user?.fullName || 'Sinh viên Dự thi'}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-[var(--color-electric)]/15 text-[var(--color-azure)] border border-[var(--color-azure)]/30 font-mono">
                  {studentProfile?.studentCode || 'MSSV: 2310900087'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                Khoa: <span className="font-semibold text-slate-700 dark:text-slate-300">{studentProfile?.department?.name || 'Công nghệ Thông tin'}</span>
                {' · '}Lớp: <span className="font-semibold text-slate-700 dark:text-slate-300">{studentProfile?.class?.name || 'K23-CNTT01'}</span>
              </p>

              <div className="mt-2.5 flex items-center gap-2">
                {user?.isFaceRegistered || studentProfile?.isFaceRegistered ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <ScanFace className="w-3.5 h-3.5 mr-1" />
                    Face ID: Đã kích hoạt hồ sơ
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-electric)]/15 text-[var(--color-azure)] border border-[var(--color-azure)]/30">
                    <ScanFace className="w-3.5 h-3.5 mr-1" />
                    Face ID: Xác thực tại Cổng thi
                  </span>
                )}
                <span className="text-xs text-slate-400 font-mono">Hệ: Chính quy</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="flex-1 lg:flex-none px-4 py-3 rounded-2xl eg-cyber-card text-center min-w-[110px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Ca Thi Sắp Tới</div>
              <div className="text-xl font-extrabold text-[var(--color-azure)] font-mono mt-0.5">
                {upcomingSessions.length}
              </div>
            </div>

            <div className="flex-1 lg:flex-none px-4 py-3 rounded-2xl eg-cyber-card text-center min-w-[110px]">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Điểm TB (GPA)</div>
              <div className="text-xl font-extrabold text-[var(--color-azure)] font-mono mt-0.5">
                {averageScore}
              </div>
            </div>

            <button
              onClick={fetchStudentData}
              disabled={loading}
              title="Làm mới thông tin"
              className={`p-3 rounded-2xl border transition ${
                isDark ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white/80 border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. SPOTLIGHT ACTIVE EXAM (IF HAPPENING) ── */}
      {activeSession && (
        <div className={`p-6 rounded-3xl border shadow-xl relative overflow-hidden transition-all ${
          isDark
            ? 'bg-gradient-to-r from-red-950/60 via-amber-950/40 to-slate-900 border-red-500/40'
            : 'bg-gradient-to-r from-red-50 via-amber-50 to-white border-red-300'
        }`}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-red-600 text-white animate-pulse inline-block mb-2">
                CA THI ĐANG DIỄN RA
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {activeSession.session.title || activeSession.session.subjectName}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                Phòng thi: <strong className="text-slate-900 dark:text-white">{activeSession.session.roomName}</strong>
                {' · '}Số báo danh: <strong className="text-blue-600 dark:text-blue-400 font-mono">{activeSession.candidateCode}</strong>
                {activeSession.seatPin && <span>{' · '}PIN: <strong className="font-mono bg-red-500/10 px-2 py-0.5 rounded text-red-600">{activeSession.seatPin}</strong></span>}
              </p>
            </div>

            <button
              onClick={() => navigate(`/take-exam/${activeSession.id}`)}
              className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm shadow-xl shadow-red-600/30 transition flex items-center space-x-2 shrink-0"
            >
              <Monitor className="w-4 h-4" />
              <span>Vào Phòng Thi Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── 3. NAVIGATION TABS (UNIFIED CAPSULE BAR) ── */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3 border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('SCHEDULE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'SCHEDULE'
              ? 'eg-glass-pill shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Lịch thi & Phòng thi ({upcomingSessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TRANSCRIPT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'TRANSCRIPT'
              ? 'eg-glass-pill shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Bảng điểm & Bài thi ({historySessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'PROFILE'
              ? 'eg-glass-pill shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Hồ sơ & Face KYC</span>
        </button>

        <button
          onClick={() => setActiveTab('RULES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
            activeTab === 'RULES'
              ? 'eg-glass-pill shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Quy chế Phòng thi AI</span>
        </button>
      </div>

      {/* ── TAB CONTENT ── */}
      {/* 1. LỊCH THI */}
      {activeTab === 'SCHEDULE' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {upcomingSessions.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs">
              Hiện tại bạn không có ca thi nào sắp tới.
            </div>
          ) : (
            upcomingSessions.map((item: any) => (
              <div
                key={item.id}
                className="eg-cyber-card p-5 rounded-3xl transition-all duration-200 hover:shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-[var(--color-electric)]/10 text-[var(--color-azure)] border border-[var(--color-azure)]/20">
                      {item.session.code}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {item.session.durationMinutes} phút
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-3 line-clamp-2">
                    {item.session.title || item.session.subjectName}
                  </h3>

                  <div className="mt-4 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <p className="flex items-center"><Calendar className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {new Date(item.session.startTime).toLocaleString('vi-VN')}</p>
                    <p className="flex items-center"><Monitor className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {item.session.roomName}</p>
                    <p className="flex items-center font-mono">Số báo danh: <strong className="text-slate-800 dark:text-slate-200 ml-1">{item.candidateCode}</strong></p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-white/10 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
                    Sẵn sàng
                  </span>

                  <button
                    onClick={() => navigate(`/take-exam/${item.id}`)}
                    className="px-4 py-1.5 rounded-full eg-btn-gradient text-white text-xs font-bold shadow-md transition flex items-center space-x-1 cursor-pointer"
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

      {/* 2. BẢNG ĐIỂM & BÀI THI */}
      {activeTab === 'TRANSCRIPT' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {historySessions.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-xs">
                Chưa có kết quả bài thi nào được ghi nhận.
              </div>
            ) : (
              historySessions.map((item: any) => (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}
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

                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Điểm Chính Thức</div>
                      <div className="text-2xl font-black text-[var(--color-azure)] font-mono mt-0.5">
                        {item.officialScore !== null && item.officialScore !== undefined
                          ? `${item.officialScore.toFixed(1)} / 10`
                          : 'Đang chấm'}
                      </div>
                    </div>
                    {item.trustScore !== undefined && (
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Trust Score AI</div>
                        <div className={`text-sm font-extrabold mt-0.5 ${
                          (item.trustScore || 100) >= 80 ? 'text-emerald-500' : 'text-amber-500'
                        }`}>
                          {item.trustScore}%
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.session.startTime).toLocaleDateString('vi-VN')}
                    </span>
                    <button
                      onClick={() => navigate(`/exam/result?view=student&sessionStudentId=${item.id}`)}
                      className="px-3.5 py-1.5 rounded-full eg-glass-pill-subtle text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Xem đáp án & Phúc khảo</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. HỒ SƠ CÁ NHÂN & FACE KYC */}
      {activeTab === 'PROFILE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`p-6 rounded-3xl border space-y-4 text-center lg:col-span-1 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="w-28 h-28 mx-auto rounded-3xl bg-blue-600/10 border-2 border-dashed border-blue-500/30 overflow-hidden flex items-center justify-center">
              {user?.facePhoto || studentProfile?.facePhoto ? (
                <img
                  src={user?.facePhoto || studentProfile?.facePhoto}
                  alt="Face KYC"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Camera className="w-10 h-10 text-slate-400" />
              )}
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {studentProfile?.fullName || user?.fullName}
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {studentProfile?.studentCode || '2310900087'}
              </p>
            </div>

            {(user?.isFaceRegistered || studentProfile?.isFaceKyc || user?.facePhoto || studentProfile?.facePhoto) ? (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl text-left space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Face ID: Đã Được Xác Minh</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Khuôn mặt đã được Hội đồng Khảo thí xác minh đối soát chuẩn KYC. Đủ điều kiện nhận diện tự động khi dự thi.
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 rounded-2xl text-left space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Face ID: Chưa Xác Minh</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  Việc xác minh khuôn mặt chỉ được thực hiện tại trang của <strong>Quản trị viên Khảo thí (Admin)</strong>. Thí sinh vui lòng liên hệ Ban Khảo thí tại phòng máy để được đối soát và quét khuôn mặt gốc.
                </p>
              </div>
            )}
          </div>

          <div className={`p-6 rounded-3xl border space-y-5 lg:col-span-2 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider border-b pb-2 border-slate-200 dark:border-slate-800">
              Chi Tiết Hồ Sơ Đào Tạo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Họ và tên thí sinh</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{studentProfile?.fullName || user?.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Mã số sinh viên (MSSV)</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{studentProfile?.studentCode || '2310900087'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Email trường cấp</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{user?.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Số điện thoại liên hệ</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{studentProfile?.phone || '0987 654 321'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Khoa / Bộ môn</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{studentProfile?.department?.name || 'Khoa Công nghệ Thông tin'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Lớp sinh hoạt</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{studentProfile?.class?.name || 'K23-CNTT01'}</span>
              </div>
            </div>

            {/* Action Buttons for Student */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
              <button
                onClick={handleOpenEdit}
                className="px-5 py-2.5 rounded-full eg-btn-gradient text-white text-xs font-bold shadow-md transition flex items-center space-x-2 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Chỉnh sửa thông tin cá nhân</span>
              </button>

              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="px-4 py-2.5 rounded-xl border border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 text-xs font-bold transition flex items-center space-x-2"
              >
                <Key className="w-4 h-4" />
                <span>Đổi mật khẩu tài khoản</span>
              </button>
            </div>

            {/* Security Notice */}
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>
                <strong>Lưu ý bảo mật:</strong> Mật khẩu ban đầu do Hội đồng Khảo thí cấp. Bạn nên đổi mật khẩu ngay sau lần đăng nhập đầu tiên để bảo đảm an toàn dữ liệu và quyền lợi thi cử của chính mình.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CHỈNH SỬA THÔNG TIN CÁ NHÂN ── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Chỉnh Sửa Thông Tin Cá Nhân"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Họ và tên thí sinh
            </label>
            <input
              type="text"
              value={editFullName}
              onChange={(e) => setEditFullName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Số điện thoại liên hệ
            </label>
            <input
              type="tel"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
              placeholder="0987 654 321"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 text-[11px] text-slate-500 space-y-1 font-mono">
            <p>MSSV: {studentProfile?.studentCode || '2310900087'} (Cố định do trường cấp)</p>
            <p>Email: {user?.email} (Duy nhất trên hệ thống)</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSavingProfile}
              className="flex-1 px-5 py-2.5 rounded-full eg-btn-gradient text-white text-xs font-bold shadow-md transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              {isSavingProfile && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL: ĐỔI MẬT KHẨU TÀI KHOẢN ── */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title="Đổi Mật Khẩu Cá Nhân"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Mật khẩu hiện tại (Do Admin cấp)
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Nhập mật khẩu hiện tại..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Mật khẩu mới
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
              Xác nhận mật khẩu mới
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới..."
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSavingPassword}
              className="flex-1 px-4 py-2.5 rounded-full eg-btn-gradient text-white text-xs font-bold shadow-md shadow-[var(--accent-glow)] transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              {isSavingPassword && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Đổi mật khẩu ngay</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. QUY CHẾ PHÒNG THI AI */}
      {activeTab === 'RULES' && (
        <div className={`p-6 lg:p-8 rounded-3xl border space-y-6 ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-electric)]/10 text-[var(--color-azure)] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Nội Quy & Tiêu Chuẩn Phòng Thi Trực Tuyến ExamGuard AI
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Áp dụng thuật toán ArcFace + YuNet phát hiện gian lận và khóa màn hình SEB
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                Hành vi bắt buộc tuân thủ
              </h4>
              <ul className="list-disc list-inside space-y-1.5 text-slate-500 dark:text-slate-400 pl-1">
                <li>Bật webcam liên tục trong suốt thời gian làm bài thi.</li>
                <li>Ngồi chính diện, khuôn mặt chiếu sáng rõ ràng, không che mắt/tai.</li>
                <li>Xác thực Face ID trước khi bước vào phòng thi.</li>
                <li>Nộp bài trước khi thời gian đếm ngược kết thúc.</li>
              </ul>
            </div>

            <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 space-y-2">
              <h4 className="font-bold text-red-600 dark:text-red-400 flex items-center">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                Các hành vi bị AI trừ điểm & lập biên bản
              </h4>
              <ul className="list-disc list-inside space-y-1.5 text-slate-500 dark:text-slate-400 pl-1">
                <li>Quay mặt sang hai bên quá 3 giây liên tiếp.</li>
                <li>Xuất hiện người thứ hai trong khung hình camera.</li>
                <li>Rời khỏi vị trí ngồi trước webcam trong lúc ca thi đang diễn ra.</li>
                <li>Chuyển tab trình duyệt hoặc thoát chế độ toàn màn hình SEB.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

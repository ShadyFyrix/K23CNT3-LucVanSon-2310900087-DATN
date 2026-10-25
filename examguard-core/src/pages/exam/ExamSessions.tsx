import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Plus,
  Play,
  Eye,
  ShieldCheck,
  CheckCircle,
  Users,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Loader2,
  FileText,
  Lock,
  CheckCircle2,
  LayoutGrid,
  CalendarRange,
  Trophy,
  Sparkles,
  X,
  Zap,
  Heart,
  Flame,
  Sliders,
  Timer
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../api/apiClient';
import { CandidateManagerModal } from './CandidateManagerModal';
import { ResourceTimelineView } from './ResourceTimelineView';
import { CreateSessionModal } from './CreateSessionModal';
import { useAuth } from '../../context/AuthContext';

interface ExamSessionItem {
  _id: string;
  code: string;
  title: string;
  subject?: { name: string; courseCode: string };
  room?: { _id?: string; code: string; name: string; capacity: number; campus?: any };
  startTime: string;
  endTime: string;
  durationMinutes: number;
  examType: string;
  status: string;
  gradingStatus: string;
  proctor1?: { fullName: string };
  studentCount?: number;
}

export default function ExamSessions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ExamSessionItem[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'TIMELINE' | 'CARDS'>('TIMELINE');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedSessionForCandidates, setSelectedSessionForCandidates] = useState<ExamSessionItem | null>(null);
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);

  // State Modal Thêm Ca Thi (Dành riêng cho Admin)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createPresetRoomId, setCreatePresetRoomId] = useState<string | undefined>(undefined);
  const [createPresetStartTime, setCreatePresetStartTime] = useState<string | undefined>(undefined);

  // Phân quyền: Admin tạo được phòng thi chính khóa; Giảng viên & Admin tạo được phòng Quiz
  const isAdmin = (user as any)?.role?.name === 'admin' || (user as any)?.role === 'admin' || (user as any)?.department === 'admin';
  const isTeacher = (user as any)?.role?.name === 'teacher' || (user as any)?.role === 'teacher' || (user as any)?.department === 'teacher';

  // State Modal Tạo Phòng Quiz Nhanh (Dành cho Giảng viên & Admin)
  const [isCreateQuizModalOpen, setIsCreateQuizModalOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [selectedPaperId, setSelectedPaperId] = useState('');
  const [availablePapers, setAvailablePapers] = useState<any[]>([]);
  const [quizSeconds, setQuizSeconds] = useState(30);
  const [scoringType, setScoringType] = useState<'SPEED_BONUS' | 'STANDARD'>('SPEED_BONUS');
  const [enableHearts, setEnableHearts] = useState<boolean>(true);
  const [timerType, setTimerType] = useState<'PER_QUESTION_TIMER' | 'MANUAL_HOST'>('PER_QUESTION_TIMER');
  const [showLeaderboardLive, setShowLeaderboardLive] = useState<boolean>(true);
  const [isCreatingQuiz, setIsCreatingQuiz] = useState(false);

  const openCreateQuizModal = async () => {
    try {
      const res = await apiClient.get('/api/exam/papers');
      if (res.data && res.data.success) {
        const papers = res.data.data || [];
        setAvailablePapers(papers);
        if (papers.length > 0) setSelectedPaperId(papers[0]._id);
      }
    } catch (err) {
      console.warn('Lỗi lấy đề thi:', err);
    }
    setIsCreateQuizModalOpen(true);
  };

  const handleCreateQuickQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaperId) {
      toast.error('Vui lòng chọn một đề thi từ ngân hàng!');
      return;
    }
    setIsCreatingQuiz(true);
    try {
      const res = await apiClient.post('/api/quiz-arena/create-room', {
        title: quizTitle || undefined,
        examPaperId: selectedPaperId,
        gameRules: {
          scoringType,
          timerType,
          secondsPerQuestion: quizSeconds,
          enableHearts,
          maxHearts: 3,
          showLeaderboard: showLeaderboardLive
        }
      });
      if (res.data && res.data.success) {
        toast.success('Đã tạo phòng Quiz thành công!');
        setIsCreateQuizModalOpen(false);
        navigate(`/quiz-arena/host/${res.data.data._id}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi tạo phòng Quiz');
    } finally {
      setIsCreatingQuiz(false);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await apiClient.get('/api/exam/rooms');
      if (res.data && res.data.success) {
        setRooms(res.data.data);
      }
    } catch (e) {
      console.warn('Lỗi fetch rooms:', e);
    }
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const [resSessions, resRooms] = await Promise.all([
        apiClient.get('/api/exam/sessions'),
        apiClient.get('/api/exam/rooms').catch(() => ({ data: { success: false, data: [] } }))
      ]);
      if (resSessions.data && resSessions.data.success) {
        setSessions(resSessions.data.data);
      }
      if (resRooms.data && resRooms.data.success) {
        setRooms(resRooms.data.data);
      }
    } catch (e: any) {
      console.error('Lỗi fetch ca thi:', e);
      toast.error('Không thể tải danh sách ca thi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Format dải thời gian thi (Start -> End • Ngày)
  const formatTimeRange = (startStr?: string, endStr?: string) => {
    if (!startStr) return 'Chưa xếp lịch';
    const start = new Date(startStr);
    const end = endStr ? new Date(endStr) : new Date(start.getTime() + 60 * 60000);
    const dateFormatted = start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const startTime = start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    return `${startTime} - ${endTime} • ${dateFormatted}`;
  };

  // Xác định trạng thái vòng đời ca thi chính xác
  const getSessionStatus = (s: ExamSessionItem) => {
    const now = Date.now();
    const start = s.startTime ? new Date(s.startTime).getTime() : now;
    const end = s.endTime ? new Date(s.endTime).getTime() : (start + (s.durationMinutes || 60) * 60000);

    if (s.gradingStatus === 'PUBLISHED') {
      return { key: 'PUBLISHED', label: 'ĐÃ CÔNG BỐ ĐIỂM', isEnded: true, isOngoing: false, isUpcoming: false, badgeClass: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' };
    }
    if (s.status === 'COMPLETED' || now > end) {
      return { key: 'COMPLETED', label: 'ĐÃ KẾT THÚC', isEnded: true, isOngoing: false, isUpcoming: false, badgeClass: 'bg-slate-800 text-slate-300 border border-slate-700' };
    }
    if (now >= start && now <= end) {
      const remainingMinutes = Math.max(0, Math.round((end - now) / 60000));
      return { key: 'IN_PROGRESS', label: `ĐANG THI (Còn ${remainingMinutes}p)`, isEnded: false, isOngoing: true, isUpcoming: false, badgeClass: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse' };
    }
    const waitMinutes = Math.max(0, Math.round((start - now) / 60000));
    return { key: 'SCHEDULED', label: waitMinutes < 60 ? `SẮP THI (Sau ${waitMinutes}p)` : 'LÊN LỊCH', isEnded: false, isOngoing: false, isUpcoming: true, badgeClass: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30' };
  };

  // Giảng viên / Giám thị kết thúc ca thi thủ công & Thu bài tự động
  const handleEndSession = async (session: ExamSessionItem) => {
    if (!window.confirm(`XÁC NHẬN KẾT THÚC CA THI "${session.code}"?\n\n- Toàn bộ bài thi của sinh viên chưa nộp sẽ được tự động thu nhận.\n- Hệ thống tự động chấm điểm trắc nghiệm và khóa buồng thi.\n- Chuyển ca thi sang trạng thái "Đã kết thúc" để sẵn sàng rà soát điểm.`)) {
      return;
    }
    try {
      setClosingSessionId(session._id);
      const res = await apiClient.post(`/api/exam/sessions/${session._id}/end-session`);
      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Đã kết thúc ca thi thành công!', { icon: '🏁' });
        await fetchSessions();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi kết thúc ca thi');
    } finally {
      setClosingSessionId(null);
    }
  };

  const filtered = sessions.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase());
    const lifeStatus = getSessionStatus(s);
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter || s.gradingStatus === statusFilter || lifeStatus.key === statusFilter;
    const matchType = typeFilter === 'ALL' || s.examType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">ExamGuard AI</span>
              <span>•</span>
              <span>Khảo thí & Thi Trực Tuyến</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center space-x-3">
              <span>QUẢN LÝ LỊCH THI & CA THI QUIZ</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                {sessions.length} CA THI
              </span>
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            {/* 1. Chỉ ADMIN mới có quyền tạo Ca thi / Phòng thi chính thức */}
            {isAdmin && (
              <button
                onClick={() => {
                  setCreatePresetRoomId(undefined);
                  setCreatePresetStartTime(undefined);
                  setIsCreateModalOpen(true);
                }}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition active:scale-95 cursor-pointer"
                title="Admin Khảo thí: Lên lịch ca thi chính khóa phòng P302"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Thêm Ca Thi (Admin)</span>
              </button>
            )}

            {/* 2. GIẢNG VIÊN & ADMIN: Được quyền tạo nhanh Phòng Quiz Arena */}
            {(isTeacher || isAdmin) && (
              <button
                onClick={openCreateQuizModal}
                className="flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-amber-500/20 transition active:scale-95 cursor-pointer"
                title="Giảng viên: Tạo nhanh phòng Quiz Arena cho lớp học"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>⚡ Tạo Phòng Quiz</span>
              </button>
            )}

            <button
              onClick={() => navigate('/take-exam')}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition active:scale-95 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Vào Làm Bài Quiz</span>
            </button>
            <button
              onClick={() => navigate('/exam-papers')}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Ngân Hàng Đề Thi</span>
            </button>
          </div>
        </div>

        {/* Toolbar điều khiển & lọc */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center space-x-3 flex-1">
            {/* Chuyển đổi giao diện: Timeline Gantt vs Thẻ Ca Thi */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <button
                onClick={() => setViewMode('TIMELINE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'TIMELINE' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Resource Timeline (Gantt)</span>
              </button>
              <button
                onClick={() => setViewMode('CARDS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'CARDS' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Thẻ Ca Thi ({sessions.length})</span>
              </button>
            </div>

            <div className="relative flex-1 max-w-sm hidden sm:block">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm ca thi, môn học..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bộ lọc loại thi */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  typeFilter === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Mọi hình thức
              </button>
              <button
                onClick={() => setTypeFilter('ONLINE_QUIZ')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center space-x-1 cursor-pointer ${
                  typeFilter === 'ONLINE_QUIZ' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>⚡ Quiz</span>
              </button>
              <button
                onClick={() => setTypeFilter('LAB_PC')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  typeFilter === 'LAB_PC' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Máy Lab
              </button>
              <button
                onClick={() => setTypeFilter('BYOD_LAPTOP')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  typeFilter === 'BYOD_LAPTOP' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                BYOD
              </button>
            </div>

            {/* Bộ lọc trạng thái */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'IN_PROGRESS', label: 'Đang thi' },
                { id: 'SCHEDULED', label: 'Lên lịch' },
                { id: 'COMPLETED', label: 'Đã xong' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                    statusFilter === st.id ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* THÂN CHÍNH: HIỂN THỊ RESOURCE TIMELINE GANTT HOẶC CARDS */}
        {viewMode === 'TIMELINE' ? (
          <ResourceTimelineView
            sessions={filtered}
            rooms={rooms}
            onOpenCreateModal={(roomId, defaultTime) => {
              setCreatePresetRoomId(roomId);
              setCreatePresetStartTime(defaultTime);
              setIsCreateModalOpen(true);
            }}
            onOpenCandidateManager={s => setSelectedSessionForCandidates(s)}
            onEndSession={s => handleEndSession(s)}
          />
        ) : (
          <div className="space-y-6">

        {/* Danh sách ca thi Cards */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 mx-auto mb-2 text-cyan-500 animate-spin" />
            <p className="text-xs">Đang tải danh sách ca thi...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-400" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-300">Không có ca thi nào phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1">Vui lòng thay đổi từ khóa hoặc bộ lọc tìm kiếm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(s => {
              const statusInfo = getSessionStatus(s);
              return (
                <div
                  key={s._id}
                  className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/80 dark:hover:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-xl dark:shadow-none flex flex-col justify-between transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-cyan-700 dark:text-cyan-400 px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20">
                          {s.code}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.examType === 'ONLINE_QUIZ'
                            ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'
                            : s.examType === 'BYOD_LAPTOP'
                            ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30'
                            : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                        }`}>
                          {s.examType === 'ONLINE_QUIZ' ? '⚡ QUIZ' : s.examType === 'BYOD_LAPTOP' ? '💻 BYOD' : '🖥️ LAB'}
                        </span>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-cyan-300 transition-colors line-clamp-1">
                      {s.title}
                    </h3>

                    {/* Dải thông tin Lịch làm bài thi chi tiết */}
                    <div className="flex items-center space-x-2 text-xs font-mono text-cyan-800 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/40 px-3 py-2 rounded-xl">
                      <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                      <span className="truncate font-semibold">{formatTimeRange(s.startTime, s.endTime)}</span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/80">
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-slate-500">Môn học:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{s.subject?.name || 'Kỹ thuật lập trình'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-slate-500">Phòng thi:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-bold">{s.room?.code} ({s.room?.capacity} bàn)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-slate-500">Thời lượng:</span>
                        <span className="text-slate-800 dark:text-slate-200">{s.durationMinutes} phút</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-slate-500">Thí sinh đã xếp:</span>
                        <span className="text-cyan-700 dark:text-cyan-400 font-bold">{s.studentCount !== undefined ? s.studentCount : '—'} thí sinh</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 dark:text-slate-500">Cán bộ coi thi:</span>
                        <span className="text-slate-800 dark:text-slate-200">{s.proctor1?.fullName || 'ThS. Nguyễn Văn Giảng'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Nút nghiệp vụ & Điều khiển ca thi */}
                  <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-4 text-xs font-semibold">
                    {/* Nút Quản lý Thí sinh & SBD */}
                    <button
                      onClick={() => setSelectedSessionForCandidates(s)}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                      <span>Quản Lý Thí Sinh & Số Báo Danh ({s.studentCount !== undefined ? s.studentCount : '—'})</span>
                    </button>

                    {/* Nút Vào Làm Bài hoặc Thông báo Buồng thi đã đóng */}
                    {statusInfo.isEnded ? (
                      <div className="w-full py-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl flex items-center justify-center space-x-1.5 text-center">
                        <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>Buồng Thi Đã Đóng (Đã Thu Bài)</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate('/take-exam')}
                        className="w-full py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl transition flex items-center justify-center space-x-1.5 shadow-md shadow-cyan-600/20 active:scale-95 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Làm Bài Thi Quiz</span>
                      </button>
                    )}

                    {/* Nút Khởi động / Tham gia Đấu trường Quiz Gamification */}
                    <button
                      onClick={() => {
                        const isStudent = (user as any)?.role?.name === 'student' || (user as any)?.role === 'student';
                        if (isStudent) {
                          navigate(`/quiz-arena/play/${s._id}`);
                        } else {
                          navigate(`/quiz-arena/host/${s._id}`);
                        }
                      }}
                      className="w-full py-2 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20 active:scale-95 cursor-pointer"
                    >
                      <Trophy className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                      <span>
                        {(user as any)?.role?.name === 'student' || (user as any)?.role === 'student' 
                          ? '⚡ Vào Đấu Trường Quiz' 
                          : '🏆 Mở Đấu Trường Quiz Arena'}
                      </span>
                    </button>

                    {/* Nút Kết thúc ca thi & Thu bài (Dành cho Cán bộ coi thi khi ca thi chưa đóng) */}
                    {!statusInfo.isEnded && (
                      <button
                        onClick={() => handleEndSession(s)}
                        disabled={closingSessionId === s._id}
                        className="w-full py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 rounded-xl transition flex items-center justify-center space-x-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {closingSessionId === s._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>Kết Thúc Ca Thi & Đóng Buồng Thi</span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => navigate(`/live-proctor/${s._id}`)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-400 rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Phòng 3D Live</span>
                      </button>

                      <button
                        onClick={() => navigate(`/grading-review/${s._id}`)}
                        className={`p-2 rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer ${
                          statusInfo.isEnded
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-md shadow-indigo-600/30'
                            : 'bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{statusInfo.isEnded ? 'Rà Soát Điểm Ngay' : 'Rà Soát Điểm'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>
      )}
    </div>

      {/* Modal Quản lý Thí sinh & Số Báo Danh (SBD) */}
      {selectedSessionForCandidates && (
        <CandidateManagerModal
          isOpen={!!selectedSessionForCandidates}
          onClose={() => setSelectedSessionForCandidates(null)}
          session={selectedSessionForCandidates}
          onRefreshParent={fetchSessions}
        />
      )}

      {/* Modal Lên Lịch / Thêm Ca Thi Mới (Dành riêng cho Admin) */}
      <CreateSessionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={fetchSessions}
        initialRoomId={createPresetRoomId}
        initialStartTime={createPresetStartTime}
      />

      {/* Modal Tạo Nhanh Phòng Quiz Arena (Dành cho Giảng viên & Admin) */}
      {isCreateQuizModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setIsCreateQuizModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <Zap className="w-6 h-6 fill-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Tạo Nhanh Phòng Quiz Arena
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Giảng viên chủ động tạo phòng tương tác gameshow, tự động sinh mã PIN
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateQuickQuiz} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Tên Phòng Quiz
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đấu trường Quiz 15p - Kỹ thuật Lập trình C"
                  value={quizTitle}
                  onChange={e => setQuizTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Chọn Đề Thi từ Ngân Hàng <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedPaperId}
                  onChange={e => setSelectedPaperId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {availablePapers.length === 0 ? (
                    <option value="">Chưa có đề thi nào trong ngân hàng</option>
                  ) : (
                    availablePapers.map((p: any) => (
                      <option key={p._id} value={p._id}>
                        {p.code} - {p.title} ({p.questions?.length || 0} câu)
                      </option>
                    ))
                  )}
                </select>
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span className="text-slate-400">Muốn tạo đề trắc nghiệm mới cho Quiz?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreateQuizModalOpen(false);
                      navigate('/exam-papers?mode=quiz');
                    }}
                    className="text-amber-500 hover:text-amber-400 font-bold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Mở Studio Soạn Đề Quiz →</span>
                  </button>
                </div>
              </div>

              {/* Tùy Biến Luật Chơi */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tùy Biến Luật Chơi (Custom Rules)</span>
                  </label>
                  <span className="text-[10px] text-amber-500 font-mono font-bold">Thời gian thực</span>
                </div>

                {/* 1. Tính điểm tốc độ vs Chuẩn */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScoringType('SPEED_BONUS')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      scoringType === 'SPEED_BONUS'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400 shadow-sm'
                        : 'border-slate-300 dark:border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Flame className="w-4 h-4 shrink-0 text-amber-500" />
                    <div>
                      <div>⚡ Đua Tốc Độ</div>
                      <div className="text-[10px] font-normal text-slate-400">Trả lời nhanh điểm cao</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScoringType('STANDARD')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      scoringType === 'STANDARD'
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-sm'
                        : 'border-slate-300 dark:border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 shrink-0 text-cyan-400" />
                    <div>
                      <div>🎯 Điểm Cố Định</div>
                      <div className="text-[10px] font-normal text-slate-400">Đúng nhận điểm chuẩn</div>
                    </div>
                  </button>
                </div>

                {/* 2. Chế độ Sinh Tồn (3 Tim) & Bảng Xếp Hạng */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEnableHearts(!enableHearts)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      enableHearts
                        ? 'border-rose-500 bg-rose-500/10 text-rose-400 shadow-sm'
                        : 'border-slate-300 dark:border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Heart className={`w-4 h-4 shrink-0 ${enableHearts ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`} />
                    <div>
                      <div>❤️ Sinh Tồn: {enableHearts ? '3 Tim' : 'Vô Hạn'}</div>
                      <div className="text-[10px] font-normal text-slate-400">{enableHearts ? 'Sai 3 câu là bị loại' : 'Không giới hạn mạng'}</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowLeaderboardLive(!showLeaderboardLive)}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                      showLeaderboardLive
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-sm'
                        : 'border-slate-300 dark:border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <Trophy className="w-4 h-4 shrink-0 text-indigo-400" />
                    <div>
                      <div>🏆 BXH Trực Tiếp</div>
                      <div className="text-[10px] font-normal text-slate-400">{showLeaderboardLive ? 'Hiện Top 10 mỗi câu' : 'Chỉ hiện cuối giờ'}</div>
                    </div>
                  </button>
                </div>

                {/* 3. Cơ chế Bấm giờ & Thời gian */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Thời Lượng / Câu
                    </label>
                    <select
                      value={quizSeconds}
                      onChange={e => setQuizSeconds(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value={10}>10 giây / câu (Siêu tốc)</option>
                      <option value={15}>15 giây / câu (Nhanh)</option>
                      <option value={20}>20 giây / câu (Chuẩn)</option>
                      <option value={30}>30 giây / câu (Vừa)</option>
                      <option value={45}>45 giây / câu (Suy luận)</option>
                      <option value={60}>60 giây / câu (Tính toán)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                      Cơ Chế Bấm Giờ
                    </label>
                    <select
                      value={timerType}
                      onChange={e => setTimerType(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="PER_QUESTION_TIMER">⏱️ Đếm ngược tự động</option>
                      <option value="MANUAL_HOST">🕹️ Host chuyển câu thủ công</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                💡 <strong>Dành riêng cho Giảng viên:</strong> Phòng Quiz là hoạt động tương tác linh hoạt trên lớp, không đòi hỏi đăng ký phòng máy vật lý hay cấp phép từ Ban Khảo thí. Sau khi tạo, bạn sẽ được đưa ngay vào màn hình điều khiển Host Cockpit!
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateQuizModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isCreatingQuiz || availablePapers.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isCreatingQuiz ? 'Đang Khởi Tạo...' : '🚀 Bắt Đầu Đấu Trường Ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

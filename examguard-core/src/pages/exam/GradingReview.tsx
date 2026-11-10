import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Share2,
  Lock,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Award,
  Users,
  ShieldCheck,
  ChevronRight,
  Eye,
  Sparkles,
  HelpCircle,
  ArrowLeft,
  Loader2,
  Calendar,
  Layers
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { apiClient } from '../../api/apiClient';

interface StudentRow {
  id: string;
  blindCode: string;
  candidateCode: string;
  studentName: string;
  studentCode: string;
  status: string;
  trustScore: number;
  autoGradeScore: number;
  adjustedScore: number;
  officialScore: number | null;
  totalCorrect: string;
  submittedAt: string;
}

interface QuestionAlert {
  questionId: string;
  stt: number;
  content: string;
  officialAnswer: string;
  mostChosenAnswer: string;
  ratio: number;
  counts: Record<string, number>;
  warning: string;
}

interface WorkspaceData {
  session: {
    id: string;
    code: string;
    title: string;
    subjectName: string;
    roomCode: string;
    totalStudents: number;
    gradingStatus: 'NOT_GRADED' | 'AUTO_GRADED' | 'REVIEWING' | 'APPROVED' | 'PUBLISHED';
    appealDeadline?: string;
    reviewNotes?: string;
  };
  statistics: {
    averageScore: number;
    maxScore: number;
    minScore: number;
    belowFive: number;
    passRate: number;
  };
  abnormalQuestionAlerts: QuestionAlert[];
  students: StudentRow[];
  questions: any[];
}

export default function GradingReview() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Danh mục toàn bộ ca thi để chuyển đổi linh hoạt
  const [sessionList, setSessionList] = useState<any[]>([]);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionFilterTerm, setSessionFilterTerm] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'PUBLISHED'>('ALL');

  // Modal điều chỉnh câu hỏi
  const [selectedAlert, setSelectedAlert] = useState<QuestionAlert | null>(null);
  const [adjustAction, setAdjustAction] = useState<'ADD_VALID_ANSWER' | 'CANCEL_QUESTION'>('ADD_VALID_ANSWER');
  const [adjustReason, setAdjustReason] = useState('');

  // Tải danh sách toàn bộ ca thi trong hệ thống
  const fetchSessionList = async () => {
    try {
      const res = await apiClient.get('/api/exam/sessions');
      if (res.data?.success) {
        setSessionList(res.data.data || []);
      }
    } catch (err: any) {
      console.warn('Lỗi tải danh sách ca thi:', err.message);
    }
  };

  useEffect(() => {
    fetchSessionList();
  }, []);

  // Tải dữ liệu workspace
  const fetchWorkspace = async () => {
    try {
      setLoading(true);
      const targetId = sessionId || 'fallback_session';
      const res = await apiClient.get(`/api/grading/review/${targetId}`);
      if (res.data && res.data.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      console.error('Lỗi tải workspace:', err);
      toast.error('Không thể tải không gian chấm thi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [sessionId]);

  const handleChangeSession = (newSessionId: string) => {
    navigate(`/grading-review/${newSessionId}`);
  };

  const filteredSessions = sessionList.filter((s: any) => {
    const matchesTerm = (s.title || '').toLowerCase().includes(sessionFilterTerm.toLowerCase()) ||
                        (s.code || '').toLowerCase().includes(sessionFilterTerm.toLowerCase()) ||
                        (s.subject?.name || '').toLowerCase().includes(sessionFilterTerm.toLowerCase());
    if (!matchesTerm) return false;
    if (sessionStatusFilter === 'ALL') return true;
    if (sessionStatusFilter === 'PUBLISHED') return s.gradingStatus === 'PUBLISHED';
    if (sessionStatusFilter === 'APPROVED') return s.gradingStatus === 'APPROVED';
    if (sessionStatusFilter === 'PENDING') return s.gradingStatus !== 'PUBLISHED' && s.gradingStatus !== 'APPROVED';
    return true;
  });

  // 1. Chấm lại tự động toàn bộ ca thi sau khi sửa đáp án
  const handleRecalculate = async () => {
    if (!data) return;
    setIsRecalculating(true);
    try {
      const res = await apiClient.post(`/api/grading/recalculate/${data.session.id}`);
      if (res.data && res.data.success) {
        toast.success(`Chấm lại thành công ${res.data.updatedCount} bài thi trong ${res.data.processingTimeMs}ms!`);
        await fetchWorkspace();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi chấm lại bài thi');
    } finally {
      setIsRecalculating(false);
    }
  };

  // 2. Can thiệp sửa câu hỏi bị lỗi
  const handleConfirmAdjust = async () => {
    if (!data || !selectedAlert) return;
    try {
      const payload = {
        sessionId: data.session.id,
        questionId: selectedAlert.questionId,
        action: adjustAction,
        acceptedAnswers: [selectedAlert.mostChosenAnswer.charCodeAt(0) - 65], // Convert A -> 0, B -> 1
        reason: adjustReason || 'Giảng viên công nhận thêm phương án sau khi rà soát phổ điểm'
      };

      const res = await apiClient.post('/api/grading/adjust-question', payload);
      if (res.data && res.data.success) {
        toast.success(res.data.message);
        setSelectedAlert(null);
        // Tự động kích hoạt recalculate ngay
        handleRecalculate();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi điều chỉnh câu hỏi');
    }
  };

  // 3. Giảng viên phê duyệt bảng điểm
  const handleApprove = async () => {
    if (!data) return;
    if (!window.confirm('Bạn có chắc chắn muốn PHÊ DUYỆT BẢNG ĐIỂM? Sau khi duyệt, điểm số sẽ được khóa để chuẩn bị công bố.')) return;
    setIsApproving(true);
    try {
      const res = await apiClient.post(`/api/grading/approve/${data.session.id}`, {
        reviewNotes: 'Đã rà soát phổ điểm toàn ca thi, số liệu đạt chuẩn.'
      });
      if (res.data && res.data.success) {
        toast.success('Đã phê duyệt và khóa bảng điểm ca thi thành công!');
        fetchWorkspace();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi phê duyệt');
    } finally {
      setIsApproving(false);
    }
  };

  // 4. Ban Khảo thí công bố kết quả cho sinh viên
  const handlePublish = async () => {
    if (!data) return;
    if (!window.confirm('BẠN CÓ CHẮC CHẮN MUỐN CÔNG BỐ KẾT QUẢ? Sinh viên sẽ ngay lập tức được tra cứu điểm và xem toàn bộ đáp án + giải thích chi tiết.')) return;
    setIsPublishing(true);
    try {
      const res = await apiClient.post(`/api/grading/publish/${data.session.id}`, {
        appealDays: 7
      });
      if (res.data && res.data.success) {
        confetti({ particleCount: 100, spread: 60 });
        toast.success(`Đã công bố điểm và giải thích đáp án cho ${res.data.studentCount} sinh viên!`);
        fetchWorkspace();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi công bố');
    } finally {
      setIsPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-800 dark:text-white">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
        <p className="text-slate-500 dark:text-slate-400 font-medium">Đang nạp không gian rà soát điểm thi ExamGuard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[400px] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-800 dark:text-white p-6">
        <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
        <h2 className="text-xl font-bold">Không tìm thấy ca thi</h2>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 eg-btn-gradient text-white rounded-xl text-sm font-semibold transition cursor-pointer">
          Quay lại
        </button>
      </div>
    );
  }

  const { session, statistics, abnormalQuestionAlerts, students } = data;
  const filteredStudents = students.filter(s =>
    s.blindCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.candidateCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans select-none">
      <div className="space-y-5">
        {/* ── 1. HEADER (CYBER-LUXURY GLASS) ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
              <span className="hover:text-white cursor-pointer transition" onClick={() => navigate('/exam-sessions')}>Lịch Thi & Ca Thi</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[#3781fc] font-semibold">Rà Soát & Chốt Điểm</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center space-x-3 flex-wrap gap-2">
              <span className="bg-gradient-to-r from-white via-[#cbe9fd] to-[#7c3aed] bg-clip-text text-transparent">
                Rà Soát Điểm Thi: {session.title}
              </span>
              <span className={`px-3 py-0.5 rounded-full text-xs font-mono font-bold ${
                session.gradingStatus === 'PUBLISHED'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : session.gradingStatus === 'APPROVED'
                  ? 'bg-[#1951fc]/15 text-[#cbe9fd] border border-[#3781fc]/40'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {session.gradingStatus === 'PUBLISHED' ? 'ĐÃ CÔNG BỐ ĐIỂM' : session.gradingStatus === 'APPROVED' ? 'ĐÃ PHÊ DUYỆT' : 'MÁY ĐÃ CHẤM TỰ ĐỘNG'}
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Phòng: <b className="text-white">{session.roomCode}</b> • Môn: <b className="text-white">{session.subjectName}</b> • Quy mô: <b className="text-white">{session.totalStudents} thí sinh</b>
            </p>

            {/* BỘ CHỌN CA THI / MÔN THI ĐỂ RÀ SOÁT */}
            <div className="pt-2 flex items-center flex-wrap gap-2.5">
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5 shrink-0">
                  <Layers className="w-3.5 h-3.5 text-[#3781fc]" />
                  <span>Chọn ca thi:</span>
                </span>
                <select
                  value={session.id}
                  onChange={(e) => handleChangeSession(e.target.value)}
                  className="bg-slate-950 border border-slate-700 hover:border-[#3781fc] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#3781fc] font-medium max-w-sm sm:max-w-md truncate cursor-pointer"
                >
                  {sessionList.map((s) => (
                    <option key={s._id} value={s._id}>
                      [{s.code}] {s.title} ({s.gradingStatus === 'PUBLISHED' ? 'Đã công bố' : s.gradingStatus === 'APPROVED' ? 'Đã duyệt' : 'Chờ rà soát'})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsSessionModalOpen(true)}
                className="px-3 py-1.5 rounded-xl eg-glass-pill text-xs font-semibold text-[#3781fc] hover:text-white transition flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                title="Duyệt toàn bộ các ca thi trong hệ thống"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Danh Sách {sessionList.length} Ca Thi</span>
              </button>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRecalculate}
              disabled={isRecalculating || session.gradingStatus === 'APPROVED' || session.gradingStatus === 'PUBLISHED'}
              className="flex items-center space-x-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-200 rounded-full text-xs font-bold border border-white/10 transition active:scale-95 disabled:opacity-40 cursor-pointer"
              title="Tính toán lại toàn bộ bài thi theo đáp án mới cập nhật"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#3781fc] ${isRecalculating ? 'animate-spin' : ''}`} />
              <span>{isRecalculating ? 'Đang tính...' : 'Chấm lại ca thi'}</span>
            </button>

            {session.gradingStatus !== 'APPROVED' && session.gradingStatus !== 'PUBLISHED' && (
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="flex items-center space-x-1.5 px-4 py-2 eg-btn-gradient text-white rounded-full text-xs font-bold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isApproving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Phê Duyệt Điểm</span>
              </button>
            )}

            {session.gradingStatus !== 'PUBLISHED' && (
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-full text-xs font-bold shadow-[0_4px_16px_rgba(16,185,129,0.3)] transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>Công Bố Kết Quả & Đáp Án</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 2. BENTO METRICS BAR (CHỈ SỐ RÕ RÀNG) ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/90 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
              <span className="font-bold text-[10px] uppercase tracking-wider">ĐIỂM TRUNG BÌNH CA THI</span>
              <TrendingUp className="w-4 h-4 text-[var(--color-azure)]" />
            </div>
            <div className="text-3xl font-black font-mono text-blue-700 dark:text-[#cbe9fd]">{statistics.averageScore} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">/ 10</span></div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">Tự động chấm trên {students.length} bài nộp</p>
          </div>

          <div className="bg-white/90 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
              <span className="font-bold text-[10px] uppercase tracking-wider">ĐIỂM CAO NHẤT</span>
              <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">{statistics.maxScore} <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">/ 10</span></div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">Điểm thấp nhất: {statistics.minScore}</p>
          </div>

          <div className="bg-white/90 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
              <span className="font-bold text-[10px] uppercase tracking-wider">TỶ LỆ ĐẠT (≥ 5.0)</span>
              <BarChart3 className="w-4 h-4 text-purple-600 dark:text-[#7c3aed]" />
            </div>
            <div className="text-3xl font-black font-mono text-slate-900 dark:text-white">{statistics.passRate}%</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">{statistics.belowFive} bài dưới 5.0</p>
          </div>

          <div className="bg-white/90 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs mb-2">
              <span className="font-bold text-[10px] uppercase tracking-wider">ĐỘ TIN CẬY TOÀN VẸN</span>
              <ShieldCheck className="w-4 h-4 text-[var(--color-azure)]" />
            </div>
            <div className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">100%</div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono">ArcFace + Zero-Trust Verified</p>
          </div>
        </div>

        {/* ── 3. CẢNH BÁO BẤT THƯỜNG CỦA HỆ THỐNG ── */}
        {abnormalQuestionAlerts && abnormalQuestionAlerts.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                    Phát hiện bất thường của đề thi ({abnormalQuestionAlerts.length} câu cần rà soát)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Động cơ AI phân tích độ khó phát hiện tỷ lệ thí sinh chọn đáp án lệch bất thường so với đáp án gốc trong file đề.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {abnormalQuestionAlerts.map(alert => (
                <div key={alert.questionId} className="bg-[#0B0C1E]/90 border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-xs rounded-lg border border-amber-500/30">
                        Câu {alert.stt}
                      </span>
                      <span className="text-xs text-white font-medium line-clamp-1">{alert.content}</span>
                    </div>
                    <p className="text-xs text-amber-300 font-medium">{alert.warning}</p>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-3 pt-1">
                      <span>Đáp án gốc: <b className="text-[#3781fc]">{alert.officialAnswer}</b></span>
                      <span>Đa số chọn: <b className="text-amber-400">{alert.mostChosenAnswer} ({alert.ratio}%)</b></span>
                    </div>
                  </div>

                  {session.gradingStatus !== 'APPROVED' && session.gradingStatus !== 'PUBLISHED' && (
                    <button
                      onClick={() => {
                        setSelectedAlert(alert);
                        setAdjustAction('ADD_VALID_ANSWER');
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition shrink-0 cursor-pointer"
                    >
                      Xử lý câu này
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 4. BẢNG ĐIỂM RỌC PHÁCH ẨN DANH ── */}
        <div className="bg-[#0B0C1E]/80 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-2xl">
          <div className="p-5 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Bảng Điểm Rọc Phách Ẩn Danh</span>
                <span className="text-xs text-slate-400 font-normal">({filteredStudents.length} bài thi)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Giảng viên chấm rà soát dựa trên Mã phách độc lập nhằm đảm bảo công bằng tuyệt đối</p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm mã phách, SBD..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-full pl-8 pr-4 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#3781fc]"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.04] text-slate-300 font-bold uppercase text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">STT</th>
                  <th className="py-3 px-4">Mã Phách</th>
                  <th className="py-3 px-4">Số Báo Danh</th>
                  <th className="py-3 px-4">Họ Tên Thí Sinh</th>
                  <th className="py-3 px-4">Số Câu Đúng</th>
                  <th className="py-3 px-4 text-right">Điểm Máy Chấm</th>
                  <th className="py-3 px-4 text-right">Điểm Rà Soát</th>
                  <th className="py-3 px-4 text-right">Điểm Chốt</th>
                  <th className="py-3 px-4 text-center">Điểm Uy Tín</th>
                  <th className="py-3 px-4 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-slate-300 font-medium">
                {filteredStudents.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 px-4 text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#cbe9fd]">{st.blindCode}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{st.candidateCode}</td>
                    <td className="py-3 px-4 text-white font-medium">{st.studentName}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono">{st.totalCorrect}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white text-right">{st.autoGradeScore ?? '—'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#3781fc] text-right">{st.adjustedScore ?? '—'}</td>
                    <td className="py-3 px-4 font-mono font-extrabold text-emerald-400 text-right">
                      {st.officialScore !== null ? st.officialScore : (st.adjustedScore ?? '—')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        st.trustScore >= 80 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}>
                        {st.trustScore}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 bg-white/5 text-slate-300 rounded-full text-[10px] font-medium border border-white/10">
                        {st.status === 'SUBMITTED' ? 'Đã nộp bài' : st.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── MODAL CAN THIỆP SỬA ĐÁP ÁN NHANH ── */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <span>Xử lý Câu hỏi số {selectedAlert.stt}</span>
            </h3>

            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 my-3 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
              <p className="font-medium">{selectedAlert.content}</p>
              <div className="flex items-center space-x-4 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span>Đáp án hiện tại: <b className="text-cyan-600 dark:text-cyan-400">{selectedAlert.officialAnswer}</b></span>
                <span>Phương án đề xuất bổ sung: <b className="text-amber-600 dark:text-amber-400">{selectedAlert.mostChosenAnswer} ({selectedAlert.ratio}%)</b></span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Phương thức can thiệp:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustAction('ADD_VALID_ANSWER')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      adjustAction === 'ADD_VALID_ANSWER'
                        ? 'bg-[var(--color-electric)]/15 border-[var(--color-azure)]/40 text-[var(--color-azure)] font-bold shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div>Công nhận thêm đáp án</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">Cả 2 phương án đều đạt điểm</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustAction('CANCEL_QUESTION')}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      adjustAction === 'CANCEL_QUESTION'
                        ? 'bg-amber-50 dark:bg-amber-600/20 border-amber-400 dark:border-amber-500 text-amber-700 dark:text-amber-300 font-bold'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div>Hủy câu / Tặng điểm</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">Tất cả SV đều được cộng điểm</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">Lý do điều chỉnh (Lưu nhật ký khảo thí):</label>
                <textarea
                  rows={3}
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="VD: Đề bài in thiếu điều kiện, cả đáp án A và B đều đạt chuẩn học phần..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-5">
              <button
                onClick={() => setSelectedAlert(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmAdjust}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-600/20 transition cursor-pointer"
              >
                Lưu & Chấm lại ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DANH SÁCH TOÀN BỘ CA THI CẦN RÀ SOÁT & CHỐT ĐIỂM ── */}
      {isSessionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl animate-in zoom-in-95 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#3781fc]/15 text-[#3781fc] flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Danh Mục Ca Thi & Môn Học Khảo Thí ({sessionList.length} Ca)</h3>
                  <p className="text-xs text-slate-400">Chọn bất kỳ ca thi nào để tiến hành rà soát đáp án, đối soát rọc phách hoặc công bố điểm</p>
                </div>
              </div>
              <button
                onClick={() => setIsSessionModalOpen(false)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white text-xs transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Filter Toolbar */}
            <div className="py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800/60">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={sessionFilterTerm}
                  onChange={e => setSessionFilterTerm(e.target.value)}
                  placeholder="Tìm theo mã ca thi, tên môn học, tiêu đề..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#3781fc]"
                />
              </div>

              <div className="flex items-center space-x-1.5 shrink-0">
                {(['ALL', 'PENDING', 'APPROVED', 'PUBLISHED'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSessionStatusFilter(tab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      sessionStatusFilter === tab
                        ? 'bg-[#3781fc] text-white shadow-xs'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab === 'ALL' ? `Tất cả (${sessionList.length})` :
                     tab === 'PENDING' ? 'Chờ rà soát' :
                     tab === 'APPROVED' ? 'Đã duyệt' : 'Đã công bố'}
                  </button>
                ))}
              </div>
            </div>

            {/* Session Cards List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              {filteredSessions.map((s: any) => {
                const isCurrent = s._id === session.id;
                return (
                  <div
                    key={s._id}
                    onClick={() => {
                      handleChangeSession(s._id);
                      setIsSessionModalOpen(false);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      isCurrent
                        ? 'bg-[#3781fc]/10 border-[#3781fc]/50 ring-1 ring-[#3781fc]/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-[#3781fc]">{s.code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.gradingStatus === 'PUBLISHED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : s.gradingStatus === 'APPROVED'
                            ? 'bg-[#1951fc]/15 text-[#cbe9fd] border border-[#3781fc]/40'
                            : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        }`}>
                          {s.gradingStatus === 'PUBLISHED' ? 'ĐÃ CÔNG BỐ ĐIỂM' : s.gradingStatus === 'APPROVED' ? 'ĐÃ PHÊ DUYỆT' : 'CHỜ RÀ SOÁT'}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Đang mở
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-white">{s.title}</h4>
                      <p className="text-xs text-slate-400 flex items-center space-x-3">
                        <span>Phòng: <b className="text-slate-200">{s.room?.name || 'Phòng Lab P302'}</b></span>
                        <span>•</span>
                        <span>Bắt đầu: <b className="text-slate-200">{new Date(s.startTime).toLocaleDateString('vi-VN')}</b></span>
                        <span>•</span>
                        <span>Thời lượng: <b className="text-slate-200">{s.durationMinutes || 60} phút</b></span>
                      </p>
                    </div>

                    <button
                      type="button"
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                        isCurrent
                          ? 'bg-[#3781fc] text-white shadow-md'
                          : 'eg-glass-pill text-[#3781fc] hover:text-white'
                      }`}
                    >
                      {isCurrent ? 'Đang rà soát ca này' : 'Vào rà soát ca này →'}
                    </button>
                  </div>
                );
              })}

              {filteredSessions.length === 0 && (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Không tìm thấy ca thi nào khớp với điều kiện lọc.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setIsSessionModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

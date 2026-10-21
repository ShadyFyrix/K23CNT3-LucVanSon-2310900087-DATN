import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Trophy,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowLeft,
  Calendar,
  Clock,
  Send,
  Lock,
  Sparkles,
  Lightbulb,
  FileText,
  AlertCircle,
  Check,
  X,
  UserSquare2,
  GraduationCap,
  Award,
  Search,
  ExternalLink,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  BookOpen,
  CheckCheck,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { apiClient } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

interface QuestionFeedback {
  stt: number;
  type: string;
  content: string;
  options: string[];
  studentAnswer: any;
  correctAnswer: any;
  isCorrect: boolean;
  scoreEarned: number;
  maxScore: number;
  explanation: string;
}

interface StudentResultData {
  session: {
    code: string;
    title: string;
    subjectName: string;
    appealDeadline?: string;
  };
  student: {
    name: string;
    candidateCode: string;
    studentCode?: string;
    trustScore: number;
    submittedAt: string;
  };
  scores: {
    officialScore: number;
    autoGradeScore: number;
    trustScore: number;
    totalCorrect: number;
    totalWrong: number;
    totalQuestions: number;
  };
  questions: QuestionFeedback[];
}

interface ExamSessionItem {
  _id: string;
  code: string;
  title: string;
  subject?: { name: string; courseCode?: string };
  examPaper?: { code: string; title: string; totalQuestions?: number; questions?: any[] };
  gradingStatus?: 'DRAFT' | 'APPROVED' | 'PUBLISHED';
  startTime?: string;
  endTime?: string;
  room?: { name: string; code: string };
}

interface LecturerWorkspaceData {
  session: {
    id: string;
    code: string;
    title: string;
    subjectName: string;
    roomName: string;
    gradingStatus: string;
    approvedAt?: string;
    publishedAt?: string;
    examPaper?: any;
  };
  statistics: {
    totalStudents: number;
    avgScore: number;
    maxScore: number;
    minScore: number;
    passRate: number;
    belowFiveCount: number;
    avgTrustScore?: number;
  };
  students: Array<{
    id: string;
    examStudentId: string;
    blindCode: string;
    candidateCode: string;
    studentCode: string;
    studentName: string;
    className?: string;
    autoGradeScore: number;
    adjustedScore: number | null;
    officialScore: number | null;
    trustScore: number;
    status: string;
    submittedAt?: string;
  }>;
}

export default function ExamResult() {
  const { sessionStudentId } = useParams<{ sessionStudentId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Xác định vai trò đăng nhập
  const isStudentRole = useMemo(() => {
    if (!user) return false;
    const roleStr = typeof user.role === 'object' ? user.role?.name : user.role;
    const roleLower = String(roleStr || '').toLowerCase();
    if (roleLower === 'student' || roleLower === 'sinh viên') return true;
    if (Array.isArray(user.roles) && user.roles.some((r: any) => String(typeof r === 'object' ? r.name : r).toLowerCase().includes('student'))) {
      return true;
    }
    return !!(user as any)?.studentCode;
  }, [user]);

  // ViewMode: 'lecturer' (Giảng viên / Ban Khảo thí) hoặc 'student' (Sinh viên)
  const [viewMode, setViewMode] = useState<'lecturer' | 'student'>(() => {
    const qView = searchParams.get('view');
    if (qView === 'student') return 'student';
    if (qView === 'lecturer') return 'lecturer';
    return isStudentRole ? 'student' : 'lecturer';
  });

  // Đồng bộ URL query param khi đổi viewMode
  const handleSwitchView = (mode: 'lecturer' | 'student') => {
    setViewMode(mode);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('view', mode);
      return next;
    });
  };

  // ──────────────────────────────────────────────────────────
  // STATE CHO PHÂN HỆ SINH VIÊN (Student View)
  // ──────────────────────────────────────────────────────────
  const [studentLoading, setStudentLoading] = useState(false);
  const [studentResult, setStudentResult] = useState<StudentResultData | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState('');
  // Khi Giảng viên bấm "Xem bài làm thí sinh", lưu studentId đó để xem trước (preview)
  const [previewStudentInfo, setPreviewStudentInfo] = useState<{ id: string; name: string; code: string } | null>(null);

  // ──────────────────────────────────────────────────────────
  // STATE CHO PHÂN HỆ GIẢNG VIÊN (Lecturer View)
  // ──────────────────────────────────────────────────────────
  const [lecturerLoading, setLecturerLoading] = useState(false);
  const [sessionList, setSessionList] = useState<ExamSessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [workspaceData, setWorkspaceData] = useState<LecturerWorkspaceData | null>(null);
  const [lecturerSubTab, setLecturerSubTab] = useState<'GRADEBOOK' | 'ANSWER_KEY'>('GRADEBOOK');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  // 1. Tải danh sách ca thi cho Giảng viên
  const fetchSessionList = async () => {
    try {
      const res = await apiClient.get('/api/exam/sessions');
      if (res.data && res.data.success) {
        const sessions: ExamSessionItem[] = res.data.data || [];
        setSessionList(sessions);
        if (sessions.length > 0 && !selectedSessionId) {
          const defaultSession = sessions[0]._id;
          setSelectedSessionId(defaultSession);
        }
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách ca thi:', err);
    }
  };

  // 2. Tải bảng điểm & thống kê ca thi cho Giảng viên
  const fetchLecturerWorkspace = async (sessionId?: string) => {
    const targetSessionId = sessionId || selectedSessionId || 'fallback_session';
    try {
      setLecturerLoading(true);
      const res = await apiClient.get(`/api/grading/review/${targetSessionId}`);
      if (res.data && res.data.success) {
        setWorkspaceData(res.data.data);
      }
    } catch (err: any) {
      console.error('Lỗi tải bảng điểm ca thi:', err);
      toast.error('Không thể tải bảng điểm ca thi');
    } finally {
      setLecturerLoading(false);
    }
  };

  // 3. Tải kết quả bài thi cá nhân của Sinh viên
  const fetchStudentResult = async (customStudentId?: string) => {
    try {
      setStudentLoading(true);
      const targetId = customStudentId || previewStudentInfo?.id || sessionStudentId || 'fallback_student';
      const isLecturerView = !!previewStudentInfo || !isStudentRole;
      const res = await apiClient.get(`/api/exam/results/${targetId}?asLecturer=${isLecturerView}`);
      if (res.data) {
        const published = res.data.isPublished === true;
        setIsPublished(published);
        if (res.data.data) {
          setStudentResult(res.data.data);
        } else {
          setStudentResult(res.data as any);
        }
      }
    } catch (err: any) {
      console.error('Lỗi tải kết quả sinh viên:', err);
      toast.error('Không thể tải kết quả thi của thí sinh');
    } finally {
      setStudentLoading(false);
    }
  };

  // Khởi động dữ liệu ban đầu
  useEffect(() => {
    fetchSessionList();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchLecturerWorkspace(selectedSessionId);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    if (viewMode === 'student') {
      fetchStudentResult();
    }
  }, [viewMode, sessionStudentId, previewStudentInfo]);

  // Hành động Giảng viên: Công bố điểm cho Sinh viên
  const handlePublishGrades = async () => {
    if (!workspaceData?.session?.id) return;
    const isCurrentlyPublished = workspaceData.session.gradingStatus === 'PUBLISHED';
    const confirmMsg = isCurrentlyPublished
      ? 'Bạn có chắc chắn muốn TẠM ẨN kết quả để rà soát lại? Sinh viên sẽ tạm thời không xem được đáp án.'
      : 'BẠN CÓ CHẮC CHẮN MUỐN CÔNG BỐ KẾT QUẢ? Toàn bộ thí sinh trong ca thi sẽ ngay lập tức được tra cứu điểm và xem đối chiếu đáp án chi tiết.';

    if (!window.confirm(confirmMsg)) return;

    try {
      setIsPublishing(true);
      const res = await apiClient.post(`/api/grading/publish/${workspaceData.session.id}`, {
        appealDays: 7
      });
      if (res.data && res.data.success) {
        if (!isCurrentlyPublished) {
          confetti({ particleCount: 90, spread: 60 });
          toast.success(`Đã công bố điểm & lời giải đáp án cho ${res.data.studentCount || 'toàn bộ'} thí sinh!`);
        } else {
          toast.success('Đã cập nhật trạng thái niêm phong rà soát');
        }
        await fetchLecturerWorkspace(workspaceData.session.id);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái công bố');
    } finally {
      setIsPublishing(false);
    }
  };

  // Hành động Giảng viên: Bấm xem chi tiết bài làm của 1 thí sinh
  const handleInspectCandidate = (st: any) => {
    const candidateName = st.studentName || st.fullName || st.name || studentResult?.student?.name || 'Thí sinh';
    const candidateCode = st.studentCode || st.candidateCode || 'N/A';
    setPreviewStudentInfo({
      id: st.examStudentId || st.id,
      name: candidateName,
      code: candidateCode
    });
    fetchStudentResult(st.examStudentId || st.id);
    handleSwitchView('student');
    toast(`Đang xem trước bài thi của thí sinh ${candidateName}`, { icon: '🔍' });
  };

  // Hành động Sinh viên: Nộp đơn phúc khảo
  const handleSendAppeal = () => {
    if (!appealReason.trim()) {
      toast.error('Vui lòng nhập lý do phúc khảo chi tiết');
      return;
    }
    toast.success('Đã gửi đơn phúc khảo thành công đến Hội đồng Chấm thi!');
    setShowAppealModal(false);
    setAppealReason('');
  };

  // State và hàm can thiệp sửa kết quả của Giảng viên
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideScoreInput, setOverrideScoreInput] = useState('');
  const [overrideScoreReason, setOverrideScoreReason] = useState('');
  const [isOverridingScore, setIsOverridingScore] = useState(false);

  // Giảng viên sửa kết quả Đúng/Sai của 1 câu hỏi cụ thể
  const handleOverrideQuestion = async (questionId: string | number, isCorrect: boolean) => {
    const targetId = previewStudentInfo?.id || sessionStudentId;
    if (!targetId) return;

    try {
      const res = await apiClient.post('/api/grading/override-student-score', {
        sessionStudentId: targetId,
        questionId,
        isCorrect,
        reason: `Giảng viên can thiệp sửa câu ${questionId} sang ${isCorrect ? 'ĐÚNG' : 'SAI'}`
      });

      if (res.data && res.data.success) {
        toast.success(res.data.message);
        await fetchStudentResult(targetId);
        if (selectedSessionId) {
          fetchLecturerWorkspace(selectedSessionId);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi sửa kết quả câu hỏi');
    }
  };

  // Giảng viên sửa trực tiếp tổng điểm chính thức của thí sinh
  const handleConfirmOverrideTotalScore = async () => {
    const targetId = previewStudentInfo?.id || sessionStudentId;
    if (!targetId) return;

    const num = parseFloat(overrideScoreInput);
    if (isNaN(num) || num < 0 || num > 10) {
      toast.error('Vui lòng nhập điểm số hợp lệ từ 0 đến 10!');
      return;
    }

    try {
      setIsOverridingScore(true);
      const res = await apiClient.post('/api/grading/override-student-score', {
        sessionStudentId: targetId,
        officialScore: num,
        reason: overrideScoreReason || 'Giảng viên duyệt sửa điểm phúc khảo'
      });

      if (res.data && res.data.success) {
        toast.success(res.data.message);
        setShowOverrideModal(false);
        setOverrideScoreInput('');
        setOverrideScoreReason('');
        await fetchStudentResult(targetId);
        if (selectedSessionId) {
          fetchLecturerWorkspace(selectedSessionId);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi điều chỉnh điểm');
    } finally {
      setIsOverridingScore(false);
    }
  };

  // Lọc danh sách sinh viên theo từ khóa tìm kiếm
  const filteredStudents = useMemo(() => {
    if (!workspaceData?.students) return [];
    if (!studentSearchTerm.trim()) return workspaceData.students;
    const term = studentSearchTerm.toLowerCase();
    return workspaceData.students.filter(s =>
      s.studentName?.toLowerCase().includes(term) ||
      s.studentCode?.toLowerCase().includes(term) ||
      s.candidateCode?.toLowerCase().includes(term)
    );
  }, [workspaceData, studentSearchTerm]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans select-none">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── TOP HEADER VÀ DUAL-MODE ROLE SWITCHER ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition border border-slate-800"
              title="Về Trang chủ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h1 className="text-xl font-black text-white tracking-wide">
                  HỆ THỐNG KẾT QUẢ & ĐÁP ÁN EXAMGUARD
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tra cứu bảng điểm ca thi, ma trận đáp án chuẩn và đối chiếu bài làm thí sinh
              </p>
            </div>
          </div>

          {/* DUAL-MODE SWITCHER NỔI BẬT: PHÂN BIỆT GIẢNG VIÊN VÀ SINH VIÊN */}
          <div className="flex items-center bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/90 shadow-xl self-start md:self-auto">
            <button
              onClick={() => handleSwitchView('lecturer')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                viewMode === 'lecturer'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserSquare2 className="w-4 h-4 text-purple-300" />
              <span>Chế độ Giảng viên (Ca thi)</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-400/20 text-purple-200 text-[10px] font-mono font-bold">
                GV
              </span>
            </button>

            <button
              onClick={() => handleSwitchView('student')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                viewMode === 'student'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <GraduationCap className="w-4 h-4 text-cyan-300" />
              <span>Chế độ Sinh viên (Cá nhân)</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-400/20 text-cyan-200 text-[10px] font-mono font-bold">
                SV
              </span>
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* PHÂN HỆ 1: CHẾ ĐỘ GIẢNG VIÊN (LECTURER VIEW)                              */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {viewMode === 'lecturer' && (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            {/* Header điều khiển Ca thi & Thao tác duyệt công bố */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-5 shadow-2xl backdrop-blur space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Bộ chọn Ca thi */}
                <div className="flex-1 max-w-xl">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    <span>CHỌN CA THI ĐỂ XEM BẢNG ĐIỂM & ĐÁP ÁN:</span>
                  </label>
                  <select
                    value={selectedSessionId}
                    onChange={e => setSelectedSessionId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl px-3.5 py-2.5 text-xs text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  >
                    {sessionList.map(s => (
                      <option key={s._id} value={s._id}>
                        [{s.code}] {s.title} — {s.subject?.name || 'Môn thi'} ({s.gradingStatus === 'PUBLISHED' ? '📢 Đã công bố' : '🔒 Đang rà soát'})
                      </option>
                    ))}
                    {sessionList.length === 0 && (
                      <option value="">Đang tải danh sách ca thi...</option>
                    )}
                  </select>
                </div>

                {/* Trạng thái công bố & Các nút hành động Giảng viên */}
                <div className="flex flex-wrap items-center gap-3">
                  {workspaceData && (
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center space-x-1.5 ${
                      workspaceData.session.gradingStatus === 'PUBLISHED'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    }`}>
                      {workspaceData.session.gradingStatus === 'PUBLISHED' ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ĐÃ CÔNG BỐ CHO SINH VIÊN</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>ĐANG NIÊM PHONG RÀ SOÁT</span>
                        </>
                      )}
                    </span>
                  )}

                  {/* Nút Công bố kết quả */}
                  <button
                    onClick={handlePublishGrades}
                    disabled={isPublishing || !workspaceData}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-lg active:scale-95 ${
                      workspaceData?.session?.gradingStatus === 'PUBLISHED'
                        ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {workspaceData?.session?.gradingStatus === 'PUBLISHED'
                        ? '🔒 Khóa / Rà soát lại'
                        : '📢 Công bố kết quả cho SV'}
                    </span>
                  </button>

                  {/* Nút Rà soát chuyên sâu 1 lần */}
                  <button
                    onClick={() => navigate(`/grading-review/${selectedSessionId}`)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 transition flex items-center space-x-1.5"
                    title="Chuyển sang màn hình can thiệp đáp án và chấm lại tự động"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Rà soát & Duyệt điểm 1 lần</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Thống kê Tổng quan Ca thi (Overview Cards) */}
              {workspaceData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Tổng Thí sinh</span>
                    <span className="text-xl font-black text-white font-mono">
                      {workspaceData.statistics?.totalStudents ?? workspaceData.students?.length ?? 0}
                    </span>
                    <span className="text-[10px] text-slate-400 block">thí sinh dự thi</span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Điểm Trung Bình</span>
                    <span className="text-xl font-black text-purple-400 font-mono">
                      {workspaceData.statistics?.avgScore != null
                        ? Number(workspaceData.statistics.avgScore).toFixed(2)
                        : '0.00'}
                    </span>
                    <span className="text-[10px] text-slate-400 block">thang điểm 10</span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Điểm Cao Nhất</span>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {workspaceData.statistics?.maxScore != null
                        ? Number(workspaceData.statistics.maxScore).toFixed(2)
                        : '0.00'}
                    </span>
                    <span className="text-[10px] text-emerald-500/80 block font-semibold">
                      Tỷ lệ đạt {workspaceData.statistics?.passRate != null ? workspaceData.statistics.passRate : 0}%
                    </span>
                  </div>

                  <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold">Uy Tín AI Trung Bình</span>
                    <span className="text-xl font-black text-cyan-400 font-mono">
                      {workspaceData.statistics?.avgTrustScore ?? 98}/100
                    </span>
                    <span className="text-[10px] text-cyan-500/80 block font-semibold">Độ tin cậy cao</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2 Tab Giảng viên: Bảng điểm & Ma trận đáp án */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setLecturerSubTab('GRADEBOOK')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  lecturerSubTab === 'GRADEBOOK'
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>📋 Bảng Điểm & Danh Sách Thí Sinh ({filteredStudents.length})</span>
              </button>

              <button
                onClick={() => setLecturerSubTab('ANSWER_KEY')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
                  lecturerSubTab === 'ANSWER_KEY'
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>🔑 Ma Trận Đáp Án Chuẩn Đề Thi ({workspaceData?.session?.examPaper?.questions?.length || 0} câu)</span>
              </button>
            </div>

            {/* TAB CON 1: BẢNG ĐIỂM THÍ SINH (GRADEBOOK) */}
            {lecturerSubTab === 'GRADEBOOK' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={studentSearchTerm}
                      onChange={e => setStudentSearchTerm(e.target.value)}
                      placeholder="Tìm theo Tên, MSSV hoặc SBD..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <span className="text-xs text-slate-400 self-end sm:self-center">
                    Bấm nút <b>"Xem chi tiết bài làm"</b> để đối chiếu bài thi của từng thí sinh
                  </span>
                </div>

                {lecturerLoading ? (
                  <div className="py-16 text-center text-slate-400">
                    <RotateCcw className="w-8 h-8 animate-spin mx-auto mb-2 text-purple-400" />
                    <p className="text-xs font-medium">Đang tải bảng điểm ca thi...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="py-3 px-4">STT</th>
                          <th className="py-3 px-4">SBD</th>
                          <th className="py-3 px-4">MSSV</th>
                          <th className="py-3 px-4">Họ và Tên Thí Sinh</th>
                          <th className="py-3 px-4 text-center">Điểm Thi</th>
                          <th className="py-3 px-4 text-center">Uy Tín AI</th>
                          <th className="py-3 px-4 text-center">Trạng Thái</th>
                          <th className="py-3 px-4 text-right">Chi Tiết Bài Làm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-sans">
                        {filteredStudents.map((st, idx) => {
                          const rawScore = st.officialScore ?? st.adjustedScore ?? st.autoGradeScore;
                          const hasScore = rawScore !== null && rawScore !== undefined && !isNaN(Number(rawScore));
                          const scoreNum = hasScore ? Number(rawScore) : null;

                          return (
                            <tr key={st.id || idx} className="hover:bg-slate-800/40 transition">
                              <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>
                              <td className="py-3 px-4 font-mono font-bold text-cyan-400">{st.candidateCode}</td>
                              <td className="py-3 px-4 font-mono text-slate-300">{st.studentCode}</td>
                              <td className="py-3 px-4 font-bold text-white">{st.studentName}</td>
                              <td className="py-3 px-4 text-center font-mono font-black text-sm">
                                <span className={scoreNum !== null && scoreNum >= 5.0 ? 'text-emerald-400' : 'text-red-400'}>
                                  {scoreNum !== null ? scoreNum.toFixed(2) : '—'}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                                  st.trustScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {st.trustScore} / 100
                                </span>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                  {st.status === 'SUBMITTED' ? 'Đã nộp bài' : st.status === 'GRADED' ? 'Đã chấm' : st.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => handleInspectCandidate(st)}
                                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-semibold text-[11px] transition flex items-center space-x-1 ml-auto"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Xem bài làm</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {filteredStudents.length === 0 && (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                              Không tìm thấy thí sinh nào phù hợp
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CON 2: MA TRẬN ĐÁP ÁN CHUẨN CỦA ĐỀ THI (ANSWER KEY MATRIX) */}
            {lecturerSubTab === 'ANSWER_KEY' && (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center space-x-2">
                      <BookOpen className="w-5 h-5 text-purple-400" />
                      <span>MA TRẬN ĐÁP ÁN CHÍNH THỨC & LỜI GIẢI ĐỀ THI</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Đề thi: <b>{workspaceData?.session?.examPaper?.title || 'Đề thi trắc nghiệm'}</b> ({workspaceData?.session?.examPaper?.questions?.length || 0} câu hỏi)
                    </p>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {(workspaceData?.session?.examPaper?.questions || []).map((q: any, qIdx: number) => {
                    const stt = q.stt || qIdx + 1;
                    return (
                      <div key={q._id || qIdx} className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-purple-300 uppercase tracking-wider">
                            CÂU {stt} • {q.score || 0.25} ĐIỂM
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                            {q.type || 'MULTIPLE_CHOICE'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 font-medium leading-relaxed whitespace-pre-line">
                          {q.content}
                        </p>

                        {/* Phương án A, B, C, D */}
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                            {q.options.map((opt: string, optIdx: number) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isCorrect = Array.isArray(q.correctAnswer)
                                ? q.correctAnswer.includes(optIdx)
                                : Number(q.correctAnswer) === optIdx;

                              return (
                                <div
                                  key={optIdx}
                                  className={`p-2.5 rounded-xl border text-xs flex items-center space-x-2 ${
                                    isCorrect
                                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300 font-semibold'
                                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                                  }`}
                                >
                                  <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                                    isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {letter}
                                  </span>
                                  <span className="flex-1 truncate">{opt}</span>
                                  {isCorrect && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold flex items-center space-x-1">
                                      <Check className="w-3 h-3" />
                                      <span>ĐÁP ÁN ĐÚNG</span>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Lời giải thích chuẩn */}
                        {q.explanation && (
                          <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3 text-xs text-indigo-300 space-y-1">
                            <span className="font-bold flex items-center space-x-1 text-indigo-400 text-[11px]">
                              <Lightbulb className="w-3.5 h-3.5" />
                              <span>Lời giải thích chuẩn:</span>
                            </span>
                            <p className="text-slate-300 leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(!workspaceData?.session?.examPaper?.questions || workspaceData.session.examPaper.questions.length === 0) && (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      Chưa có câu hỏi trắc nghiệm nào được nạp cho đề thi ca này.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {/* PHÂN HỆ 2: CHẾ ĐỘ SINH VIÊN (STUDENT VIEW)                                */}
        {/* ══════════════════════════════════════════════════════════════════════════ */}
        {viewMode === 'student' && (
          <div className="space-y-6 animate-in fade-in-50 duration-300">
            {/* Banner nếu Giảng viên đang xem trước bài của thí sinh */}
            {previewStudentInfo && (
              <div className="bg-purple-950/40 border border-purple-500/40 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                <div className="flex items-center space-x-3 text-xs">
                  <Eye className="w-5 h-5 text-purple-400" />
                  <div>
                    <span className="text-purple-300 font-bold block">
                      ĐANG XEM TRƯỚC BÀI THI CỦA THÍ SINH: {previewStudentInfo.name && previewStudentInfo.name !== 'undefined' ? previewStudentInfo.name : (studentResult?.student?.name || 'Lục Văn Sơn')}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      Mã SV: {previewStudentInfo.code}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setPreviewStudentInfo(null);
                    handleSwitchView('lecturer');
                  }}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại Bảng Điểm Giảng Viên</span>
                </button>
              </div>
            )}

            {studentLoading ? (
              <div className="py-24 text-center text-slate-400">
                <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-medium">Đang nạp dữ liệu bài thi...</p>
              </div>
            ) : (!isPublished && !previewStudentInfo) ? (
              /* TRƯỜNG HỢP 1: CHƯA CÔNG BỐ ĐIỂM (BẢO MẬT KHẢO THÍ) */
              <div className="max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                </div>

                <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-[11px] font-bold uppercase tracking-wider mb-3">
                  BẢO MẬT KHẢO THÍ • CHỜ CÔNG BỐ KẾT QUẢ
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">Bài Thi Đã Nộp Thành Công!</h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  Hệ thống ExamGuard AI đã ghi nhận bài làm của bạn an toàn trên máy chủ. Theo quy chế khảo thí, <b>điểm số chính thức và đáp án chi tiết chỉ được hiển thị sau khi Giảng viên / Hội đồng Khảo thí phê duyệt và CÔNG BỐ KẾT QUẢ</b>.
                </p>

                {/* Phiếu Biên Nhận Nộp Bài (Official Verified Receipt) */}
                <div className="bg-slate-950 rounded-2xl p-4 text-xs text-left space-y-2.5 mb-6 border border-slate-800">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-800/80 pb-1.5 flex items-center justify-between">
                    <span>Xác nhận Nộp Bài Thi Trực Tuyến</span>
                    <span className="text-emerald-400 font-mono">ExamGuard Verified</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Học phần:</span>
                    <span className="text-slate-200 font-semibold text-right max-w-[240px] truncate">
                      {studentResult?.session?.title || 'Kỹ thuật lập trình'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Mã ca thi:</span>
                    <span className="text-slate-300 font-mono font-medium">
                      {studentResult?.session?.code || 'CA-THI'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Thí sinh:</span>
                    <span className="text-white font-bold">{studentResult?.student?.name || user?.fullName || 'Thí sinh'}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Số báo danh (SBD):</span>
                    <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold rounded">
                      {studentResult?.student?.candidateCode || 'SBD-001'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-800/80 pt-2">
                    <span className="text-slate-400">Điểm uy tín ca thi:</span>
                    <span className="text-emerald-400 font-bold">
                      {studentResult?.student?.trustScore ?? 100} / 100 • Đạt chuẩn
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Trạng thái chấm:</span>
                    <span className="text-amber-400 font-medium">
                      Đã nộp • Chờ Giảng viên duyệt & công bố
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => fetchStudentResult()}
                    className="w-full sm:flex-1 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Kiểm tra Trạng thái Công bố</span>
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full sm:flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                  >
                    Trở về Trang chủ
                  </button>
                </div>
              </div>
            ) : !studentResult || !studentResult.scores ? (
              <div className="py-16 text-center text-slate-400">
                <p>Không có dữ liệu bài thi để hiển thị</p>
                <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg text-xs">
                  Về trang chủ
                </button>
              </div>
            ) : (
              /* TRƯỜNG HỢP 2: ĐÃ CÔNG BỐ ĐIỂM (XEM ĐÁP ÁN ĐỐI CHIẾU & GIẢI THÍCH) */
              <div className="space-y-6">
                {/* Banner Điểm Số Sinh Viên */}
                <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">HỌC KỲ HIỆN TẠI</span>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-1">
                        {studentResult.session.title}
                      </h2>
                      <p className="text-xs text-slate-400 mt-2 flex items-center space-x-4">
                        <span>Thí sinh: <b className="text-slate-200">{studentResult.student.name}</b></span>
                        <span>•</span>
                        <span>SBD: <b className="text-slate-200 font-mono">{studentResult.student.candidateCode}</b></span>
                      </p>
                    </div>

                    {/* Điểm chính thức & Uy tín */}
                    <div className="flex items-center space-x-4">
                      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center min-w-[120px] shadow-lg">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center space-x-1">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          <span>ĐIỂM CHÍNH THỨC</span>
                        </div>
                        <div className="text-3xl font-black font-mono text-emerald-400">
                          {studentResult.scores.officialScore}
                          <span className="text-xs text-slate-500 font-normal"> / 10</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          Đúng {studentResult.scores.totalCorrect}/{studentResult.scores.totalQuestions} câu
                        </span>
                      </div>

                      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center min-w-[120px] shadow-lg">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center space-x-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                          <span>ĐIỂM UY TÍN</span>
                        </div>
                        <div className="text-3xl font-black font-mono text-cyan-400">
                          {studentResult.scores.trustScore}
                          <span className="text-xs text-slate-500 font-normal"> / 100</span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">XUẤT SẮC</span>
                      </div>

                      {previewStudentInfo && (
                        <div className="flex flex-col justify-center">
                          <button
                            onClick={() => {
                              setOverrideScoreInput(String(studentResult.scores.officialScore ?? 0));
                              setShowOverrideModal(true);
                            }}
                            className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-bold shadow-xl shadow-purple-600/30 transition flex items-center space-x-2"
                            title="Giảng viên duyệt phúc khảo điều chỉnh điểm chính thức"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span>Sửa Điểm Thí Sinh</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hạn phúc khảo Notice */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-xs text-slate-300">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span>Hạn chót nộp đơn phúc khảo: <b>{new Date(studentResult.session.appealDeadline || Date.now() + 7 * 86400000).toLocaleDateString('vi-VN')}</b></span>
                  </div>

                  <button
                    onClick={() => setShowAppealModal(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    Gửi yêu cầu phúc khảo
                  </button>
                </div>

                {/* Danh sách từng câu hỏi & Đối chiếu */}
                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center space-x-2 pt-2">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <span>CHI TIẾT BÀI LÀM & ĐỐI CHIẾU ĐÁP ÁN:</span>
                  </h3>

                  {studentResult.questions.map((q, idx) => {
                    const isCorrect = q.isCorrect;
                    const letterStudent = q.studentAnswer !== undefined && q.studentAnswer !== null
                      ? String.fromCharCode(65 + Number(q.studentAnswer))
                      : 'Chưa chọn';

                    let officialDisplay = '';
                    if (Array.isArray(q.correctAnswer)) {
                      officialDisplay = q.correctAnswer.map((n: number) => String.fromCharCode(65 + n)).join(', ');
                    } else if (q.correctAnswer !== null && q.correctAnswer !== undefined) {
                      officialDisplay = String.fromCharCode(65 + Number(q.correctAnswer));
                    } else {
                      officialDisplay = 'Chấm thủ công';
                    }

                    return (
                      <div
                        key={q.stt || idx}
                        className={`bg-slate-900 border rounded-2xl p-5 shadow-lg transition-all ${
                          isCorrect
                            ? 'border-emerald-500/20 bg-slate-900/90'
                            : isCorrect === false
                            ? 'border-red-500/20 bg-slate-900/90'
                            : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="font-bold text-xs text-white">CÂU {q.stt}:</span>
                            {isCorrect ? (
                              <span className="flex items-center space-x-1 text-emerald-400 text-xs font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Đúng (+{q.scoreEarned}đ)</span>
                              </span>
                            ) : isCorrect === false ? (
                              <span className="flex items-center space-x-1 text-red-400 text-xs font-semibold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Sai (0đ / {q.maxScore}đ)</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs bg-slate-800 px-2 py-0.5 rounded">Tự luận / Đang chấm</span>
                            )}
                          </div>

                          <div className="flex items-center space-x-2">
                            {previewStudentInfo && (
                              <div className="flex items-center space-x-1.5 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
                                <span className="text-[10px] text-slate-400 font-medium">GV sửa:</span>
                                <button
                                  type="button"
                                  onClick={() => handleOverrideQuestion(q.stt, true)}
                                  title="Chấm câu này thành ĐÚNG"
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition ${
                                    isCorrect
                                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                                      : 'bg-emerald-950/50 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20'
                                  }`}
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Đúng</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOverrideQuestion(q.stt, false)}
                                  title="Chấm câu này thành SAI"
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 transition ${
                                    isCorrect === false
                                      ? 'bg-red-600/30 text-red-300 border border-red-500/40 cursor-default'
                                      : 'bg-red-950/50 hover:bg-red-600/30 text-red-400 border border-red-500/20'
                                  }`}
                                >
                                  <X className="w-3 h-3" />
                                  <span>Sai</span>
                                </button>
                              </div>
                            )}
                            <span className="text-[11px] text-slate-500 uppercase tracking-wider">{q.type}</span>
                          </div>
                        </div>

                        <p className="text-sm text-slate-200 font-medium leading-relaxed mb-4 whitespace-pre-line">
                          {q.content}
                        </p>

                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 my-3">
                            {q.options.map((opt, optIdx) => {
                              const optLetter = String.fromCharCode(65 + optIdx);
                              const isUserPicked = Number(q.studentAnswer) === optIdx;
                              const isActualCorrect = Array.isArray(q.correctAnswer)
                                ? q.correctAnswer.includes(optIdx)
                                : Number(q.correctAnswer) === optIdx;

                              let badgeClass = 'bg-slate-950/40 border-slate-800/80 text-slate-400';
                              if (isActualCorrect) {
                                badgeClass = 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-medium';
                              } else if (isUserPicked && !isActualCorrect) {
                                badgeClass = 'bg-red-950/40 border-red-500/40 text-red-300';
                              }

                              return (
                                <div key={optIdx} className={`p-2.5 rounded-xl border text-xs flex items-center space-x-2 ${badgeClass}`}>
                                  <span className="font-bold w-5 h-5 rounded flex items-center justify-center bg-slate-800/80 text-[10px]">
                                    {optLetter}
                                  </span>
                                  <span className="flex-1 truncate">{opt}</span>
                                  {isUserPicked && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                      {previewStudentInfo ? 'Thí sinh chọn' : 'Lựa chọn của bạn'}
                                    </span>
                                  )}
                                  {isActualCorrect && (
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="bg-slate-950/80 rounded-xl p-3 text-xs space-y-1.5 border border-slate-800/60 mt-3">
                          <div className="flex justify-between">
                            <span className="text-slate-400">{previewStudentInfo ? 'Lựa chọn của thí sinh:' : 'Lựa chọn của bạn:'}</span>
                            <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                              {letterStudent}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Đáp án chính thức:</span>
                            <span className="font-bold text-cyan-400">{officialDisplay}</span>
                          </div>
                        </div>

                        {q.explanation && (
                          <div className="mt-3 p-3.5 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-xs">
                            <div className="flex items-center space-x-1.5 text-indigo-400 font-bold mb-1">
                              <Lightbulb className="w-4 h-4" />
                              <span>Lời giải thích chi tiết:</span>
                            </div>
                            <p className="text-slate-300 leading-relaxed font-sans">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── MODAL PHÚC KHẢO (APPEAL MODAL) ── */}
        {showAppealModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-base font-bold text-white mb-2">Đơn Yêu Cầu Phúc Khảo</h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Vui lòng nêu rõ số thứ tự câu hỏi và lý do bạn muốn Hội đồng Chấm thi rà soát lại bài làm.
              </p>

              <textarea
                rows={4}
                value={appealReason}
                onChange={e => setAppealReason(e.target.value)}
                placeholder="VD: Em xin phép phúc khảo câu số 14, lý do theo giáo trình trang 112 thì..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />

              <div className="flex items-center space-x-3 mt-4">
                <button
                  onClick={() => setShowAppealModal(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleSendAppeal}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/20 transition"
                >
                  Gửi đơn phúc khảo
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL ĐIỀU CHỈNH ĐIỂM CHÍNH THỨC DÀNH CHO GIẢNG VIÊN ── */}
        {showOverrideModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Điều chỉnh Điểm Thí Sinh</h3>
                    <p className="text-[11px] text-slate-400">Can thiệp điểm tổng kết của Giảng viên</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowOverrideModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 my-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Điểm số chính thức mới (Thang 10):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="10"
                    value={overrideScoreInput}
                    onChange={e => setOverrideScoreInput(e.target.value)}
                    placeholder="VD: 8.5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-cyan-400 font-bold focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Lý do điều chỉnh điểm:
                  </label>
                  <textarea
                    rows={3}
                    value={overrideScoreReason}
                    onChange={e => setOverrideScoreReason(e.target.value)}
                    placeholder="VD: Chấp nhận phúc khảo câu 14 do tài liệu tham khảo đúng; hoặc cộng 0.5 điểm chuyên cần..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  disabled={isOverridingScore}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOverrideTotalScore}
                  disabled={isOverridingScore}
                  className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {isOverridingScore ? 'Đang lưu...' : 'Lưu Điểm Mới'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

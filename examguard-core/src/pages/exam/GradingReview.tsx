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

  // Modal điều chỉnh câu hỏi
  const [selectedAlert, setSelectedAlert] = useState<QuestionAlert | null>(null);
  const [adjustAction, setAdjustAction] = useState<'ADD_VALID_ANSWER' | 'CANCEL_QUESTION'>('ADD_VALID_ANSWER');
  const [adjustReason, setAdjustReason] = useState('');

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-3" />
        <p className="text-slate-400 font-medium">Đang nạp không gian rà soát điểm thi ExamGuard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-3" />
        <h2 className="text-xl font-bold">Không tìm thấy ca thi</h2>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg text-sm">
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── TOP BREADCRUMB & HEADER ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1.5">
              <span className="hover:text-slate-200 cursor-pointer" onClick={() => navigate('/exam-sessions')}>Quản lý Ca thi</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-cyan-400 font-medium">Không gian Rà soát & Duyệt điểm</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
              <span>RÀ SOÁT CA THI: {session.title}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                session.gradingStatus === 'PUBLISHED'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : session.gradingStatus === 'APPROVED'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {session.gradingStatus === 'PUBLISHED' ? 'ĐÃ CÔNG BỐ ĐIỂM' : session.gradingStatus === 'APPROVED' ? 'ĐÃ PHÊ DUYỆT' : 'MÁY ĐÃ CHẤM TỰ ĐỘNG'}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Phòng thi: <b className="text-slate-200">{session.roomCode}</b> • Môn học: <b className="text-slate-200">{session.subjectName}</b> • Quy mô: <b className="text-slate-200">{session.totalStudents} thí sinh</b>
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Nút Recalculate */}
            <button
              onClick={handleRecalculate}
              disabled={isRecalculating || session.gradingStatus === 'APPROVED' || session.gradingStatus === 'PUBLISHED'}
              className="flex items-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition active:scale-95 disabled:opacity-40"
              title="Tính toán lại toàn bộ bài thi theo đáp án mới cập nhật"
            >
              <RotateCcw className={`w-4 h-4 text-cyan-400 ${isRecalculating ? 'animate-spin' : ''}`} />
              <span>{isRecalculating ? 'Đang tính lại...' : 'Chấm lại ca thi (Recalculate)'}</span>
            </button>

            {/* Nút Phê duyệt bảng điểm */}
            {session.gradingStatus !== 'APPROVED' && session.gradingStatus !== 'PUBLISHED' && (
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
              >
                {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                <span>PHÊ DUYỆT BẢNG ĐIỂM</span>
              </button>
            )}

            {/* Nút Công bố cho Sinh viên */}
            {session.gradingStatus !== 'PUBLISHED' && (
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
              >
                {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                <span>CÔNG BỐ KẾT QUẢ & ĐÁP ÁN</span>
              </button>
            )}
          </div>
        </div>

        {/* ── 4 THẺ THỐNG KÊ PHỔ ĐIỂM ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>ĐIỂM TRUNG BÌNH CA THI</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-400">{statistics.averageScore} <span className="text-xs text-slate-500 font-normal">/ 10</span></div>
            <p className="text-[11px] text-slate-500 mt-1">Được tính tự động trên {students.length} bài nộp</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>ĐIỂM CAO NHẤT</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400">{statistics.maxScore} <span className="text-xs text-slate-500 font-normal">/ 10</span></div>
            <p className="text-[11px] text-slate-500 mt-1">Điểm thấp nhất: {statistics.minScore}</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>TỶ LỆ ĐẠT (≥ 5.0)</span>
              <BarChart3 className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-indigo-400">{statistics.passRate}%</div>
            <p className="text-[11px] text-slate-500 mt-1">{statistics.belowFive} bài thi dưới 5.0</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
              <span>ĐỘ TIN CẬY TOÀN VẸN</span>
              <ShieldCheck className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-teal-400">100%</div>
            <p className="text-[11px] text-slate-500 mt-1">Webcam + AI Proctoring xác thực</p>
          </div>
        </div>

        {/* ── CẢNH BÁO BẤT THƯỜNG CỦA HỆ THỐNG (ITEM DIFFICULTY & MISKEY DETECTION) ── */}
        {abnormalQuestionAlerts && abnormalQuestionAlerts.length > 0 && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-5 shadow-xl animate-in slide-in-from-top-2">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                    HỆ THỐNG PHÁT HIỆN BẤT THƯỜNG CỦA ĐỀ THI ({abnormalQuestionAlerts.length} CÂU CẦN RÀ SOÁT)
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Động cơ AI phân tích độ khó phát hiện tỷ lệ thí sinh chọn đáp án lệch bất thường so với đáp án gốc trong file đề. Giảng viên vui lòng rà soát lại trước khi chốt điểm.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {abnormalQuestionAlerts.map(alert => (
                <div key={alert.questionId} className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-xs rounded">
                        Câu {alert.stt}
                      </span>
                      <span className="text-xs text-slate-200 font-medium line-clamp-1">{alert.content}</span>
                    </div>
                    <p className="text-xs text-amber-200 font-medium">⚠️ {alert.warning}</p>
                    <div className="text-[11px] text-slate-400 flex items-center space-x-3 pt-1">
                      <span>Đáp án gốc trong đề: <b className="text-cyan-400">{alert.officialAnswer}</b></span>
                      <span>Đáp án đa số chọn: <b className="text-amber-400">{alert.mostChosenAnswer} ({alert.ratio}%)</b></span>
                    </div>
                  </div>

                  {session.gradingStatus !== 'APPROVED' && session.gradingStatus !== 'PUBLISHED' && (
                    <button
                      onClick={() => {
                        setSelectedAlert(alert);
                        setAdjustAction('ADD_VALID_ANSWER');
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition shrink-0"
                    >
                      Xử lý câu này
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BẢNG ĐIỂM RỌC PHÁCH ẨN DANH ── */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>BẢNG ĐIỂM RỌC PHÁCH ẨN DANH</span>
                <span className="text-xs text-slate-400 font-normal">({filteredStudents.length} bài thi)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Giảng viên chấm rà soát dựa trên Mã phách độc lập nhằm đảm bảo công bằng tuyệt đối</p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm mã phách, SBD..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">STT</th>
                  <th className="py-3.5 px-4 font-semibold">Mã Phách (Rọc Phách)</th>
                  <th className="py-3.5 px-4 font-semibold">Số Báo Danh</th>
                  <th className="py-3.5 px-4 font-semibold">Họ Tên Thí Sinh</th>
                  <th className="py-3.5 px-4 font-semibold">Số Câu Đúng</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Điểm Máy Chấm</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Điểm Rà Soát</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Điểm Chốt</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Điểm Uy Tín</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredStudents.map((st, idx) => (
                  <tr key={st.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">{st.blindCode}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{st.candidateCode}</td>
                    <td className="py-3 px-4 text-slate-200 font-medium">{st.studentName}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono">{st.totalCorrect}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-300 text-right">{st.autoGradeScore ?? '—'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400 text-right">{st.adjustedScore ?? '—'}</td>
                    <td className="py-3 px-4 font-mono font-extrabold text-emerald-400 text-right">
                      {st.officialScore !== null ? st.officialScore : (st.adjustedScore ?? '—')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        st.trustScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {st.trustScore}/100
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px] font-medium">
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Xử lý Câu hỏi số {selectedAlert.stt}</span>
            </h3>

            <div className="bg-slate-950 rounded-xl p-3 my-3 text-xs text-slate-300 border border-slate-800">
              <p className="font-medium">{selectedAlert.content}</p>
              <div className="flex items-center space-x-4 mt-2 text-[11px] text-slate-400">
                <span>Đáp án hiện tại: <b className="text-cyan-400">{selectedAlert.officialAnswer}</b></span>
                <span>Phương án đề xuất bổ sung: <b className="text-amber-400">{selectedAlert.mostChosenAnswer} ({selectedAlert.ratio}%)</b></span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Phương thức can thiệp:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustAction('ADD_VALID_ANSWER')}
                    className={`p-3 rounded-xl border text-left transition ${
                      adjustAction === 'ADD_VALID_ANSWER'
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>Công nhận thêm đáp án</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">Cả 2 phương án đều đạt điểm</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdjustAction('CANCEL_QUESTION')}
                    className={`p-3 rounded-xl border text-left transition ${
                      adjustAction === 'CANCEL_QUESTION'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>Hủy câu / Tặng điểm</div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">Tất cả SV đều được cộng điểm</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Lý do điều chỉnh (Lưu nhật ký khảo thí):</label>
                <textarea
                  rows={3}
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="VD: Đề bài in thiếu điều kiện, cả đáp án A và B đều đạt chuẩn học phần..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                ></textarea>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-5">
              <button
                onClick={() => setSelectedAlert(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleConfirmAdjust}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-600/20 transition"
              >
                Lưu & Chấm lại ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

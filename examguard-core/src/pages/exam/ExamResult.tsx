import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../api/apiClient';

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

interface ResultData {
  session: {
    code: string;
    title: string;
    subjectName: string;
    appealDeadline?: string;
  };
  student: {
    name: string;
    candidateCode: string;
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

export default function ExamResult() {
  const { sessionStudentId } = useParams<{ sessionStudentId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResultData | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealReason, setAppealReason] = useState('');

  useEffect(() => {
    async function fetchResult() {
      try {
        setLoading(true);
        const targetId = sessionStudentId || 'fallback_student';
        const res = await apiClient.get(`/api/exam/results/${targetId}`);
        if (res.data) {
          setIsPublished(res.data.isPublished !== false);
          if (res.data.isPublished !== false && res.data.data) {
            setResult(res.data.data);
          } else {
            setResult(res.data as any);
          }
        }
      } catch (err: any) {
        console.error('Lỗi tải kết quả:', err);
        toast.error('Không thể tải kết quả thi');
      } finally {
        setLoading(false);
      }
    }
    fetchResult();
  }, [sessionStudentId]);

  const handleSendAppeal = () => {
    if (!appealReason.trim()) {
      toast.error('Vui lòng nhập lý do phúc khảo chi tiết');
      return;
    }
    toast.success('Đã gửi yêu cầu phúc khảo thành công đến Hội đồng Khảo thí!');
    setShowAppealModal(false);
    setAppealReason('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
        <p className="text-slate-400 font-medium">Đang đối chiếu kết quả bài thi...</p>
      </div>
    );
  }

  // TRƯỜNG HỢP CHƯA CÔNG BỐ ĐIỂM
  if (!isPublished) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-2xl animate-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">Bài thi Đang Được Rà Soát</h2>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            Hệ thống ExamGuard AI đã hoàn tất chấm tự động và đang trong giai đoạn rà soát bảo mật bởi Giảng viên & Ban Khảo thí.
          </p>

          <div className="bg-slate-950 rounded-xl p-4 text-xs text-left space-y-2 mb-6 border border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-500">Môn thi:</span>
              <span className="text-slate-300 font-medium">{result?.session?.title || 'Kỹ thuật lập trình C'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thí sinh:</span>
              <span className="text-cyan-400 font-bold">{result?.student?.name || 'Thí sinh'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Điểm uy tín:</span>
              <span className="text-emerald-400 font-bold">{result?.student?.trustScore || 100} / 100</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
          >
            Trở về Trang chủ
          </button>
        </div>
      </div>
    );
  }

  if (!result || !result.scores) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <p className="text-slate-400">Không có dữ liệu bài thi để hiển thị</p>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-indigo-600 rounded-lg text-xs">
          Về trang chủ
        </button>
      </div>
    );
  }

  const { session, student, scores, questions } = result;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Trở về Trang chủ</span>
          </button>

          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold">
            KẾT QUẢ ĐÃ ĐƯỢC PHÊ DUYỆT CHÍNH THỨC
          </span>
        </div>

        {/* ── BANNER KẾT QUẢ TỔNG QUAN ── */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">HỌC KỲ 1 • 2026-2027</span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1">{session.title}</h1>
              <p className="text-xs text-slate-400 mt-2 flex items-center space-x-4">
                <span>Thí sinh: <b className="text-slate-200">{student.name}</b></span>
                <span>•</span>
                <span>SBD: <b className="text-slate-200 font-mono">{student.candidateCode}</b></span>
              </p>
            </div>

            {/* Score Badges */}
            <div className="flex items-center space-x-4">
              {/* Điểm số */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center min-w-[120px] shadow-lg">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center space-x-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>ĐIỂM CHÍNH THỨC</span>
                </div>
                <div className="text-3xl font-black font-mono text-emerald-400">
                  {scores.officialScore}
                  <span className="text-xs text-slate-500 font-normal"> / 10</span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">Đúng {scores.totalCorrect}/{scores.totalQuestions} câu</span>
              </div>

              {/* Điểm uy tín */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center min-w-[120px] shadow-lg">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>ĐIỂM UY TÍN</span>
                </div>
                <div className="text-3xl font-black font-mono text-cyan-400">
                  {scores.trustScore}
                  <span className="text-xs text-slate-500 font-normal"> / 100</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold mt-1 block">XUẤT SẮC</span>
              </div>
            </div>
          </div>
        </div>

        {/* Hạn phúc khảo Notice */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 text-xs text-slate-300">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Hạn chót nộp đơn phúc khảo: <b>{new Date(session.appealDeadline || Date.now() + 7 * 86400000).toLocaleDateString('vi-VN')}</b></span>
          </div>

          <button
            onClick={() => setShowAppealModal(true)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Gửi yêu cầu phúc khảo
          </button>
        </div>

        {/* ── DANH SÁCH TỪNG CÂU HỎI KÈM ĐÁP ÁN ĐỐI CHIẾU & LỜI GIẢI THÍCH ── */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center space-x-2 pt-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span>CHI TIẾT BÀI LÀM & ĐỐI CHIẾU ĐÁP ÁN:</span>
          </h2>

          {questions.map((q, idx) => {
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
                {/* Header câu */}
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

                  <span className="text-[11px] text-slate-500 uppercase tracking-wider">{q.type}</span>
                </div>

                {/* Nội dung câu hỏi */}
                <p className="text-sm text-slate-200 font-medium leading-relaxed mb-4 whitespace-pre-line">
                  {q.content}
                </p>

                {/* Phương án lựa chọn (nếu là MCQ) */}
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
                              Lựa chọn của bạn
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

                {/* Box đối chiếu tóm tắt */}
                <div className="bg-slate-950/80 rounded-xl p-3 text-xs space-y-1.5 border border-slate-800/60 mt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Lựa chọn của bạn:</span>
                    <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                      {letterStudent}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Đáp án chính thức:</span>
                    <span className="font-bold text-cyan-400">{officialDisplay}</span>
                  </div>
                </div>

                {/* Box Lời giải thích chi tiết (Explanation) */}
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

      {/* ── MODAL PHÚC KHẢO ── */}
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
            ></textarea>

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
    </div>
  );
}

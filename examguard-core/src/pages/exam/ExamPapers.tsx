import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  BookOpen,
  Clock,
  Sparkles,
  Award,
  Trash2,
  CheckCircle,
  Eye,
  Lightbulb,
  X,
  Loader2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../api/apiClient';

interface ExamPaperItem {
  _id: string;
  code: string;
  title: string;
  subjectName?: string;
  durationMinutes: number;
  totalScore: number;
  questions: any[];
  status: string;
  createdAt: string;
}

export default function ExamPapers() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<ExamPaperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<ExamPaperItem | null>(null);

  // Form State tạo đề
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDuration, setNewDuration] = useState(60);
  const [newQuestions, setNewQuestions] = useState([
    {
      stt: 1,
      type: 'MULTIPLE_CHOICE',
      content: 'Trong ngôn ngữ C, hàm nào dùng để xuất dữ liệu ra màn hình chuẩn?',
      score: 0.5,
      options: ['scanf()', 'printf()', 'cin', 'echo'],
      correctAnswer: 1,
      explanation: 'Hàm printf() trong thư viện chuẩn <stdio.h> dùng để in chuỗi và biến theo định dạng format specifier.'
    }
  ]);

  const fetchPapers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/exam/papers');
      if (res.data && res.data.success) {
        setPapers(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const handleAddQuestion = () => {
    setNewQuestions(prev => [
      ...prev,
      {
        stt: prev.length + 1,
        type: 'MULTIPLE_CHOICE',
        content: `Nội dung câu hỏi số ${prev.length + 1}...`,
        score: 0.5,
        options: ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'],
        correctAnswer: 0,
        explanation: 'Giải thích chi tiết lý do đáp án A là chính xác...'
      }
    ]);
  };

  const handleCreatePaper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCode.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và mã đề thi!');
      return;
    }

    try {
      const res = await apiClient.post('/api/exam/papers', {
        code: newCode.trim().toUpperCase(),
        title: newTitle.trim(),
        subject: papers[0]?.subjectName || '660000000000000000000001', // id mock nếu cần
        durationMinutes: newDuration,
        totalScore: 10.0,
        questions: newQuestions
      });

      if (res.data && res.data.success) {
        toast.success('Tạo đề thi mới thành công!');
        setShowCreateModal(false);
        fetchPapers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tạo đề thi');
    }
  };

  const filtered = papers.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
              <span className="text-cyan-400 font-semibold">ExamGuard AI</span>
              <span>•</span>
              <span>Ngân Hàng Câu Hỏi & Đề Thi</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
              <span>NGÂN HÀNG ĐỀ THI TRẮC NGHIỆM & TỰ LUẬN</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {papers.length} ĐỀ
              </span>
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setNewCode(`DE-EXAM-${Date.now().toString().slice(-4)}`);
                setShowCreateModal(true);
              }}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>SOẠN ĐỀ THI MỚI</span>
            </button>
          </div>
        </div>

        {/* Toolbar Search */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm mã đề, tiêu đề đề thi..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Danh sách đề thi */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 mx-auto mb-2 text-cyan-400 animate-spin" />
            <p className="text-xs">Đang nạp ngân hàng đề thi...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(paper => (
              <div
                key={paper._id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                      {paper.code}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                      ĐÃ PHÊ DUYỆT
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">
                    {paper.title}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Môn học:</span>
                      <span className="text-slate-200 font-medium">{paper.subjectName || 'Kỹ thuật lập trình'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Số lượng câu:</span>
                      <span className="text-cyan-400 font-bold">{paper.questions?.length || 0} câu hỏi</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Thời gian làm bài:</span>
                      <span className="text-slate-200">{paper.durationMinutes} phút</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Thang điểm:</span>
                      <span className="text-slate-200 font-mono font-bold">{paper.totalScore} điểm</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 mt-4">
                  <button
                    onClick={() => setSelectedPaper(paper)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Xem câu hỏi & đáp án kèm lời giải</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MODAL XEM CHI TIẾT ĐỀ THI ── */}
      {selectedPaper && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs text-cyan-400 font-mono font-bold">{selectedPaper.code}</span>
                <h3 className="text-lg font-bold text-white">{selectedPaper.title}</h3>
              </div>
              <button onClick={() => setSelectedPaper(null)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-4 pr-1">
              {selectedPaper.questions.map((q: any, i: number) => (
                <div key={i} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-slate-300">
                    <span>CÂU {q.stt || i + 1} ({q.score}đ) • {q.type}</span>
                    <span className="text-emerald-400">
                      Đáp án đúng: {Array.isArray(q.correctAnswer) ? q.correctAnswer.map((n: number) => String.fromCharCode(65 + n)).join(', ') : String.fromCharCode(65 + Number(q.correctAnswer))}
                    </span>
                  </div>

                  <p className="text-slate-100 font-medium text-sm leading-relaxed">{q.content}</p>

                  {q.options && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt: string, optI: number) => {
                        const letter = String.fromCharCode(65 + optI);
                        const isCorrect = Array.isArray(q.correctAnswer) ? q.correctAnswer.includes(optI) : Number(q.correctAnswer) === optI;
                        return (
                          <div key={optI} className={`p-2 rounded-lg border flex items-center space-x-2 ${
                            isCorrect ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-bold' : 'bg-slate-900/60 border-slate-800 text-slate-400'
                          }`}>
                            <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px]">{letter}</span>
                            <span className="truncate">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {q.explanation && (
                    <div className="mt-2 p-2.5 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-slate-300 flex items-start space-x-2">
                      <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-cyan-400 mr-1">Lời giải thích:</span>
                        <span>{q.explanation}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button onClick={() => setSelectedPaper(null)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SOẠN ĐỀ THI MỚI ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreatePaper} className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>Soạn Đề Thi Mới (Exam Paper Builder)</span>
              </h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-4 pr-1 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Mã đề thi:</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Thời gian làm bài (phút):</label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={e => setNewDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Tiêu đề đề thi:</label>
                <input
                  type="text"
                  placeholder="VD: Kiểm tra Kết thúc Học phần Kỹ thuật Lập trình..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200"
                />
              </div>

              {/* Danh sách câu hỏi */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-300">Danh sách câu hỏi trắc nghiệm ({newQuestions.length} câu):</span>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="flex items-center space-x-1 px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg text-xs font-semibold hover:bg-cyan-500/20 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm câu hỏi</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {newQuestions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
                      <div className="flex justify-between font-bold text-cyan-400">
                        <span>CÂU {q.stt} (0.5 điểm)</span>
                        <span>Đáp án đúng: Phương án B</span>
                      </div>
                      <input
                        type="text"
                        value={q.content}
                        onChange={e => {
                          const updated = [...newQuestions];
                          updated[qIndex].content = e.target.value;
                          setNewQuestions(updated);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                      />
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Lời giải thích chi tiết cho sinh viên sau thi:</label>
                        <input
                          type="text"
                          value={q.explanation}
                          onChange={e => {
                            const updated = [...newQuestions];
                            updated[qIndex].explanation = e.target.value;
                            setNewQuestions(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-300"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition">
                Hủy bỏ
              </button>
              <button type="submit" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition">
                Lưu Đề Thi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

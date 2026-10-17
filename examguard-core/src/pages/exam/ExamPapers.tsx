import React, { useState, useEffect, useRef } from 'react';
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
  Loader2,
  Upload,
  Paperclip,
  Check,
  FileCheck,
  HelpCircle,
  FileSpreadsheet,
  Download,
  Layers,
  ArrowRight
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
  paperType?: 'STRUCTURED_QUIZ' | 'FILE_ATTACHED';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  totalQuestions?: number;
  submissionMode?: string;
}

export default function ExamPapers() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<ExamPaperItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<ExamPaperItem | null>(null);

  // Form State tạo đề
  const [createMode, setCreateMode] = useState<'STRUCTURED' | 'FILE_ATTACHED'>('STRUCTURED');
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDuration, setNewDuration] = useState(60);
  const [newTotalScore, setNewTotalScore] = useState(10.0);

  // Mode 1: Nhập câu hỏi chi tiết
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

  // Mode 2: Đề thi dạng File đính kèm + Phiếu OMR
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [fileTotalQuestions, setFileTotalQuestions] = useState<number>(40);
  const [fileAnswerKey, setFileAnswerKey] = useState<number[]>(Array(40).fill(0)); // 0=A, 1=B, 2=C, 3=D
  const [rawAnswerKeyInput, setRawAnswerKeyInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Thay đổi số lượng câu hỏi của đề thi dạng File
  const handleTotalQuestionsChange = (count: number) => {
    const validCount = Math.max(1, Math.min(200, count));
    setFileTotalQuestions(validCount);
    setFileAnswerKey(prev => {
      const updated = Array(validCount).fill(0);
      for (let i = 0; i < Math.min(prev.length, validCount); i++) {
        updated[i] = prev[i];
      }
      return updated;
    });
  };

  // Upload file đề thi lên Server
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      const res = await apiClient.post('/api/exam/upload-paper-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.success) {
        setFileUrl(res.data.data.fileUrl);
        setFileName(res.data.data.fileName);
        setFileSize(res.data.data.fileSize);
        toast.success(`Đã tải lên file đề thi: ${res.data.data.fileName}`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tải file lên máy chủ');
    } finally {
      setIsUploading(false);
    }
  };

  // Áp dụng chuỗi đáp án nhanh dạng "1A 2B 3C..."
  const handleApplyQuickKeyString = () => {
    if (!rawAnswerKeyInput.trim()) return;
    const tokens = rawAnswerKeyInput.toUpperCase().match(/(\d+)\s*[:=-]?\s*([A-D])/g);
    if (!tokens) {
      toast.error('Định dạng không hợp lệ. Ví dụ mẫu: 1A 2B 3C 4D...');
      return;
    }
    const updated = [...fileAnswerKey];
    tokens.forEach(tok => {
      const match = tok.match(/(\d+)\s*[:=-]?\s*([A-D])/);
      if (match) {
        const qIndex = parseInt(match[1]) - 1;
        const optLetter = match[2];
        const optIndex = optLetter.charCodeAt(0) - 65;
        if (qIndex >= 0 && qIndex < updated.length) {
          updated[qIndex] = optIndex;
        }
      }
    });
    setFileAnswerKey(updated);
    toast.success(`Đã cập nhật đáp án cho ${tokens.length} câu hỏi!`);
  };

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

    if (createMode === 'FILE_ATTACHED' && !fileUrl) {
      toast.error('Vui lòng tải lên file đề thi (PDF / DOCX / Ảnh) trước khi lưu!');
      return;
    }

    try {
      const payload: any = {
        code: newCode.trim().toUpperCase(),
        title: newTitle.trim(),
        subject: papers[0]?.subjectName || '660000000000000000000001',
        durationMinutes: newDuration,
        totalScore: Number(newTotalScore) || 10.0,
        paperType: createMode,
      };

      if (createMode === 'FILE_ATTACHED') {
        payload.fileUrl = fileUrl;
        payload.fileName = fileName;
        payload.fileSize = fileSize;
        payload.totalQuestions = fileTotalQuestions;
        payload.answerKey = fileAnswerKey;
        payload.submissionMode = 'OMR_BUBBLE_SHEET';
        payload.questions = []; // Server sẽ tự sinh các câu hỏi OMR
      } else {
        payload.questions = newQuestions;
      }

      const res = await apiClient.post('/api/exam/papers', payload);

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
                setNewTitle('');
                setCreateMode('STRUCTURED');
                setFileUrl('');
                setFileName('');
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
            {filtered.map(paper => {
              const isFileAttached = paper.paperType === 'FILE_ATTACHED' || !!paper.fileUrl;
              return (
                <div
                  key={paper._id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                          {paper.code}
                        </span>
                        {isFileAttached ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 font-bold">
                            📄 FILE ĐỀ THI
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-bold">
                            ⚡ QUIZ SỐ
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                        ĐÃ DUYỆT
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
                        <span className="text-slate-500">Quy mô câu hỏi:</span>
                        <span className="text-cyan-400 font-bold">
                          {paper.totalQuestions || paper.questions?.length || 0} câu hỏi
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Thời gian làm bài:</span>
                        <span className="text-slate-200">{paper.durationMinutes} phút</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Hình thức thi:</span>
                        <span className="text-slate-200 font-medium">
                          {isFileAttached ? 'File đề + Phiếu tô OMR' : 'Interactive Quiz'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80 mt-4 space-y-2">
                    {paper.fileUrl && (
                      <a
                        href={paper.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Xem File Đề Thi Gốc ({paper.fileName || 'PDF'})</span>
                      </a>
                    )}
                    <button
                      onClick={() => setSelectedPaper(paper)}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Xem Cấu Trúc & Đáp Án</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODAL XEM CHI TIẾT ĐỀ THI ── */}
      {selectedPaper && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-bold text-cyan-400 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/20">
                  {selectedPaper.code}
                </span>
                <h3 className="text-base font-bold text-white truncate max-w-md">{selectedPaper.title}</h3>
              </div>
              <button onClick={() => setSelectedPaper(null)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-4 pr-1">
              {selectedPaper.fileUrl && (
                <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-indigo-400" />
                    <div>
                      <p className="text-xs font-bold text-white">File đề thi đính kèm:</p>
                      <p className="text-[11px] text-slate-400">{selectedPaper.fileName || selectedPaper.fileUrl}</p>
                    </div>
                  </div>
                  <a
                    href={selectedPaper.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Mở / Tải File</span>
                  </a>
                </div>
              )}

              {selectedPaper.questions?.map((q, idx) => (
                <div key={q._id || idx} className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-cyan-400">Câu {q.stt || (idx + 1)} ({q.score} điểm)</span>
                    <span className="text-emerald-400">
                      Đáp án đúng:{' '}
                      {Array.isArray(q.correctAnswer)
                        ? q.correctAnswer.map((n: number) => String.fromCharCode(65 + n)).join(', ')
                        : String.fromCharCode(65 + Number(q.correctAnswer))}
                    </span>
                  </div>

                  <p className="text-slate-100 font-medium text-sm leading-relaxed">{q.content}</p>

                  {q.options && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt: string, optI: number) => {
                        const letter = String.fromCharCode(65 + optI);
                        const isCorrect = Array.isArray(q.correctAnswer)
                          ? q.correctAnswer.includes(optI)
                          : Number(q.correctAnswer) === optI;
                        return (
                          <div
                            key={optI}
                            className={`p-2 rounded-lg border flex items-center space-x-2 ${
                              isCorrect
                                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-bold'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center font-bold text-[10px]">
                              {letter}
                            </span>
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
              <button
                onClick={() => setSelectedPaper(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SOẠN ĐỀ THI MỚI (CHO PHÉP CHỌN CẢ 2 CHẾ ĐỘ) ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePaper}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col p-6 shadow-2xl animate-in zoom-in-95"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <span>Soạn Đề Thi Mới (Exam Paper Builder)</span>
              </h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB SELECTOR: Nhập chi tiết vs Đính kèm File */}
            <div className="flex items-center space-x-2 p-1.5 bg-slate-950 rounded-2xl border border-slate-800 mt-4 text-xs">
              <button
                type="button"
                onClick={() => setCreateMode('STRUCTURED')}
                className={`flex-1 py-2.5 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${
                  createMode === 'STRUCTURED'
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>1. Nhập Câu Hỏi Chi Tiết (Interactive Quiz)</span>
              </button>

              <button
                type="button"
                onClick={() => setCreateMode('FILE_ATTACHED')}
                className={`flex-1 py-2.5 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${
                  createMode === 'FILE_ATTACHED'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>2. Đính Kèm File Đề Thi (PDF / Word / Ảnh)</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar my-4 space-y-4 pr-1 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Mã đề thi:</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 uppercase font-mono font-bold"
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
                <div>
                  <label className="text-slate-400 block mb-1">Thang điểm tổng:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newTotalScore}
                    onChange={e => setNewTotalScore(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Tiêu đề đề thi:</label>
                <input
                  type="text"
                  placeholder="VD: Kiểm tra Kết thúc Học phần Kỹ thuật Lập trình C..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-medium"
                />
              </div>

              {/* ── NẾU LÀ MODE 2: ĐÍNH KÈM FILE ĐỀ THI ── */}
              {createMode === 'FILE_ATTACHED' && (
                <div className="space-y-4 pt-2">
                  <div className="p-5 bg-gradient-to-tr from-slate-950 to-indigo-950/40 border border-indigo-500/30 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center space-x-2">
                        <Upload className="w-4 h-4 text-cyan-400" />
                        <span>Tải lên File Đề thi chính thức (PDF / Word / Ảnh)</span>
                      </span>
                      {fileUrl && (
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                          ĐÃ TẢI LÊN THÀNH CÔNG
                        </span>
                      )}
                    </div>

                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-indigo-500/40 hover:border-cyan-400/80 bg-slate-900/60 rounded-xl p-6 text-center cursor-pointer transition group"
                    >
                      {isUploading ? (
                        <div className="space-y-2">
                          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                          <p className="text-slate-300">Đang tải file đề thi lên máy chủ...</p>
                        </div>
                      ) : fileUrl ? (
                        <div className="space-y-1">
                          <FileCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                          <p className="font-bold text-white">{fileName}</p>
                          <p className="text-[11px] text-slate-400">
                            {(fileSize / 1024).toFixed(1)} KB • Bấm để chọn file khác thay thế
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Upload className="w-8 h-8 text-indigo-400 group-hover:text-cyan-400 mx-auto transition" />
                          <p className="font-bold text-white">Kéo thả hoặc Nhấp để chọn file đề thi</p>
                          <p className="text-[11px] text-slate-400">Hỗ trợ file PDF, Word (.docx), hoặc Ảnh scan (.png, .jpg)</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cấu hình Số lượng câu hỏi & Bảng Đáp án đúng */}
                  <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-white flex items-center space-x-2">
                          <Award className="w-4 h-4 text-indigo-400" />
                          <span>Ma Trận Đáp Án Đúng (Answer Key để Chấm Tự Động)</span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          Hệ thống sẽ đối soát ma trận này với Phiếu tô trắc nghiệm OMR của sinh viên.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <label className="text-slate-400">Số câu hỏi:</label>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={fileTotalQuestions}
                          onChange={e => handleTotalQuestionsChange(parseInt(e.target.value) || 1)}
                          className="w-16 bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-center text-white font-mono font-bold"
                        />
                      </div>
                    </div>

                    {/* Nhập chuỗi nhanh */}
                    <div className="flex items-center space-x-2 pt-1">
                      <input
                        type="text"
                        placeholder="Nhập chuỗi nhanh VD: 1A 2B 3C 4D..."
                        value={rawAnswerKeyInput}
                        onChange={e => setRawAnswerKeyInput(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white uppercase font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleApplyQuickKeyString}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold transition"
                      >
                        Áp dụng
                      </button>
                    </div>

                    {/* Grid chọn đáp án trực quan A B C D */}
                    <div className="max-h-56 overflow-y-auto custom-scrollbar grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 pt-2 pr-1">
                      {Array.from({ length: fileTotalQuestions }).map((_, qIdx) => {
                        const curAns = fileAnswerKey[qIdx] ?? 0;
                        return (
                          <div key={qIdx} className="bg-slate-900 border border-slate-800/80 rounded-xl p-2 space-y-1">
                            <span className="text-[10px] text-slate-400 font-mono font-bold block text-center">
                              Câu {qIdx + 1}
                            </span>
                            <div className="flex justify-center space-x-1">
                              {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                                <button
                                  key={letter}
                                  type="button"
                                  onClick={() => {
                                    const updated = [...fileAnswerKey];
                                    updated[qIdx] = optIdx;
                                    setFileAnswerKey(updated);
                                  }}
                                  className={`w-6 h-6 rounded text-[11px] font-bold transition ${
                                    curAns === optIdx
                                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                                      : 'bg-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {letter}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── NẾU LÀ MODE 1: NHẬP TỪNG CÂU HỎI CHI TIẾT ── */}
              {createMode === 'STRUCTURED' && (
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
                          <span>CÂU {q.stt} ({q.score} điểm)</span>
                          <span>Đáp án đúng: Phương án {String.fromCharCode(65 + Number(q.correctAnswer))}</span>
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
              )}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition"
              >
                Lưu Đề Thi
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

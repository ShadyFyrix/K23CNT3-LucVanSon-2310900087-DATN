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
  ArrowRight,
  CheckSquare,
  Edit3,
  Sliders,
  AlignLeft,
  FileCode,
  Info,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../api/apiClient';

interface ConfiguredQuestion {
  stt: number;
  type: 'MULTIPLE_CHOICE' | 'ESSAY';
  score: number;
  options: string[];
  selectionMode: 'SINGLE' | 'MULTIPLE' | 'ALTERNATIVE';
  correctAnswers: number[]; // [0] for A, [0, 2] for A and C
  minWords?: number;
  explanation?: string;
}

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
  structureType?: 'PURE_MCQ' | 'HYBRID' | 'PURE_ESSAY';
  mcqCount?: number;
  essayCount?: number;
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

  // Danh sách môn học & môn được chọn
  const [courses, setCourses] = useState<Array<{ _id: string; name: string; courseCode: string }>>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Form State tạo đề
  const [createMode, setCreateMode] = useState<'FILE_ATTACHED' | 'STRUCTURED'>('FILE_ATTACHED');
  const [newTitle, setNewTitle] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDuration, setNewDuration] = useState(60);
  const [newTotalScore, setNewTotalScore] = useState(10.0);

  // Cấu trúc đề thi (100% Trắc nghiệm vs Hỗn hợp vs 100% Tự luận)
  const [structureType, setStructureType] = useState<'PURE_MCQ' | 'HYBRID' | 'PURE_ESSAY'>('PURE_MCQ');
  const [mcqCountInput, setMcqCountInput] = useState<number>(40);
  const [essayCountInput, setEssayCountInput] = useState<number>(0);

  // File upload state & AI Parser info
  const [fileUrl, setFileUrl] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [parsedExamInfo, setParsedExamInfo] = useState<{
    detectedQuestionsCount: number;
    mcqCount: number;
    essayCount: number;
    hasAnswers: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Danh sách các câu hỏi đã cấu hình cho đề thi
  const [configuredQuestions, setConfiguredQuestions] = useState<ConfiguredQuestion[]>([]);
  const [rawQuickKeyInput, setRawQuickKeyInput] = useState<string>('');
  const [previewTab, setPreviewTab] = useState<'MATRIX' | 'CANDIDATE_PREVIEW'>('MATRIX');
  const [filterQuestionType, setFilterQuestionType] = useState<'ALL' | 'MCQ' | 'ESSAY' | 'MULTI_CORRECT'>('ALL');

  // Lấy danh sách đề thi từ server
  const fetchPapers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/exam/papers');
      if (res.data && res.data.success) {
        setPapers(res.data.data);
      }
    } catch (e) {
      console.error(e);
      toast.error('Không thể tải ngân hàng đề thi');
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách môn học từ server
  const fetchCourses = async () => {
    try {
      const res = await apiClient.get('/courses');
      if (res.data) {
        const list = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setCourses(list);
        if (list.length > 0) {
          setSelectedCourseId(prev => prev || list[0]._id);
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchPapers();
    fetchCourses();
  }, []);

  // Tự động khởi tạo cấu trúc câu hỏi khi thay đổi số lượng MCQ hoặc Essay
  const generateQuestionsList = (mcqCount: number, essayCount: number, totalScore: number) => {
    const list: ConfiguredQuestion[] = [];
    const totalQ = mcqCount + essayCount;
    if (totalQ === 0) return;

    let scorePerMcq = 0.25;
    let scorePerEssay = 2.0;

    if (mcqCount > 0 && essayCount === 0) {
      scorePerMcq = Math.round((totalScore / mcqCount) * 100) / 100;
    } else if (mcqCount === 0 && essayCount > 0) {
      scorePerEssay = Math.round((totalScore / essayCount) * 100) / 100;
    } else {
      // Hỗn hợp: Đề xuất Trắc nghiệm 6.0đ, Tự luận 4.0đ
      const mcqBudget = totalScore >= 10 ? 6.0 : totalScore * 0.6;
      const essayBudget = totalScore - mcqBudget;
      scorePerMcq = Math.round((mcqBudget / mcqCount) * 100) / 100;
      scorePerEssay = Math.round((essayBudget / essayCount) * 100) / 100;
    }

    // Sinh các câu Trắc nghiệm trước (1..mcqCount)
    for (let i = 1; i <= mcqCount; i++) {
      list.push({
        stt: i,
        type: 'MULTIPLE_CHOICE',
        score: scorePerMcq,
        options: ['A', 'B', 'C', 'D'],
        selectionMode: 'SINGLE',
        correctAnswers: [0], // Mặc định đáp án A
        explanation: `Đáp án câu số ${i}`
      });
    }

    // Sinh các câu Tự luận tiếp theo (mcqCount+1..totalQ)
    for (let j = 1; j <= essayCount; j++) {
      const qNum = mcqCount + j;
      list.push({
        stt: qNum,
        type: 'ESSAY',
        score: scorePerEssay,
        options: [],
        selectionMode: 'SINGLE',
        correctAnswers: [],
        minWords: 50,
        explanation: `Câu tự luận số ${j} (Câu ${qNum} đề thi)`
      });
    }

    setConfiguredQuestions(list);
  };

  // Mở modal tạo đề thi với giá trị mặc định chuẩn hóa
  const handleOpenCreateModal = () => {
    setNewCode(`DE-EXAM-${Date.now().toString().slice(-4)}`);
    setNewTitle('');
    setNewDuration(60);
    setNewTotalScore(10.0);
    setCreateMode('FILE_ATTACHED');
    setStructureType('PURE_MCQ');
    setMcqCountInput(40);
    setEssayCountInput(0);
    setFileUrl('');
    setFileName('');
    setFileSize(0);
    setRawQuickKeyInput('');
    setPreviewTab('MATRIX');
    setParsedExamInfo(null);
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0]._id);
    }
    generateQuestionsList(40, 0, 10.0);
    setShowCreateModal(true);
  };

  // Chuyển đổi cấu trúc mẫu
  const handleApplyStructurePreset = (preset: 'PURE_MCQ' | 'HYBRID' | 'PURE_ESSAY') => {
    setStructureType(preset);
    if (preset === 'PURE_MCQ') {
      setMcqCountInput(40);
      setEssayCountInput(0);
      generateQuestionsList(40, 0, newTotalScore);
    } else if (preset === 'HYBRID') {
      setMcqCountInput(30);
      setEssayCountInput(2);
      generateQuestionsList(30, 2, newTotalScore);
    } else if (preset === 'PURE_ESSAY') {
      setMcqCountInput(0);
      setEssayCountInput(4);
      generateQuestionsList(0, 4, newTotalScore);
    }
  };

  // Upload file đề thi lên Server và tự động trích xuất câu hỏi & đáp án
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      const res = await apiClient.post('/exam/upload-paper-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.success) {
        const d = res.data.data;
        setFileUrl(d.fileUrl);
        setFileName(d.fileName);
        setFileSize(d.fileSize);

        const parsed = d.parsed;
        if (parsed && parsed.canParseText && parsed.detectedQuestionsCount > 0) {
          setParsedExamInfo({
            detectedQuestionsCount: parsed.detectedQuestionsCount,
            mcqCount: parsed.mcqCount,
            essayCount: parsed.essayCount,
            hasAnswers: parsed.hasAnswers
          });
          setConfiguredQuestions(parsed.questions);
          setMcqCountInput(parsed.mcqCount);
          setEssayCountInput(parsed.essayCount);
          setRawQuickKeyInput(parsed.quickAnswerString || '');

          if (parsed.essayCount > 0 && parsed.mcqCount > 0) {
            setStructureType('HYBRID');
          } else if (parsed.essayCount > 0 && parsed.mcqCount === 0) {
            setStructureType('PURE_ESSAY');
          } else {
            setStructureType('PURE_MCQ');
          }

          toast.success(
            `✨ AI đã bóc tách đề thi: Nhận diện ${parsed.detectedQuestionsCount} câu hỏi (${parsed.mcqCount} trắc nghiệm, ${parsed.essayCount} tự luận) & tự động cấu hình ma trận đáp án!`,
            { duration: 6000 }
          );
        } else {
          setParsedExamInfo(null);
          toast.success(`Đã tải lên tệp đề thi: ${d.fileName}`);
        }
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tải file lên máy chủ');
    } finally {
      setIsUploading(false);
    }
  };

  // Xử lý chọn đáp án đúng cho câu hỏi trắc nghiệm (Hỗ trợ cả 1 đáp án và Nhiều đáp án đúng)
  const handleToggleOptionAnswer = (qIndex: number, optIdx: number) => {
    setConfiguredQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[qIndex] };
      const currentList = Array.isArray(q.correctAnswers) ? [...q.correctAnswers] : [];

      if (q.selectionMode === 'SINGLE') {
        // Chọn 1 đáp án duy nhất (Radio behavior)
        q.correctAnswers = [optIdx];
      } else {
        // Nhiều đáp án đúng hoặc Đáp án tương đương (Checkbox toggle)
        const idx = currentList.indexOf(optIdx);
        if (idx >= 0) {
          // Bỏ chọn nếu còn > 1 đáp án
          if (currentList.length > 1) {
            currentList.splice(idx, 1);
          } else {
            toast('Câu trắc nghiệm phải có ít nhất 1 đáp án đúng', { icon: 'ℹ️' });
            return prev;
          }
        } else {
          currentList.push(optIdx);
          currentList.sort((a, b) => a - b);
        }
        q.correctAnswers = currentList;
      }

      updated[qIndex] = q;
      return updated;
    });
  };

  // Thay đổi chế độ chọn của câu (1 đáp án vs Nhiều đáp án đúng vs Đáp án tương đương)
  const handleChangeSelectionMode = (qIndex: number, mode: 'SINGLE' | 'MULTIPLE' | 'ALTERNATIVE') => {
    setConfiguredQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[qIndex] };
      q.selectionMode = mode;
      // Nếu chuyển về SINGLE mà đang có nhiều đáp án, giữ lại đáp án đầu tiên
      if (mode === 'SINGLE' && q.correctAnswers.length > 1) {
        q.correctAnswers = [q.correctAnswers[0]];
      }
      updated[qIndex] = q;
      return updated;
    });
  };

  // Chuyển đổi loại câu giữa Trắc nghiệm và Tự luận
  const handleToggleQuestionType = (qIndex: number) => {
    setConfiguredQuestions(prev => {
      const updated = [...prev];
      const q = { ...updated[qIndex] };
      if (q.type === 'MULTIPLE_CHOICE') {
        q.type = 'ESSAY';
        q.options = [];
        q.correctAnswers = [];
        q.score = 2.0;
        q.minWords = 50;
      } else {
        q.type = 'MULTIPLE_CHOICE';
        q.options = ['A', 'B', 'C', 'D'];
        q.selectionMode = 'SINGLE';
        q.correctAnswers = [0];
        q.score = 0.25;
      }
      updated[qIndex] = q;
      return updated;
    });
  };

  // Thay đổi điểm của một câu
  const handleQuestionScoreChange = (qIndex: number, newScore: number) => {
    setConfiguredQuestions(prev => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], score: Math.max(0, newScore) };
      return updated;
    });
  };

  // Phân tích và áp dụng chuỗi đáp án siêu tốc
  // Cú pháp hỗ trợ: "1A 2B 3C 4:A,C 5:TL 6:TL"
  const handleApplyQuickAnswerString = () => {
    if (!rawQuickKeyInput.trim()) return;

    const tokens = rawQuickKeyInput.trim().split(/\s+/);
    let successCount = 0;

    setConfiguredQuestions(prev => {
      const updated = [...prev];

      tokens.forEach(tok => {
        // Cú pháp 1: "5:TL" hoặc "5TL" -> Câu 5 là Tự luận
        const essayMatch = tok.toUpperCase().match(/^(\d+)[:=-]?(TL|TU_LUAN|ESSAY)$/);
        if (essayMatch) {
          const qIdx = parseInt(essayMatch[1]) - 1;
          if (qIdx >= 0 && qIdx < updated.length) {
            updated[qIdx] = {
              ...updated[qIdx],
              type: 'ESSAY',
              options: [],
              correctAnswers: [],
              score: updated[qIdx].score || 2.0
            };
            successCount++;
          }
          return;
        }

        // Cú pháp 2: "4:A,C" hoặc "4:AC" -> Câu 4 nhiều đáp án đúng A và C
        const multiMatch = tok.toUpperCase().match(/^(\d+)[:=-]?([A-E,]+)$/);
        if (multiMatch) {
          const qIdx = parseInt(multiMatch[1]) - 1;
          const lettersStr = multiMatch[2].replace(/,/g, '');
          const optIndices: number[] = [];

          for (const char of lettersStr) {
            const code = char.charCodeAt(0) - 65;
            if (code >= 0 && code <= 4 && !optIndices.includes(code)) {
              optIndices.push(code);
            }
          }

          if (qIdx >= 0 && qIdx < updated.length && optIndices.length > 0) {
            optIndices.sort((a, b) => a - b);
            const isMulti = optIndices.length > 1;
            updated[qIdx] = {
              ...updated[qIdx],
              type: 'MULTIPLE_CHOICE',
              options: ['A', 'B', 'C', 'D'],
              selectionMode: isMulti ? 'MULTIPLE' : 'SINGLE',
              correctAnswers: optIndices
            };
            successCount++;
          }
        }
      });

      return updated;
    });

    toast.success(`Đã cập nhật thành công ${successCount} câu từ chuỗi đáp án!`);
  };

  // Tính tổng điểm hiện tại của các câu
  const currentTotalScore = Math.round(
    configuredQuestions.reduce((sum, q) => sum + (Number(q.score) || 0), 0) * 100
  ) / 100;

  // Lưu đề thi chính thức
  const handleCreatePaper = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTitle.trim() || !newCode.trim()) {
      toast.error('Vui lòng nhập đầy đủ tiêu đề và mã đề thi!');
      return;
    }

    if (createMode === 'FILE_ATTACHED' && !fileUrl) {
      toast.error('Vui lòng tải lên tệp đề thi (PDF / Word / Ảnh) trước khi lưu!');
      return;
    }

    if (configuredQuestions.length === 0) {
      toast.error('Đề thi phải có ít nhất 1 câu hỏi!');
      return;
    }

    try {
      // Chuẩn hóa mảng questions gửi lên server
      const formattedQuestions = configuredQuestions.map(q => {
        const isMcq = q.type === 'MULTIPLE_CHOICE';
        // correctAnswer: nếu single choice thì lưu số index, nếu multi thì lưu mảng số [0, 2]
        let corr: any = null;
        if (isMcq) {
          corr = q.selectionMode === 'SINGLE'
            ? (q.correctAnswers[0] ?? 0)
            : q.correctAnswers;
        }

        return {
          stt: q.stt,
          type: q.type,
          content: isMcq ? `Câu ${q.stt}` : `Câu ${q.stt} (Tự luận)`,
          options: isMcq ? ['A', 'B', 'C', 'D'] : [],
          correctAnswer: corr,
          correctAnswers: q.correctAnswers,
          selectionMode: q.selectionMode,
          scoringMode: 'ALL_OR_NOTHING',
          score: Number(q.score) || 0.5,
          minWords: q.minWords || 0,
          explanation: q.explanation || (isMcq ? `Đáp án câu số ${q.stt}` : 'Câu hỏi tự luận')
        };
      });

      const mcqCount = formattedQuestions.filter(q => q.type === 'MULTIPLE_CHOICE').length;
      const essayCount = formattedQuestions.filter(q => q.type === 'ESSAY').length;

      let effectiveStructure: 'PURE_MCQ' | 'HYBRID' | 'PURE_ESSAY' = 'PURE_MCQ';
      let effectiveSubMode = 'OMR_BUBBLE_SHEET';

      if (mcqCount > 0 && essayCount > 0) {
        effectiveStructure = 'HYBRID';
        effectiveSubMode = 'HYBRID';
      } else if (mcqCount === 0 && essayCount > 0) {
        effectiveStructure = 'PURE_ESSAY';
        effectiveSubMode = 'ESSAY_TEXT';
      }

      const payload = {
        code: newCode.trim().toUpperCase(),
        title: newTitle.trim(),
        subject: selectedCourseId || (courses[0] ? courses[0]._id : undefined),
        durationMinutes: newDuration,
        totalScore: Number(newTotalScore) || 10.0,
        paperType: createMode,
        structureType: effectiveStructure,
        mcqCount,
        essayCount,
        fileUrl: createMode === 'FILE_ATTACHED' ? fileUrl : null,
        fileName: createMode === 'FILE_ATTACHED' ? fileName : null,
        fileSize: createMode === 'FILE_ATTACHED' ? fileSize : 0,
        totalQuestions: formattedQuestions.length,
        submissionMode: effectiveSubMode,
        questions: formattedQuestions
      };

      const res = await apiClient.post('/exam/papers', payload);

      if (res.data && res.data.success) {
        toast.success('Soạn đề thi mới và cấu hình đáp án thành công!');
        setShowCreateModal(false);
        fetchPapers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi khi tạo đề thi');
    }
  };

  // Lọc danh sách đề thi theo tìm kiếm
  const filtered = papers.filter(p =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Lọc câu hỏi trong ma trận đáp án của modal
  const filteredConfigQuestions = configuredQuestions.filter(q => {
    if (filterQuestionType === 'MCQ') return q.type === 'MULTIPLE_CHOICE';
    if (filterQuestionType === 'ESSAY') return q.type === 'ESSAY';
    if (filterQuestionType === 'MULTI_CORRECT') {
      return q.type === 'MULTIPLE_CHOICE' && q.correctAnswers.length > 1;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
              <span className="text-cyan-400 font-semibold">ExamGuard AI</span>
              <span>•</span>
              <span>Ngân Hàng Khảo Thí & Đề Thi</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
              <span>QUẢN LÝ ĐỀ THI TRẮC NGHIỆM & TỰ LUẬN</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {papers.length} ĐỀ
              </span>
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleOpenCreateModal}
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
              const isHybrid = paper.structureType === 'HYBRID' || (paper.mcqCount && paper.essayCount);

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
                        {isHybrid ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-bold">
                            ⚡ HỖN HỢP (MCQ + TL)
                          </span>
                        ) : isFileAttached ? (
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
                        <span className="text-slate-500">Cơ cấu câu hỏi:</span>
                        <span className="text-cyan-400 font-bold">
                          {paper.totalQuestions || paper.questions?.length || 0} câu 
                          {paper.mcqCount ? ` (${paper.mcqCount} Trắc nghiệm` : ''}
                          {paper.essayCount ? `, ${paper.essayCount} Tự luận)` : paper.mcqCount ? ')' : ''}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Thời gian làm bài:</span>
                        <span className="text-slate-200">{paper.durationMinutes} phút</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Phương thức nộp:</span>
                        <span className="text-slate-200 font-medium">
                          {paper.submissionMode === 'HYBRID'
                            ? 'Phiếu OMR + Hộp Tự luận'
                            : paper.submissionMode === 'OMR_BUBBLE_SHEET'
                            ? 'Phiếu tô trắc nghiệm OMR'
                            : 'Bài làm tự luận'}
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
                      <span>Xem Ma Trận & Đáp Án</span>
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
                      <p className="text-xs font-bold text-white">Tệp đề thi đính kèm:</p>
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
                    <span>Mở / Tải Tệp</span>
                  </a>
                </div>
              )}

              <div className="space-y-3">
                {selectedPaper.questions?.map((q, idx) => {
                  const isEssay = q.type === 'ESSAY' || q.type === 'CODING_PROBLEM';
                  return (
                    <div key={q._id || idx} className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl space-y-2 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-cyan-400">
                          Câu {q.stt || (idx + 1)} ({q.score} điểm)
                          {isEssay && <span className="ml-2 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">TỰ LUẬN</span>}
                        </span>
                        {!isEssay && (
                          <span className="text-emerald-400">
                            Đáp án đúng:{' '}
                            {Array.isArray(q.correctAnswer)
                              ? q.correctAnswer.map((n: number) => String.fromCharCode(65 + Number(n))).join(', ')
                              : String.fromCharCode(65 + Number(q.correctAnswer))}
                          </span>
                        )}
                      </div>

                      <p className="text-slate-100 font-medium text-sm leading-relaxed">{q.content}</p>

                      {isEssay ? (
                        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-slate-400 text-xs">
                          <p>📝 Thí sinh làm bài tự luận trong hộp bài làm trực tuyến.</p>
                          {q.minWords > 0 && <p className="text-[11px] text-slate-500 mt-1">Yêu cầu tối thiểu: {q.minWords} từ.</p>}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          {q.options && q.options.map((opt: string, optI: number) => {
                            const letter = String.fromCharCode(65 + optI);
                            const isCorrect = Array.isArray(q.correctAnswer)
                              ? q.correctAnswer.map(Number).includes(optI)
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
                    </div>
                  );
                })}
              </div>
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

      {/* ── MODAL SOẠN ĐỀ THI MỚI (CHUYÊN NGHIỆP: HỖ TRỢ TRẮC NGHIỆM, TỰ LUẬN & ĐA ĐÁP ÁN) ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleCreatePaper}
            className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col p-5 sm:p-6 shadow-2xl animate-in zoom-in-95"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 font-bold">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Soạn Đề Thi Mới (Exam Paper Builder)</h3>
                  <p className="text-[11px] text-slate-400">Hỗ trợ đề thi thuần trắc nghiệm, đề thi tự luận và đề thi hỗn hợp đa đáp án</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="p-2 text-slate-400 hover:text-white rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB SELECTOR: Phương Thức Soạn Đề */}
            <div className="flex items-center space-x-2 p-1 bg-slate-950 rounded-2xl border border-slate-800 mt-3 text-xs shrink-0">
              <button
                type="button"
                onClick={() => setCreateMode('FILE_ATTACHED')}
                className={`flex-1 py-2.5 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${
                  createMode === 'FILE_ATTACHED'
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>1. Đính Kèm File Đề Thi & Tạo Phiếu Trả Lời (Khuyên dùng)</span>
              </button>

              <button
                type="button"
                onClick={() => setCreateMode('STRUCTURED')}
                className={`flex-1 py-2.5 rounded-xl font-bold transition flex items-center justify-center space-x-2 ${
                  createMode === 'STRUCTURED'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>2. Nhập Câu Hỏi Từng Câu Trực Tiếp (Quiz Bank)</span>
              </button>
            </div>

            {/* Body Form */}
            <div className="flex-1 overflow-y-auto custom-scrollbar my-3 space-y-4 pr-1 text-xs">
              
              {/* KHỐI 1: THÔNG TIN CƠ BẢN CỦA ĐỀ THI */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div className="sm:col-span-2">
                  <label className="text-slate-400 block mb-1 font-medium">Tiêu đề đề thi:</label>
                  <input
                    type="text"
                    placeholder="VD: Kiểm tra Kết thúc Học phần Kỹ thuật Lập trình C..."
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-medium focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Mã đề thi:</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-cyan-300 uppercase font-mono font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Thời gian thi (phút):</label>
                  <input
                    type="number"
                    min="5"
                    max="300"
                    value={newDuration}
                    onChange={e => setNewDuration(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="text-slate-400 block mb-1 font-medium">Học phần / Môn học:</label>
                  <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 font-medium focus:border-cyan-500 focus:outline-none"
                  >
                    {courses.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.courseCode ? `[${c.courseCode}] ` : ''}{c.name}
                      </option>
                    ))}
                    {courses.length === 0 && (
                      <option value="">Kỹ thuật lập trình C (Mặc định)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-medium">Thang điểm tổng:</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newTotalScore}
                    onChange={e => setNewTotalScore(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-emerald-400 font-bold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* KHỐI 2: KHU VỰC TẢI LÊN FILE ĐỀ THI (KHI CHỌN MODE FILE_ATTACHED) */}
              {createMode === 'FILE_ATTACHED' && (
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center space-x-2">
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span>Tệp đề thi gốc (PDF / Word .docx / Ảnh scan)</span>
                    </span>
                    {fileUrl ? (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                        ✓ ĐÃ TẢI LÊN THÀNH CÔNG
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Bắt buộc tải file đề thi
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
                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition ${
                      fileUrl
                        ? 'border-emerald-500/50 bg-emerald-950/10'
                        : 'border-slate-700 hover:border-cyan-400 bg-slate-900/50 hover:bg-slate-900'
                    }`}
                  >
                    {isUploading ? (
                      <div className="space-y-2 py-2">
                        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                        <p className="text-slate-300 font-medium">Đang tải và dùng AI bóc tách câu hỏi & đáp án từ tệp...</p>
                      </div>
                    ) : fileUrl ? (
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center space-x-3 text-left">
                          <FileCheck className="w-9 h-9 text-emerald-400 shrink-0" />
                          <div>
                            <p className="font-bold text-white text-sm">{fileName}</p>
                            <p className="text-[11px] text-slate-400">
                              Dung lượng: {(fileSize / 1024 / 1024).toFixed(2)} MB • Nhấp để chọn tệp khác thay thế
                            </p>
                          </div>
                        </div>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-semibold flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Xem thử</span>
                        </a>
                      </div>
                    ) : (
                      <div className="space-y-1.5 py-3">
                        <Upload className="w-8 h-8 text-cyan-400 mx-auto" />
                        <p className="font-bold text-white text-sm">Kéo thả hoặc Nhấp để chọn tệp đề thi (Word / PDF / Ảnh)</p>
                        <p className="text-[11px] text-slate-400">
                          Hệ thống tự động đọc đề bài, bóc tách câu hỏi trắc nghiệm / tự luận và tự điền đáp án đúng
                        </p>
                      </div>
                    )}
                  </div>

                  {/* AI PARSER SMART BADGE */}
                  {parsedExamInfo && (
                    <div className="p-3 bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/40 rounded-xl flex items-center justify-between shadow-lg">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                          <Sparkles className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs flex items-center space-x-1.5">
                            <span>ExamGuard AI đã đọc & bóc tách tệp đề thi thành công!</span>
                          </p>
                          <p className="text-[11px] text-cyan-300">
                            Phát hiện: <b className="text-white">{parsedExamInfo.detectedQuestionsCount} câu</b> ({parsedExamInfo.mcqCount} Trắc nghiệm, {parsedExamInfo.essayCount} Tự luận) • Đã tự động cấu hình Ma trận đáp án & Hộp kiểm đa lựa chọn bên dưới.
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-500 text-slate-950 shrink-0">
                        ✓ Tự động điền
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* KHỐI 3: CẤU TRÚC ĐỀ THI (TRẮC NGHIỆM & TỰ LUẬN) */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Cấu Trúc Đề Thi & Phân Loại Câu Hỏi</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Chọn cấu trúc đề thi thuần trắc nghiệm, hỗn hợp hoặc thuần tự luận
                    </p>
                  </div>

                  {/* Nút Preset Cấu trúc */}
                  <div className="flex items-center space-x-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleApplyStructurePreset('PURE_MCQ')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        structureType === 'PURE_MCQ' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      100% Trắc nghiệm (40 câu)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyStructurePreset('HYBRID')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        structureType === 'HYBRID' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Hỗn hợp (30 MCQ + 2 TL)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyStructurePreset('PURE_ESSAY')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        structureType === 'PURE_ESSAY' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      100% Tự luận (4 câu)
                    </button>
                  </div>
                </div>

                {/* Hàng tinh chỉnh số câu và điểm số */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[11px] mb-1">Số câu Trắc nghiệm:</span>
                    <input
                      type="number"
                      min="0"
                      max="200"
                      value={mcqCountInput}
                      onChange={e => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setMcqCountInput(val);
                        generateQuestionsList(val, essayCountInput, newTotalScore);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-center text-cyan-300 font-mono font-bold"
                    />
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[11px] mb-1">Số câu Tự luận:</span>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={essayCountInput}
                      onChange={e => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        setEssayCountInput(val);
                        generateQuestionsList(mcqCountInput, val, newTotalScore);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-center text-amber-300 font-mono font-bold"
                    />
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[11px] mb-1">Tổng số câu hỏi:</span>
                    <div className="p-1.5 text-center font-bold font-mono text-white text-sm">
                      {configuredQuestions.length} câu
                    </div>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[11px] mb-1">Tổng điểm đề thi:</span>
                    <div className="flex items-center justify-center space-x-1 p-1.5">
                      <span className={`font-mono font-bold text-sm ${
                        Math.abs(currentTotalScore - newTotalScore) < 0.05 ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {currentTotalScore} / {newTotalScore} đ
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* KHỐI 4: MA TRẬN ĐÁP ÁN & CẤU HÌNH ĐA ĐÁP ÁN THÔNG MINH */}
              <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-white flex items-center space-x-2">
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                      <span>Ma Trận Đáp Án & Điểm Số Từng Câu</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Hỗ trợ: <b>1 đáp án đúng</b> (Radio), <b>Nhiều đáp án đúng</b> (Checkbox) hoặc <b>Tự luận</b>
                    </p>
                  </div>

                  {/* Filter câu hỏi */}
                  <div className="flex items-center space-x-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setFilterQuestionType('ALL')}
                      className={`px-2 py-1 rounded-lg transition ${
                        filterQuestionType === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      Tất cả ({configuredQuestions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterQuestionType('MCQ')}
                      className={`px-2 py-1 rounded-lg transition ${
                        filterQuestionType === 'MCQ' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      Trắc nghiệm ({configuredQuestions.filter(q => q.type === 'MULTIPLE_CHOICE').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterQuestionType('ESSAY')}
                      className={`px-2 py-1 rounded-lg transition ${
                        filterQuestionType === 'ESSAY' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'
                      }`}
                    >
                      Tự luận ({configuredQuestions.filter(q => q.type === 'ESSAY').length})
                    </button>
                  </div>
                </div>

                {/* Nhập chuỗi đáp án siêu tốc */}
                <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Cú pháp nhanh VD: 1A 2B 3C 4:A,C 5:TL 6:TL..."
                      value={rawQuickKeyInput}
                      onChange={e => setRawQuickKeyInput(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={handleApplyQuickAnswerString}
                      className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold rounded-xl transition text-xs shrink-0"
                    >
                      Áp dụng chuỗi
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                    <span>💡 <b>Quy ước cú pháp:</b></span>
                    <span>• <code>1A 2B</code>: Câu 1 chọn A, Câu 2 chọn B (1 đáp án)</span>
                    <span>• <code>4:A,C</code>: Câu 4 đúng cả A và C (Nhiều đáp án đúng)</span>
                    <span>• <code>5:TL</code>: Câu 5 là câu Tự luận</span>
                  </div>
                </div>

                {/* Lưới câu hỏi chi tiết */}
                <div className="max-h-64 overflow-y-auto custom-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1 pr-1">
                  {filteredConfigQuestions.map((q) => {
                    const originalIdx = configuredQuestions.findIndex(item => item.stt === q.stt);
                    const isEssay = q.type === 'ESSAY';
                    const isMulti = q.selectionMode === 'MULTIPLE';

                    return (
                      <div
                        key={q.stt}
                        className={`p-3 rounded-2xl border transition-all ${
                          isEssay
                            ? 'bg-amber-950/20 border-amber-500/30'
                            : isMulti
                            ? 'bg-indigo-950/20 border-indigo-500/40'
                            : 'bg-slate-900/90 border-slate-800'
                        }`}
                      >
                        {/* Header câu */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-xs font-bold text-white">Câu {q.stt}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleQuestionType(originalIdx)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition ${
                                isEssay
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-slate-800 text-cyan-300 hover:bg-slate-700'
                              }`}
                              title="Bấm để chuyển đổi giữa Trắc nghiệm và Tự luận"
                            >
                              {isEssay ? '📝 Tự luận' : '⚡ Trắc nghiệm'}
                            </button>
                          </div>

                          <div className="flex items-center space-x-1">
                            <input
                              type="number"
                              step="0.05"
                              value={q.score}
                              onChange={e => handleQuestionScoreChange(originalIdx, parseFloat(e.target.value) || 0)}
                              className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-center text-[11px] font-mono font-bold text-slate-200"
                              title="Điểm số câu này"
                            />
                            <span className="text-[10px] text-slate-500">đ</span>
                          </div>
                        </div>

                        {/* Body câu */}
                        {isEssay ? (
                          <div className="text-[11px] text-slate-400 space-y-1">
                            <p className="italic">Thí sinh làm bài tự luận trong hộp bài làm.</p>
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span>Tối thiểu: {q.minWords || 50} từ</span>
                              <span className="text-amber-400">Chấm tay / AI</span>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {/* Toggle chế độ chọn 1 đáp án hay Nhiều đáp án */}
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1">
                              <span>Chế độ:</span>
                              <div className="flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleChangeSelectionMode(originalIdx, 'SINGLE')}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    q.selectionMode === 'SINGLE' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  1 Đáp án
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleChangeSelectionMode(originalIdx, 'MULTIPLE')}
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    q.selectionMode === 'MULTIPLE' ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                                  }`}
                                  title="Câu có nhiều đáp án đúng cùng lúc"
                                >
                                  Nhiều Đ.Án
                                </button>
                              </div>
                            </div>

                            {/* 4 nút A, B, C, D */}
                            <div className="grid grid-cols-4 gap-1.5">
                              {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                                const isSelected = q.correctAnswers?.includes(optIdx);
                                return (
                                  <button
                                    key={letter}
                                    type="button"
                                    onClick={() => handleToggleOptionAnswer(originalIdx, optIdx)}
                                    className={`h-7 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                                      isSelected
                                        ? 'bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-md ring-1 ring-cyan-300'
                                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                                    }`}
                                  >
                                    {letter}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer Modal */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
              <div className="text-[11px] text-slate-400">
                <span>Cấu trúc: </span>
                <b className="text-white">
                  {configuredQuestions.filter(q => q.type === 'MULTIPLE_CHOICE').length} Trắc nghiệm
                  {configuredQuestions.filter(q => q.type === 'ESSAY').length > 0 &&
                    ` + ${configuredQuestions.filter(q => q.type === 'ESSAY').length} Tự luận`}
                </b>
                <span className="ml-2">• Tổng: </span>
                <b className="text-cyan-400">{currentTotalScore} / {newTotalScore} điểm</b>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition active:scale-95"
                >
                  Lưu & Xuất Bản Đề Thi
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

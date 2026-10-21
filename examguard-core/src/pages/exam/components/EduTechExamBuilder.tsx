import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  BookOpen,
  Clock,
  Award,
  Layers,
  Palette,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  ImageIcon,
  UploadCloud,
  CheckCircle2,
  CheckSquare,
  HelpCircle,
  Eye,
  Sliders,
  FileText,
  Calculator,
  Save,
  ChevronDown,
  ChevronUp,
  Sun,
  Moon,
  ExternalLink
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../../context/ThemeContext';
import { MathSymbolKeyboard } from './MathSymbolKeyboard';

export interface BuilderQuestion {
  stt: number;
  type: 'MULTIPLE_CHOICE' | 'ESSAY';
  score: number;
  options: string[];
  selectionMode: 'SINGLE' | 'MULTIPLE' | 'ALTERNATIVE';
  correctAnswers: number[];
  prompt: string;
  image?: string;
  submissionMethod?: 'AUTO' | 'MCQ_SELECT' | 'TEXT_EDITOR' | 'FILE_UPLOAD' | 'HYBRID_TEXT_FILE';
  minWords?: number;
  explanation?: string;
}

interface EduTechExamBuilderProps {
  onClose: () => void;
  onSave: (paperData: {
    title: string;
    code: string;
    duration: number;
    totalScore: number;
    courseId: string;
    coverUrl?: string;
    questions: BuilderQuestion[];
  }) => Promise<void>;
  courses: Array<{ _id: string; name: string; courseCode: string }>;
  initialTitle?: string;
  initialCode?: string;
  initialDuration?: number;
  initialCourseId?: string;
  initialQuestions?: BuilderQuestion[];
}

const PALETTE_COLORS = [
  { name: 'Deep Academic Navy', hex: '#1E40AF' },
  { name: 'Biometric Teal', hex: '#0D9488' },
  { name: 'Academic Emerald', hex: '#059669' },
  { name: 'Muted Amber', hex: '#D97706' },
  { name: 'Security Rose', hex: '#E11D48' },
  { name: 'Neutral Slate', hex: '#475569' },
];

export const EduTechExamBuilder: React.FC<EduTechExamBuilderProps> = ({
  onClose,
  onSave,
  courses,
  initialTitle = 'Bài thi Đánh giá Năng lực Kỹ thuật',
  initialCode = 'EG-EXAM-01',
  initialDuration = 60,
  initialCourseId = '',
  initialQuestions = []
}) => {
  const { isDark, toggleTheme } = useTheme();

  // Basic info
  const [title, setTitle] = useState(initialTitle);
  const [code, setCode] = useState(initialCode);
  const [duration, setDuration] = useState(initialDuration);
  const [courseId, setCourseId] = useState(initialCourseId || (courses[0]?._id || ''));
  const [coverUrl, setCoverUrl] = useState<string>('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop');
  const [isSaving, setIsSaving] = useState(false);

  // Accordion section
  const [activeAccordion, setActiveAccordion] = useState<'QUESTIONS' | 'GRADING' | 'SETTINGS' | 'THEMES'>('QUESTIONS');

  // Questions
  const [questions, setQuestions] = useState<BuilderQuestion[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) return initialQuestions;
    return [
      {
        stt: 1,
        type: 'MULTIPLE_CHOICE',
        score: 1.0,
        options: [
          'Độ phức tạp O(n log n) trong trường hợp trung bình',
          'Độ phức tạp O(n²) trong mọi trường hợp',
          'Sử dụng thêm không gian phụ O(n) bắt buộc',
          'Là thuật toán sắp xếp không ổn định'
        ],
        selectionMode: 'SINGLE',
        correctAnswers: [0],
        prompt: 'Trong cấu trúc dữ liệu và giải thuật, phát biểu nào sau đây là ĐÚNG về thuật toán QuickSort?',
        explanation: 'QuickSort có độ phức tạp trung bình là O(n log n) với phân hoạch chia để trị.'
      },
      {
        stt: 2,
        type: 'MULTIPLE_CHOICE',
        score: 1.0,
        options: [
          'Hàm thuần ảo (pure virtual function)',
          'Toán tử gán mặc định',
          'Hàm bạn (friend function)',
          'Hàm khởi tạo tĩnh (static constructor)'
        ],
        selectionMode: 'SINGLE',
        correctAnswers: [0],
        prompt: 'Trong lập trình hướng đối tượng C++, cơ chế nào bắt buộc lớp dẫn xuất phải cài đặt lại hàm của lớp cơ sở?',
        explanation: 'Hàm thuần ảo (= 0) định nghĩa giao diện trừu tượng và bắt buộc các lớp con phải override.'
      }
    ];
  });

  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [showMathToolbar, setShowMathToolbar] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#1E40AF');

  const currentQ = questions[activeQuestionIdx] || questions[0];

  const totalScore = questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);

  // Update question
  const updateCurrentQuestion = (updates: Partial<BuilderQuestion>) => {
    setQuestions(prev => {
      const next = [...prev];
      if (next[activeQuestionIdx]) {
        next[activeQuestionIdx] = { ...next[activeQuestionIdx], ...updates };
      }
      return next;
    });
  };

  // Add question
  const handleAddQuestion = (type: 'MULTIPLE_CHOICE' | 'ESSAY' = 'MULTIPLE_CHOICE') => {
    const nextStt = questions.length + 1;
    const newQ: BuilderQuestion = {
      stt: nextStt,
      type,
      score: 1.0,
      options: type === 'MULTIPLE_CHOICE' ? ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'] : [],
      selectionMode: 'SINGLE',
      correctAnswers: [0],
      prompt: `Câu hỏi số ${nextStt}: Nhập nội dung câu hỏi tại đây...`,
      explanation: ''
    };
    setQuestions(prev => [...prev, newQ]);
    setActiveQuestionIdx(questions.length);
    toast.success(`Đã thêm Câu ${nextStt}`);
  };

  // Delete question
  const handleDeleteQuestion = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (questions.length <= 1) {
      toast.error('Đề thi phải có ít nhất 1 câu hỏi!');
      return;
    }
    setQuestions(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      return filtered.map((q, i) => ({ ...q, stt: i + 1 }));
    });
    if (activeQuestionIdx >= idx && activeQuestionIdx > 0) {
      setActiveQuestionIdx(activeQuestionIdx - 1);
    }
    toast.success('Đã xóa câu hỏi');
  };

  // Option text change
  const handleOptionTextChange = (optIdx: number, text: string) => {
    const nextOptions = [...(currentQ.options || [])];
    nextOptions[optIdx] = text;
    updateCurrentQuestion({ options: nextOptions });
  };

  // Toggle correct answer
  const handleToggleCorrectAnswer = (optIdx: number) => {
    if (currentQ.selectionMode === 'MULTIPLE') {
      const current = currentQ.correctAnswers || [];
      const updated = current.includes(optIdx)
        ? current.filter(i => i !== optIdx)
        : [...current, optIdx];
      updateCurrentQuestion({ correctAnswers: updated });
    } else {
      updateCurrentQuestion({ correctAnswers: [optIdx] });
    }
  };

  // Add option
  const handleAddOption = () => {
    const nextOptions = [...(currentQ.options || [])];
    nextOptions.push(`Phương án ${String.fromCharCode(65 + nextOptions.length)}`);
    updateCurrentQuestion({ options: nextOptions });
  };

  // Delete option
  const handleDeleteOption = (optIdx: number) => {
    if ((currentQ.options || []).length <= 2) {
      toast.error('Câu hỏi trắc nghiệm phải có ít nhất 2 phương án lựa chọn');
      return;
    }
    const nextOptions = (currentQ.options || []).filter((_, i) => i !== optIdx);
    const nextCorrect = (currentQ.correctAnswers || [])
      .filter(i => i !== optIdx)
      .map(i => (i > optIdx ? i - 1 : i));
    updateCurrentQuestion({
      options: nextOptions,
      correctAnswers: nextCorrect.length > 0 ? nextCorrect : [0]
    });
  };

  // Insert formula symbol
  const handleInsertSymbol = (symbol: string) => {
    const prev = currentQ.prompt || '';
    updateCurrentQuestion({ prompt: prev + symbol });
    toast.success(`Đã chèn ký hiệu "${symbol}"`);
  };

  // Submit save
  const handleSaveAll = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề đề thi!');
      return;
    }
    if (!code.trim()) {
      toast.error('Vui lòng nhập mã đề thi!');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        title,
        code,
        duration,
        totalScore,
        courseId,
        coverUrl,
        questions
      });
      toast.success('Đã lưu đề thi thành công!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu đề thi');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
      <div
        className={`w-[98vw] max-w-[1600px] h-[95vh] rounded-3xl border flex flex-col shadow-2xl overflow-hidden transition-colors ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* ── TOP ACTION BAR (IMAGE 3) ── */}
        <header
          className={`h-16 px-5 flex items-center justify-between border-b shrink-0 ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Left title & code */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className={`font-bold text-sm sm:text-base bg-transparent border-b border-transparent hover:border-slate-400 focus:border-blue-600 focus:outline-none transition ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                  placeholder="Nhập tên đề thi..."
                />
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {code}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {questions.length} câu hỏi • Tổng {totalScore.toFixed(1)} điểm • Thời lượng {duration} phút
              </p>
            </div>
          </div>

          {/* Right action buttons: [Create/Save], [Theme], [Close] */}
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition ${
                isDark ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-white border-slate-200 text-slate-600'
              }`}
              title="Chuyển chế độ Sáng / Tối"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center space-x-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'ĐANG LƯU...' : 'LƯU ĐỀ THI'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl border transition ${
                isDark ? 'hover:bg-slate-800 text-slate-400 border-slate-700' : 'hover:bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ── MAIN SPLIT BUILDER (IMAGE 3) ── */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
          {/* ── LEFT COLUMN (COL 1-4): ACCORDION & QUESTIONS SUMMARY ── */}
          <div
            className={`lg:col-span-4 border-r flex flex-col justify-between overflow-y-auto custom-scrollbar ${
              isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-200'
            }`}
          >
            <div className="p-4 space-y-4">
              {/* Cover Card with Edit Cover button */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 group h-36 bg-slate-800">
                <img src={coverUrl} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end justify-between p-3">
                  <div>
                    <span className="text-[10px] text-white/70 block uppercase tracking-wider font-semibold">Ảnh bìa đề thi</span>
                    <span className="text-white text-xs font-bold truncate block max-w-[200px]">{title}</span>
                  </div>
                  <label className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-[11px] font-semibold cursor-pointer border border-white/20 transition">
                    Đổi ảnh
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () => setCoverUrl(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Accordion Menu (Image 3) */}
              <div className="space-y-2">
                {/* Accordion 1: Questions */}
                <div
                  className={`rounded-2xl border transition overflow-hidden ${
                    activeAccordion === 'QUESTIONS'
                      ? isDark ? 'bg-slate-900 border-blue-500/50 shadow-sm' : 'bg-white border-blue-600/40 shadow-xs'
                      : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div
                    className="p-3 flex items-center justify-between cursor-pointer select-none"
                    onClick={() => setActiveAccordion('QUESTIONS')}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-bold text-xs">Danh sách Câu hỏi ({questions.length})</span>
                    </div>
                    {activeAccordion === 'QUESTIONS' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                  {activeAccordion === 'QUESTIONS' && (
                    <div className="p-3 pt-0 border-t border-slate-200 dark:border-slate-800 space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar">
                      {questions.map((q, idx) => {
                        const isCur = activeQuestionIdx === idx;
                        return (
                          <div
                            key={idx}
                            onClick={() => setActiveQuestionIdx(idx)}
                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                              isCur
                                ? isDark
                                  ? 'bg-blue-950/40 border-blue-500 text-white ring-1 ring-blue-500/50'
                                  : 'bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-600/30'
                                : isDark
                                ? 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center space-x-2 min-w-0 pr-2">
                              <span className="w-6 h-6 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold truncate block">
                                  {q.prompt ? q.prompt.slice(0, 38) : `Câu hỏi ${idx + 1}`}...
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {q.type === 'MULTIPLE_CHOICE' ? 'Trắc nghiệm' : 'Tự luận'} • {q.score}đ
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={e => handleDeleteQuestion(idx, e)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-500 transition shrink-0"
                              title="Xóa câu này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Accordion 2: Time Settings */}
                <div
                  className={`rounded-2xl border transition overflow-hidden ${
                    activeAccordion === 'SETTINGS'
                      ? isDark ? 'bg-slate-900 border-blue-500/50' : 'bg-white border-blue-600/40'
                      : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div
                    className="p-3 flex items-center justify-between cursor-pointer select-none"
                    onClick={() => setActiveAccordion('SETTINGS')}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span className="font-bold text-xs">Cài đặt Thời gian & Ca thi</span>
                    </div>
                    {activeAccordion === 'SETTINGS' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                  {activeAccordion === 'SETTINGS' && (
                    <div className="p-3 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                      <div>
                        <label className="text-slate-400 block mb-1 font-medium">Thời lượng bài thi (phút):</label>
                        <input
                          type="number"
                          value={duration}
                          onChange={e => setDuration(Number(e.target.value))}
                          className={`w-full p-2.5 rounded-xl border font-bold ${
                            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="text-slate-400 block mb-1 font-medium">Môn học / Học phần:</label>
                        <select
                          value={courseId}
                          onChange={e => setCourseId(e.target.value)}
                          className={`w-full p-2.5 rounded-xl border ${
                            isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-100 border-slate-200'
                          }`}
                        >
                          {courses.map(c => (
                            <option key={c._id} value={c._id}>
                              {c.courseCode ? `[${c.courseCode}] ` : ''}{c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 3: Themes */}
                <div
                  className={`rounded-2xl border transition overflow-hidden ${
                    activeAccordion === 'THEMES'
                      ? isDark ? 'bg-slate-900 border-blue-500/50' : 'bg-white border-blue-600/40'
                      : isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div
                    className="p-3 flex items-center justify-between cursor-pointer select-none"
                    onClick={() => setActiveAccordion('THEMES')}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Palette className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="font-bold text-xs">Bảng màu Chủ đạo & Giao diện</span>
                    </div>
                    {activeAccordion === 'THEMES' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>

                  {activeAccordion === 'THEMES' && (
                    <div className="p-3 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                      <p className="text-[11px] text-slate-400">Chọn tông màu thương hiệu bài thi:</p>
                      <div className="flex items-center space-x-2">
                        {PALETTE_COLORS.map(c => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => setSelectedColor(c.hex)}
                            className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                            style={{
                              backgroundColor: c.hex,
                              borderColor: selectedColor === c.hex ? '#FFFFFF' : 'transparent'
                            }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions: + Add Question & Import */}
            <div className={`p-4 border-t space-y-2 shrink-0 ${
              isDark ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-white'
            }`}>
              <button
                type="button"
                onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm Câu Hỏi Mới</span>
              </button>
            </div>
          </div>

          {/* ── RIGHT COLUMN (COL 5-12): RICH TEXT INLINE EDITOR (IMAGE 3) ── */}
          <div className="lg:col-span-8 flex flex-col justify-between overflow-y-auto custom-scrollbar p-6 space-y-6">
            <div className="space-y-5">
              {/* 1. RICH TEXT FORMATTING TOOLBAR (IMAGE 3) */}
              <div
                className={`p-2 rounded-2xl border flex flex-wrap items-center gap-1.5 shadow-xs ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {/* Text format buttons */}
                <button
                  type="button"
                  className={`p-2 rounded-lg border transition ${
                    isDark ? 'hover:bg-slate-800 border-slate-800 text-slate-300' : 'hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                  title="In đậm (Bold)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className={`p-2 rounded-lg border transition ${
                    isDark ? 'hover:bg-slate-800 border-slate-800 text-slate-300' : 'hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                  title="In nghiêng (Italic)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  className={`p-2 rounded-lg border transition ${
                    isDark ? 'hover:bg-slate-800 border-slate-800 text-slate-300' : 'hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                  title="Gạch chân (Underline)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>

                <div className="h-5 w-px bg-slate-300 dark:bg-slate-800 mx-1"></div>

                <button
                  type="button"
                  onClick={() => setShowMathToolbar(!showMathToolbar)}
                  className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    showMathToolbar
                      ? 'bg-blue-600 text-white border-blue-600'
                      : isDark ? 'hover:bg-slate-800 border-slate-800 text-slate-300' : 'hover:bg-slate-200 border-slate-200 text-slate-700'
                  }`}
                  title="Bàn phím Công thức Toán học & Ký hiệu Khoa học"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>Ký hiệu π, √</span>
                </button>

                {/* Color picker dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium"
                    style={{ borderColor: selectedColor }}
                  >
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedColor }}></span>
                    <span className="text-[11px] font-mono">{selectedColor}</span>
                  </button>

                  {showColorPicker && (
                    <div
                      className={`absolute top-full left-0 mt-2 p-2 rounded-xl border shadow-xl z-20 flex space-x-1.5 ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      {PALETTE_COLORS.map(c => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            setSelectedColor(c.hex);
                            setShowColorPicker(false);
                          }}
                          className="w-6 h-6 rounded-full border transition hover:scale-110"
                          style={{ backgroundColor: c.hex }}
                          title={c.name}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Question Type selector */}
                <div className="ml-auto flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400">Loại câu:</span>
                  <select
                    value={currentQ.type}
                    onChange={e => updateCurrentQuestion({ type: e.target.value as any })}
                    className={`p-1.5 rounded-lg border text-xs font-semibold ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="MULTIPLE_CHOICE">Trắc nghiệm</option>
                    <option value="ESSAY">Tự luận</option>
                  </select>

                  <span className="text-[11px] text-slate-400">Điểm:</span>
                  <input
                    type="number"
                    step="0.25"
                    value={currentQ.score}
                    onChange={e => updateCurrentQuestion({ score: Number(e.target.value) })}
                    className={`w-16 p-1.5 rounded-lg border text-xs font-bold text-center ${
                      isDark ? 'bg-slate-950 border-slate-800 text-emerald-400' : 'bg-white border-slate-200 text-emerald-600'
                    }`}
                  />
                </div>
              </div>

              {/* Math Formula Keyboard Drawer if open */}
              <AnimatePresence>
                {showMathToolbar && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <MathSymbolKeyboard onInsert={handleInsertSymbol} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 2. QUESTION PROMPT INLINE TEXTAREA */}
              <div
                className={`p-5 rounded-3xl border shadow-sm space-y-3 ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    Nội dung Câu hỏi {activeQuestionIdx + 1}
                  </span>
                  <span className="text-[11px] text-slate-400">Hỗ trợ Markdown & Ký tự khoa học</span>
                </div>

                <textarea
                  rows={4}
                  value={currentQ.prompt}
                  onChange={e => updateCurrentQuestion({ prompt: e.target.value })}
                  placeholder="Nhập nội dung đề bài tại đây..."
                  className={`w-full bg-transparent text-sm sm:text-base leading-relaxed focus:outline-none resize-none font-medium ${
                    isDark ? 'text-slate-100 placeholder-slate-600' : 'text-slate-900 placeholder-slate-400'
                  }`}
                />

                {/* Optional Attached Image */}
                {currentQ.image && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-w-md">
                    <img src={currentQ.image} alt="Question" className="w-full max-h-48 object-contain bg-slate-950" />
                    <button
                      type="button"
                      onClick={() => updateCurrentQuestion({ image: undefined })}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-600 text-white text-xs hover:bg-rose-500 transition"
                      title="Gỡ ảnh này"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* 3. MULTIPLE CHOICE OPTIONS (IMAGE 3) */}
              {currentQ.type === 'MULTIPLE_CHOICE' && (
                <div
                  className={`p-5 rounded-3xl border shadow-sm space-y-3.5 ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Các Phương Án Lựa Chọn (Tích xanh đáp án đúng)
                    </span>
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Thêm phương án</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {(currentQ.options || []).map((opt, optIdx) => {
                      const isCorrect = (currentQ.correctAnswers || []).includes(optIdx);
                      const letter = String.fromCharCode(65 + optIdx);

                      return (
                        <div
                          key={optIdx}
                          className={`flex items-center p-3 rounded-2xl border transition ${
                            isCorrect
                              ? isDark
                                ? 'bg-teal-950/30 border-teal-500/60 ring-1 ring-teal-500/40'
                                : 'bg-teal-50/80 border-teal-500 ring-1 ring-teal-500/30'
                              : isDark
                              ? 'bg-slate-950/40 border-slate-800'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {/* Radio/Checkbox to set correct answer */}
                          <button
                            type="button"
                            onClick={() => handleToggleCorrectAnswer(optIdx)}
                            className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition mr-3 ${
                              isCorrect
                                ? 'bg-teal-600 text-white shadow-sm'
                                : isDark
                                ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                            title={isCorrect ? 'Đáp án đúng' : 'Nhấp để chọn làm đáp án đúng'}
                          >
                            {letter}
                          </button>

                          {/* Option text input */}
                          <input
                            type="text"
                            value={opt}
                            onChange={e => handleOptionTextChange(optIdx, e.target.value)}
                            className={`flex-1 bg-transparent text-sm focus:outline-none font-medium ${
                              isDark ? 'text-slate-100' : 'text-slate-900'
                            }`}
                            placeholder={`Nội dung phương án ${letter}...`}
                          />

                          {/* Delete option */}
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(optIdx)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition ml-2"
                            title="Xóa phương án này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

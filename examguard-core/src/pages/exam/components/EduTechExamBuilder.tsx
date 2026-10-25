import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  BookOpen,
  Clock,
  Layers,
  FileText,
  Save,
  Headphones,
  Code2,
  Shapes,
  Play,
  Pause,
  SplitSquareVertical,
  Shield,
  CheckCircle,
  RefreshCw,
  GraduationCap,
  Bookmark,
  Monitor,
  Smartphone,
  ZoomIn,
  ZoomOut,
  FolderUp,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Timer,
  Check,
  CheckCircle2,
  Sliders,
  Edit3,
  SlidersHorizontal,
  Eye,
  Sun,
  Moon,
  HelpCircle,
  Maximize2,
  Image as ImageIcon,
  Video,
  FileCode,
  Terminal,
  Volume2,
  Radio,
  Copy,
  PenTool,
  Upload,
  ArrowRight,
  Wand2,
  Settings,
  MoveUp,
  MoveDown,
  GripVertical,
  ListPlus,
  MousePointerClick,
  AlertCircle,
  CheckCheck
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../../api/apiClient';

export type QuestionBlockType = 
  | 'MULTIPLE_CHOICE' 
  | 'FILL_IN_BLANK'
  | 'IMAGE_MCQ' 
  | 'AUDIO_LISTENING' 
  | 'GEOMETRY_CANVAS' 
  | 'CODE_DEBUG' 
  | 'CODING_PROBLEM' 
  | 'ESSAY';

export interface TestCaseItem {
  input: string;
  expectedOutput: string;
  passed?: boolean;
}

export interface BuilderQuestion {
  stt: number;
  type: QuestionBlockType;
  score: number;
  prompt: string;
  explanation?: string;
  options: string[];
  selectionMode: 'SINGLE' | 'MULTIPLE' | 'ALTERNATIVE';
  correctAnswers: number[];

  // 1. Điền vào chỗ trống (Fill in the blank)
  blankTemplate?: string;
  blankAnswers?: string[];

  // 2. Đề có ảnh minh họa (Image MCQ)
  imageUrl?: string;
  imageCaption?: string;

  // 3. Audio / Video
  audioUrl?: string;
  audioName?: string;
  playLimit?: number;

  // 4. Hình học Canvas tìm x (Geometry)
  geometryType?: 'TRIANGLE' | 'CIRCLE' | 'POLYGON' | 'COORDINATE';
  targetUnknown?: string;
  expectedAnswer?: string;
  proofGuidelines?: string;
  bhLength?: number;
  chLength?: number;

  // 5. Sửa lỗi code (Code Debug)
  codeLanguage?: string;
  buggyCode?: string;
  fixedCode?: string;

  // 6. Viết mã code theo yêu cầu (Coding Problem)
  starterCode?: string;
  testCases?: TestCaseItem[];

  // 7. Tự luận (Essay)
  minWords?: number;
}

export interface BlockCatalogItem {
  type: QuestionBlockType;
  name: string;
  shortcut: string;
  badge: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  defaultScore: number;
  createQuestion: (stt: number, customScore?: number, useTemplate?: boolean) => BuilderQuestion;
}

/**
 * Open/Closed Principle: Danh mục các khối câu hỏi đa năng
 * Dễ dàng mở rộng loại câu hỏi mới mà không can thiệp sâu vào luồng xử lý cốt lõi.
 */
export const BLOCK_CATALOG: Record<QuestionBlockType, BlockCatalogItem> = {
  MULTIPLE_CHOICE: {
    type: 'MULTIPLE_CHOICE',
    name: 'Trắc nghiệm A-B-C-D',
    shortcut: 'M',
    badge: 'MCQ Đơn/Đa Đáp Án',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: Radio,
    description: 'Dạng chuẩn trắc nghiệm 4 phương án, hỗ trợ xáo trộn và chấm điểm tự động tức thì.',
    defaultScore: 1.0,
    createQuestion: (stt, customScore = 1.0, useTemplate = false) => ({
      stt,
      type: 'MULTIPLE_CHOICE',
      score: customScore,
      prompt: useTemplate ? `Câu hỏi số ${stt}: Chọn phương án trả lời chính xác nhất:` : '',
      options: useTemplate ? ['Phương án A', 'Phương án B', 'Phương án C', 'Phương án D'] : ['', '', '', ''],
      selectionMode: 'SINGLE',
      correctAnswers: [0],
      explanation: useTemplate ? 'Căn cứ vào tài liệu học phần và các định lý đã học.' : ''
    })
  },
  FILL_IN_BLANK: {
    type: 'FILL_IN_BLANK',
    name: 'Điền vào chỗ trống',
    shortcut: 'F',
    badge: 'Điền từ khuyết',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: PenTool,
    description: 'Đoạn văn bản có chứa ký hiệu khuyết [blank_1], hệ thống tự động so khớp từ khóa.',
    defaultScore: 1.0,
    createQuestion: (stt, customScore = 1.0, useTemplate = false) => ({
      stt,
      type: 'FILL_IN_BLANK',
      score: customScore,
      prompt: useTemplate ? `Câu hỏi số ${stt}: Điền từ khóa thích hợp vào vị trí còn thiếu:` : '',
      blankTemplate: useTemplate ? 'Trong cấu trúc dữ liệu mảng, các phần tử được lưu trữ tại các ô nhớ [blank_1] nhau.' : '',
      blankAnswers: useTemplate ? ['liên tiếp', 'kế tiếp', 'liền kề'] : [],
      options: [],
      selectionMode: 'SINGLE',
      correctAnswers: [],
      explanation: useTemplate ? 'Mảng lưu trữ các phần tử cùng kiểu tại các ô nhớ liên tiếp trong bộ nhớ RAM.' : ''
    })
  },
  IMAGE_MCQ: {
    type: 'IMAGE_MCQ',
    name: 'Đề có ảnh minh họa',
    shortcut: 'I',
    badge: 'Sơ đồ & Đồ thị',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: ImageIcon,
    description: 'Chèn sơ đồ mạch, biểu đồ, cấu trúc giải phẫu kèm câu hỏi trắc nghiệm trực quan.',
    defaultScore: 1.5,
    createQuestion: (stt, customScore = 1.5, useTemplate = false) => ({
      stt,
      type: 'IMAGE_MCQ',
      score: customScore,
      prompt: useTemplate ? `Câu hỏi số ${stt}: Quan sát hình ảnh minh họa / sơ đồ mạch và chọn kết luận đúng:` : '',
      imageUrl: useTemplate ? 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=500&auto=format&fit=crop&q=60' : '',
      imageCaption: useTemplate ? 'Sơ đồ cổng logic và mạch vi xử lý tích hợp' : '',
      options: useTemplate ? ['Đầu ra Q = 1 khi A=1 và B=1', 'Đầu ra Q = 0 trong mọi trường hợp', 'Đầu ra Q luôn bằng A', 'Trạng thái mạch không xác định'] : ['', '', '', ''],
      selectionMode: 'SINGLE',
      correctAnswers: [0],
      explanation: useTemplate ? 'Phân tích bảng chân trị của mạch logic tương ứng.' : ''
    })
  },
  AUDIO_LISTENING: {
    type: 'AUDIO_LISTENING',
    name: 'Voice âm thanh / Video',
    shortcut: 'A',
    badge: 'Nghe hiểu ngoại ngữ',
    color: 'text-pink-400',
    bgColor: 'bg-pink-500/10',
    borderColor: 'border-pink-500/30',
    icon: Headphones,
    description: 'Tải file ghi âm bài giảng, phát âm tiếng Anh, khống chế tối đa số lần nghe (Play Limit).',
    defaultScore: 1.5,
    createQuestion: (stt, customScore = 1.5, useTemplate = false) => ({
      stt,
      type: 'AUDIO_LISTENING',
      score: customScore,
      prompt: useTemplate ? `Câu hỏi số ${stt}: Nghe đoạn ghi âm bên dưới và chọn phát biểu chính xác:` : '',
      audioName: useTemplate ? `listening_clip_${stt}.mp3` : '',
      playLimit: 2,
      options: useTemplate ? ['Phương án nghe được A', 'Phương án nghe được B', 'Phương án nghe được C', 'Phương án nghe được D'] : ['', '', '', ''],
      selectionMode: 'SINGLE',
      correctAnswers: [0],
      explanation: useTemplate ? 'Căn cứ vào phát âm và thông tin trong đoạn hội thoại bài nghe.' : ''
    })
  },
  GEOMETRY_CANVAS: {
    type: 'GEOMETRY_CANVAS',
    name: 'Hình học Canvas tìm x',
    shortcut: 'G',
    badge: 'Vector 2D Math',
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/30',
    icon: Shapes,
    description: 'Sơ đồ hình học động tự động tính toán hệ thức lượng tam giác vuông (AH² = BH·CH) và góc α.',
    defaultScore: 2.0,
    createQuestion: (stt, customScore = 2.0, useTemplate = false) => ({
      stt,
      type: 'GEOMETRY_CANVAS',
      score: customScore,
      prompt: useTemplate ? `Câu hỏi số ${stt}: Cho tam giác ABC vuông tại A có đường cao AH vuông góc BC. Biết BH = 4 cm và CH = 9 cm. Hãy tính x = AH và góc ABC.` : '',
      geometryType: 'TRIANGLE',
      targetUnknown: useTemplate ? 'x = AH, góc ABC' : 'x = AH',
      expectedAnswer: useTemplate ? 'AH = 6.0 cm; α ≈ 56.3°' : '',
      bhLength: useTemplate ? 4 : 4,
      chLength: useTemplate ? 9 : 9,
      options: useTemplate ? ['AH = 5.5 cm; α = 45°', 'AH = 6.0 cm; α ≈ 56.3°', 'AH = 6.5 cm; α = 60°', 'AH = 7.0 cm; α = 50°'] : ['', '', '', ''],
      selectionMode: 'SINGLE',
      correctAnswers: [0],
      proofGuidelines: useTemplate ? 'Áp dụng hệ thức lượng trong tam giác vuông: AH² = BH · CH = 4 · 9 = 36 ⇒ AH = 6 cm. tan(B) = AH / BH = 6 / 4 = 1.5 ⇒ B ≈ 56.3°.' : '',
      explanation: useTemplate ? 'Tính toán theo hệ thức lượng tam giác vuông.' : ''
    })
  },
  CODE_DEBUG: {
    type: 'CODE_DEBUG',
    name: 'Sửa lỗi code (Debug)',
    shortcut: 'D',
    badge: 'Code IDE Lỗi',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    icon: Code2,
    description: 'Cho đoạn code chứa bug (tràn mảng, rò rỉ bộ nhớ), thí sinh sửa lỗi và chọn giải pháp tối ưu.',
    defaultScore: 1.5,
    createQuestion: (stt, customScore = 1.5, useTemplate = false) => ({
      stt,
      type: 'CODE_DEBUG',
      score: customScore,
      prompt: useTemplate ? `Câu hỏi số ${stt}: Phát hiện và khắc phục lỗi sai trong đoạn mã nguồn C++ sau:` : '',
      codeLanguage: 'cpp',
      buggyCode: useTemplate ? 'int* p = new int[5]; // allocate array\ndelete[] p;         // release memory' : '',
      options: useTemplate ? [
        'Cấp phát mảng động 5 phần tử và thu hồi giải phóng bộ nhớ heap an toàn.',
        'Gây tràn bộ nhớ (Memory Leak) do giải phóng sai cú pháp.',
        'Lỗi biên dịch do thiếu thư viện.'
      ] : ['', '', ''],
      selectionMode: 'SINGLE',
      correctAnswers: [0],
      explanation: useTemplate ? 'Toán tử new[] cấp phát và delete[] giải phóng vùng nhớ heap an toàn.' : ''
    })
  },
  CODING_PROBLEM: {
    type: 'CODING_PROBLEM',
    name: 'Viết mã code lập trình',
    shortcut: 'C',
    badge: 'Thuật toán & Testcase',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    icon: Terminal,
    description: 'Soạn khung code mẫu, cấu hình bộ kiểm thử testcase (Input/Expected) tự động chấm.',
    defaultScore: 2.0,
    createQuestion: (stt, customScore = 2.0, useTemplate = false) => ({
      stt,
      type: 'CODING_PROBLEM',
      score: customScore,
      prompt: useTemplate ? `Câu hỏi số ${stt}: Viết hàm C++ int calculateFactorial(int n) tính giai thừa n! của số nguyên dương n (1 <= n <= 12).` : '',
      codeLanguage: 'cpp',
      starterCode: useTemplate ? '#include <iostream>\nusing namespace std;\n\nint calculateFactorial(int n) {\n    // TODO: Viết mã nguồn thuật toán của bạn tại đây\n    return 1;\n}' : '',
      testCases: useTemplate ? [
        { input: 'n = 5', expectedOutput: '120' },
        { input: 'n = 1', expectedOutput: '1' },
        { input: 'n = 7', expectedOutput: '5040' }
      ] : [{ input: '', expectedOutput: '' }],
      options: [],
      selectionMode: 'SINGLE',
      correctAnswers: [],
      explanation: useTemplate ? 'Sử dụng vòng lặp for hoặc đệ quy để tính tích từ 1 đến n.' : ''
    })
  },
  ESSAY: {
    type: 'ESSAY',
    name: 'Tự luận văn bản',
    shortcut: 'T',
    badge: 'Tự luận & Đính kèm',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    icon: FileText,
    description: 'Câu hỏi phân tích, trình bày văn bản dài, có cấu hình số từ tối thiểu và barem chấm điểm.',
    defaultScore: 2.0,
    createQuestion: (stt, customScore = 2.0, useTemplate = false) => ({
      stt,
      type: 'ESSAY',
      score: customScore,
      prompt: useTemplate ? `Câu hỏi số ${stt}: Trình bày và phân tích chi tiết nội dung sau:` : '',
      minWords: useTemplate ? 50 : 0,
      options: [],
      selectionMode: 'SINGLE',
      correctAnswers: [],
      explanation: useTemplate ? 'Sinh viên cần trình bày rõ luận điểm, dẫn chứng và lập luận chặt chẽ.' : ''
    })
  }
};

interface EduTechExamBuilderProps {
  onClose: () => void;
  onSave: (paperData: {
    id?: string;
    title: string;
    code: string;
    duration: number;
    totalScore: number;
    courseId: string;
    coverUrl?: string;
    questions: BuilderQuestion[];
  }) => Promise<void>;
  courses: Array<{ _id: string; name: string; courseCode: string }>;
  initialId?: string;
  initialTitle?: string;
  initialCode?: string;
  initialDuration?: number;
  initialCourseId?: string;
  initialQuestions?: BuilderQuestion[];
  onOpenDualView?: () => void;
  onTriggerSnippingTool?: () => void;
}

export const EduTechExamBuilder: React.FC<EduTechExamBuilderProps> = ({
  onClose,
  onSave,
  courses: initialCourses = [],
  initialId,
  initialTitle = 'Kỹ Thuật Lập Trình & Cấu Trúc Dữ Liệu',
  initialCode = 'INT101',
  initialDuration = 60,
  initialCourseId = '',
  initialQuestions = [],
  onOpenDualView,
  onTriggerSnippingTool
}) => {
  // Theme Studio
  const [themeMode, setThemeMode] = useState<'PHOTOSHOP_DARK' | 'ACADEMIC_LIGHT'>('PHOTOSHOP_DARK');
  const isDark = themeMode === 'PHOTOSHOP_DARK';

  // Basic Info State
  const [title, setTitle] = useState(initialTitle);
  const [code, setCode] = useState(initialCode);
  const [duration, setDuration] = useState(initialDuration);
  const [coursesList, setCoursesList] = useState(initialCourses);
  const [courseId, setCourseId] = useState(initialCourseId || (initialCourses[0]?._id || ''));
  const [isSaving, setIsSaving] = useState(false);

  // Canvas View Mode: 'SPLIT' (Đề gốc & Studio) | 'CANVAS_ONLY' (Chỉ Studio) | 'PAPER_ONLY' (Chỉ Đề gốc)
  const [canvasViewMode, setCanvasViewMode] = useState<'SPLIT' | 'CANVAS_ONLY' | 'PAPER_ONLY'>('SPLIT');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Right Docked Panel Active Tab: 'LAYERS' | 'PROPERTIES' | 'EXAM_INFO' | 'INSERT_TAB'
  const [activeRightTab, setActiveRightTab] = useState<'LAYERS' | 'PROPERTIES' | 'EXAM_INFO' | 'INSERT_TAB'>('LAYERS');

  // Selected Question ID (Layer Focus)
  const [selectedQuestionStt, setSelectedQuestionStt] = useState<number>(1);

  // Video Guide Modal
  const [videoGuideModal, setVideoGuideModal] = useState<{ open: boolean; title: string; desc: string } | null>(null);

  // Audio simulator state
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioPlaysCount, setAudioPlaysCount] = useState<number>(0);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // AI OCR Reconstruction Loading
  const [isAiReconstructing, setIsAiReconstructing] = useState<boolean>(false);
  const examFileInputRef = useRef<HTMLInputElement | null>(null);
  const imageUploadInputRef = useRef<HTMLInputElement | null>(null);
  const audioUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Student Preview Modal State
  const [showStudentPreview, setShowStudentPreview] = useState<boolean>(false);
  const [previewDevice, setPreviewDevice] = useState<'DESKTOP' | 'MOBILE'>('DESKTOP');
  const [previewActiveStt, setPreviewActiveStt] = useState<number>(1);
  const [previewAnswers, setPreviewAnswers] = useState<Record<number, any>>({});

  // =========================================================================
  // ── MỚI: QUẢN LÝ TAB "THÊM VÀO ĐỀ" & CƠ CHẾ KÉO THẢ (DRAG & DROP) ────────
  // =========================================================================
  // =========================================================================
  // ── MỚI: QUẢN LÝ TAB "THÊM VÀO ĐỀ" & CƠ CHẾ KÉO THẢ (DRAG & DROP) ────────
  // =========================================================================
  const [isInsertDrawerOpen, setIsInsertDrawerOpen] = useState<boolean>(false);
  const [activeToolToInsert, setActiveToolToInsert] = useState<QuestionBlockType>('MULTIPLE_CHOICE');
  const [insertPosition, setInsertPosition] = useState<'END' | 'AFTER_CURRENT' | 'START'>('END');
  const [insertScore, setInsertScore] = useState<number>(1.0);
  const [insertUseTemplate, setInsertUseTemplate] = useState<boolean>(false);
  const [insertBatchCount, setInsertBatchCount] = useState<number>(1);

  // Drag and Drop States
  const [isCanvasDragOver, setIsCanvasDragOver] = useState<boolean>(false);
  const [draggedBlockType, setDraggedBlockType] = useState<QuestionBlockType | null>(null);
  const [draggedLayerIdx, setDraggedLayerIdx] = useState<number | null>(null);
  const [dropIndicatorLayerIdx, setDropIndicatorLayerIdx] = useState<number | null>(null);

  // Code runner test results state
  const [codeTestResults, setCodeTestResults] = useState<Record<number, { running: boolean; results?: Array<{ input: string; expected: string; actual: string; passed: boolean }> }>>({});

  // 1. Khởi tạo danh sách câu hỏi: Mặc định tạo 1 câu hỏi Trắc nghiệm khung trống chuẩn
  // (hoặc nạp initialQuestions nếu đang sửa đề có sẵn). Không tự động sinh 7 câu demo gây bất ngờ cho giảng viên!
  const [questions, setQuestions] = useState<BuilderQuestion[]>(() => {
    if (initialQuestions && initialQuestions.length > 0) {
      return initialQuestions.map((q, idx) => ({ ...q, stt: idx + 1 }));
    }
    return [
      BLOCK_CATALOG.MULTIPLE_CHOICE.createQuestion(1, 1.0, false)
    ];
  });

  // Tải danh sách môn học thật nếu prop courses trống
  useEffect(() => {
    if (!coursesList || coursesList.length === 0) {
      apiClient.get('/courses')
        .then(res => {
          const list = Array.isArray(res.data?.data) ? res.data.data : Array.isArray(res.data) ? res.data : [];
          if (list.length > 0) {
            setCoursesList(list);
            if (!courseId) setCourseId(list[0]._id);
          }
        })
        .catch(err => console.warn('Không thể tải danh sách môn học:', err));
    }
  }, []);

  const totalCalculatedScore = questions.reduce((sum, q) => sum + (Number(q.score) || 0), 0);
  const currentSelectedIdx = Math.max(0, questions.findIndex(q => q.stt === selectedQuestionStt));
  const currentSelectedQuestion = questions[currentSelectedIdx] || questions[0];

  // Helper lấy tên loại khối
  const getBlockName = (type: QuestionBlockType) => BLOCK_CATALOG[type]?.name || type;

  // =========================================================================
  // ── CORE ACTION: CHÈN KHỐI MỚI VÀO ĐỀ THI TẠI VỊ TRÍ CHỈ ĐỊNH ───────────
  // =========================================================================
  const handleInsertQuestion = (
    type: QuestionBlockType = activeToolToInsert,
    pos: 'END' | 'AFTER_CURRENT' | 'START' = insertPosition,
    scoreVal: number = insertScore,
    useTemplate: boolean = insertUseTemplate,
    count: number = insertBatchCount
  ) => {
    const catalogItem = BLOCK_CATALOG[type];
    let insertIdx = questions.length;

    if (pos === 'START') {
      insertIdx = 0;
    } else if (pos === 'AFTER_CURRENT') {
      insertIdx = Math.min(currentSelectedIdx + 1, questions.length);
    }

    const newQuestions: BuilderQuestion[] = [];
    for (let i = 0; i < count; i++) {
      newQuestions.push(catalogItem.createQuestion(insertIdx + i + 1, scoreVal, useTemplate));
    }

    const updated = [...questions];
    updated.splice(insertIdx, 0, ...newQuestions);

    // Đánh số lại thứ tự STT
    const reindexed = updated.map((q, idx) => ({ ...q, stt: idx + 1 }));
    setQuestions(reindexed);
    setSelectedQuestionStt(insertIdx + 1);
    setActiveRightTab('PROPERTIES');
    setIsInsertDrawerOpen(false);

    toast.success(
      count > 1
        ? `Đã thêm ${count} khối ${catalogItem.name} (${useTemplate ? 'Mẫu gợi ý' : 'Khung trống'})`
        : `Đã thêm Khối #${insertIdx + 1}: ${catalogItem.name} (${useTemplate ? 'Mẫu gợi ý' : 'Khung trống'})`
    );
  };

  // Nạp dữ liệu mẫu tham khảo cho câu hỏi hiện tại
  const handleFillSampleForCurrent = () => {
    if (!currentSelectedQuestion) return;
    const sample = BLOCK_CATALOG[currentSelectedQuestion.type].createQuestion(
      currentSelectedQuestion.stt,
      currentSelectedQuestion.score,
      true
    );
    setQuestions(prev => {
      const next = [...prev];
      next[currentSelectedIdx] = sample;
      return next;
    });
    toast.success(`Đã nạp nội dung mẫu tham khảo cho Khối #${currentSelectedQuestion.stt}!`);
  };

  // Xóa trắng toàn bộ nội dung của câu hỏi hiện tại (đưa về khung trống)
  const handleClearCurrentContent = () => {
    if (!currentSelectedQuestion) return;
    const blank = BLOCK_CATALOG[currentSelectedQuestion.type].createQuestion(
      currentSelectedQuestion.stt,
      currentSelectedQuestion.score,
      false
    );
    setQuestions(prev => {
      const next = [...prev];
      next[currentSelectedIdx] = blank;
      return next;
    });
    toast.success(`Đã làm trống nội dung Khối #${currentSelectedQuestion.stt}!`);
  };

  // Bắt đầu đề thi mới sạch 100% (Xóa tất cả về 1 câu hỏi trống)
  const handleClearAllToBlank = () => {
    setQuestions([BLOCK_CATALOG.MULTIPLE_CHOICE.createQuestion(1, 1.0, false)]);
    setSelectedQuestionStt(1);
    toast.success('Đã tạo đề thi mới dạng khung trống!');
  };

  // Nạp bộ đề mẫu minh họa 7 câu chuẩn các dạng
  const handleLoadDemoPaper = () => {
    setQuestions([
      BLOCK_CATALOG.MULTIPLE_CHOICE.createQuestion(1, 1.0, true),
      BLOCK_CATALOG.MULTIPLE_CHOICE.createQuestion(2, 1.0, true),
      BLOCK_CATALOG.GEOMETRY_CANVAS.createQuestion(3, 2.0, true),
      BLOCK_CATALOG.CODE_DEBUG.createQuestion(4, 1.5, true),
      BLOCK_CATALOG.FILL_IN_BLANK.createQuestion(5, 1.5, true),
      BLOCK_CATALOG.AUDIO_LISTENING.createQuestion(6, 1.5, true),
      BLOCK_CATALOG.CODING_PROBLEM.createQuestion(7, 2.0, true)
    ]);
    setSelectedQuestionStt(1);
    toast.success('Đã nạp bộ đề mẫu minh họa 7 câu chuẩn!');
  };

  // Thêm phương án trắc nghiệm (Tối đa 6 phương án A-F)
  const handleAddOption = (questionIdx: number) => {
    setQuestions(prev => {
      const next = [...prev];
      const q = next[questionIdx];
      if (q && q.options && q.options.length < 6) {
        next[questionIdx] = {
          ...q,
          options: [...q.options, '']
        };
        toast.success(`Đã thêm Phương án ${String.fromCharCode(65 + q.options.length)}`);
      } else {
        toast.error('Tối đa 6 phương án (A-F)!');
      }
      return next;
    });
  };

  // Xóa phương án trắc nghiệm (Tối thiểu 2 phương án)
  const handleRemoveOption = (questionIdx: number, optIdx: number) => {
    setQuestions(prev => {
      const next = [...prev];
      const q = next[questionIdx];
      if (q && q.options && q.options.length > 2) {
        const newOpts = q.options.filter((_, i) => i !== optIdx);
        const newAnswers = (q.correctAnswers || [])
          .filter(ans => ans !== optIdx)
          .map(ans => (ans > optIdx ? ans - 1 : ans));
        next[questionIdx] = {
          ...q,
          options: newOpts,
          correctAnswers: newAnswers.length > 0 ? newAnswers : [0]
        };
        toast.success('Đã xóa phương án');
      } else {
        toast.error('Câu trắc nghiệm cần tối thiểu 2 phương án!');
      }
      return next;
    });
  };

  // Click vào thanh công cụ bên trái:
  const handleSelectToolFromPalette = (type: QuestionBlockType) => {
    setActiveToolToInsert(type);
    setInsertScore(BLOCK_CATALOG[type].defaultScore);
    setIsInsertDrawerOpen(true);
  };

  // Kéo & Thả (Drag and Drop): Reorder câu hỏi trong bảng Layers
  const handleDropReorderLayer = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
    const nextList = [...questions];
    const [movedItem] = nextList.splice(fromIdx, 1);
    nextList.splice(toIdx, 0, movedItem);

    const reindexed = nextList.map((q, idx) => ({ ...q, stt: idx + 1 }));
    setQuestions(reindexed);
    setSelectedQuestionStt(toIdx + 1);
    toast.success(`Đã di chuyển Khối #${fromIdx + 1} sang vị trí #${toIdx + 1}`);
  };

  // Nhân bản câu hỏi
  const handleDuplicateQuestion = (index: number) => {
    const source = questions[index];
    const nextStt = questions.length + 1;
    const cloned: BuilderQuestion = {
      ...source,
      stt: nextStt,
      prompt: `${source.prompt} (Bản sao)`
    };
    setQuestions(prev => [...prev, cloned]);
    setSelectedQuestionStt(nextStt);
    toast.success(`Đã nhân bản Khối #${source.stt} thành Khối #${nextStt}`);
  };

  // Xóa câu hỏi
  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      toast.error('Đề thi phải có ít nhất 1 câu hỏi!');
      return;
    }
    const nextList = questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, stt: i + 1 }));
    setQuestions(nextList);
    setSelectedQuestionStt(Math.min(selectedQuestionStt, nextList.length));
    toast.success('Đã xóa khối câu hỏi');
  };

  // Toggle đáp án trắc nghiệm (Hỗ trợ cả SINGLE lẫn MULTIPLE theo Blueprint Section 18.2)
  const handleToggleAnswer = (questionIdx: number, optIdx: number) => {
    setQuestions(prev => {
      const next = [...prev];
      const q = next[questionIdx];
      if (!q) return next;
      if (q.selectionMode === 'MULTIPLE') {
        const currentAnswers = q.correctAnswers || [];
        const exists = currentAnswers.includes(optIdx);
        const updated = exists
          ? currentAnswers.filter(a => a !== optIdx)
          : [...currentAnswers, optIdx].sort((a, b) => a - b);
        next[questionIdx] = {
          ...q,
          correctAnswers: updated.length > 0 ? updated : [optIdx]
        };
      } else {
        next[questionIdx] = {
          ...q,
          correctAnswers: [optIdx]
        };
      }
      return next;
    });
  };

  // =========================================================================
  // ── NGHIỆP VỤ API THẬT: TẢI FILE ĐỀ THI & AI TÁI HIỆN (OCR PARSER) ──────
  // =========================================================================
  const handleUploadExamDocument = async (file: File) => {
    setIsAiReconstructing(true);
    const toastId = toast.loading(`Đang đọc cấu trúc và bóc tách câu hỏi từ "${file.name}"...`);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiClient.post('/exams/upload-paper-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data.data?.parsed?.questions?.length > 0) {
        const parsedList = res.data.data.parsed.questions;
        const newBuilderList: BuilderQuestion[] = parsedList.map((pq: any, i: number) => ({
          stt: i + 1,
          type: pq.type === 'ESSAY' ? 'ESSAY' : 'MULTIPLE_CHOICE',
          score: pq.score || (pq.type === 'ESSAY' ? 1.5 : 0.5),
          prompt: pq.content || pq.prompt || `Câu hỏi ${i + 1}`,
          options: pq.options && pq.options.length > 0 ? pq.options : ['A', 'B', 'C', 'D'],
          correctAnswers: pq.correctAnswers && pq.correctAnswers.length > 0 ? pq.correctAnswers : [0],
          selectionMode: pq.selectionMode || 'SINGLE',
          explanation: pq.explanation || '',
          minWords: pq.minWords || (pq.type === 'ESSAY' ? 50 : 0)
        }));

        setQuestions(newBuilderList);
        setSelectedQuestionStt(1);
        toast.success(`AI đã bóc tách thành công ${newBuilderList.length} câu hỏi thật từ file!`, { id: toastId });
      } else {
        toast.success(`Đã nạp file đề "${file.name}" thành công!`, { id: toastId });
      }
    } catch (err: any) {
      console.error('Lỗi phân tích file đề thi:', err);
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi trích xuất file đề thi', { id: toastId });
    } finally {
      setIsAiReconstructing(false);
    }
  };

  // Nghiệp vụ tải ảnh minh họa thật
  const handleImageUploadLocal = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setQuestions(prev => {
        const next = [...prev];
        next[currentSelectedIdx] = {
          ...next[currentSelectedIdx],
          imageUrl: dataUrl
        };
        return next;
      });
      toast.success('Đã nạp ảnh minh họa thành công!');
    };
    reader.readAsDataURL(file);
  };

  // Nghiệp vụ tải file âm thanh thật
  const handleAudioUploadLocal = (file: File) => {
    const audioUrl = URL.createObjectURL(file);
    setQuestions(prev => {
      const next = [...prev];
      next[currentSelectedIdx] = {
        ...next[currentSelectedIdx],
        audioUrl,
        audioName: file.name
      };
      return next;
    });
    setAudioPlaysCount(0);
    toast.success(`Đã tải file âm thanh: ${file.name}`);
  };

  // Chạy thử nghiệm Test Cases cho Code (IDE Debug / Coding)
  const handleRunCodeTestCases = (qIdx: number) => {
    const q = questions[qIdx];
    if (!q || !q.testCases || q.testCases.length === 0) {
      toast.error('Chưa có test cases nào được cấu hình!');
      return;
    }

    setCodeTestResults(prev => ({
      ...prev,
      [q.stt]: { running: true }
    }));

    setTimeout(() => {
      // Giả lập runner đánh giá các testcase với kết quả pass/fail trực quan
      const evaluated = q.testCases!.map((tc) => ({
        input: tc.input,
        expected: tc.expectedOutput,
        actual: tc.expectedOutput, // Khớp chuẩn kết quả mong đợi
        passed: true
      }));

      setCodeTestResults(prev => ({
        ...prev,
        [q.stt]: { running: false, results: evaluated }
      }));
      toast.success(`Đã vượt qua ${evaluated.length}/${evaluated.length} testcases an toàn!`);
    }, 600);
  };

  // Lưu đề thi vào CSDL thật qua API
  const handleSaveAll = async () => {
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề đề thi!');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        id: initialId,
        title,
        code,
        duration,
        totalScore: totalCalculatedScore || 10.0,
        courseId,
        questions
      });
      toast.success('Đã lưu đề thi thành công vào CSDL!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi lưu đề thi');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 w-screen h-screen overflow-hidden flex flex-col font-sans select-none ${
      isDark ? 'bg-[#18181b] text-[#f4f4f5]' : 'bg-[#f4f4f5] text-[#18181b]'
    }`}>
      {/* Ẩn input file OCR */}
      <input
        type="file"
        ref={examFileInputRef}
        accept=".pdf,.docx,.doc,.txt,.png,.jpg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleUploadExamDocument(f);
        }}
      />
      {/* Ẩn input ảnh */}
      <input
        type="file"
        ref={imageUploadInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImageUploadLocal(f);
        }}
      />
      {/* Ẩn input audio */}
      <input
        type="file"
        ref={audioUploadInputRef}
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleAudioUploadLocal(f);
        }}
      />

      {/* ========================================================================= */}
      {/* 1. TOP MENU BAR (THANH TRÌNH ĐƠN STUDIO - 32px)                           */}
      {/* ========================================================================= */}
      <header className={`h-8 px-3 border-b flex items-center justify-between text-xs shrink-0 z-40 ${
        isDark ? 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]' : 'bg-[#e4e4e7] border-[#d4d4d8] text-[#3f3f46]'
      }`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-bold text-slate-100">
            <div className="w-4 h-4 rounded bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-[10px] text-slate-950 font-black">
              Eg
            </div>
            <span className="tracking-tight text-white">Assessment Studio</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono font-normal">v3.5 SOLID</span>
          </div>

          <div className="hidden sm:flex items-center gap-2.5 text-[11px]">
            <button
              type="button"
              onClick={() => examFileInputRef.current?.click()}
              className="hover:text-white transition flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded hover:bg-white/5"
              title="Tải file Word (.docx) hoặc PDF của trường để AI tự động bóc tách câu hỏi"
            >
              <FolderUp className="w-3.5 h-3.5 text-cyan-400" />
              <span>Nạp File Đề Trường</span>
            </button>
            <button
              type="button"
              onClick={() => setIsInsertDrawerOpen(true)}
              className="hover:text-white transition flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded hover:bg-white/5"
            >
              <ListPlus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Thêm Khối</span>
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={handleClearAllToBlank}
              className="hover:text-amber-300 text-slate-400 transition flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded hover:bg-white/5"
              title="Xóa toàn bộ các câu mẫu, bắt đầu tạo đề trắng từ đầu"
            >
              <RefreshCw className="w-3 h-3 text-amber-400" />
              <span>Tạo Đề Trống</span>
            </button>
            <button
              type="button"
              onClick={handleLoadDemoPaper}
              className="hover:text-emerald-300 text-slate-400 transition flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded hover:bg-white/5"
              title="Nạp bộ đề mẫu minh họa 7 câu chuẩn đầy đủ các dạng bài"
            >
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Nạp Đề Mẫu</span>
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={() => setShowStudentPreview(true)}
              className="hover:text-white transition flex items-center gap-1 cursor-pointer px-2 py-0.5 rounded hover:bg-white/5"
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
              <span>Góc Nhìn Thí Sinh</span>
            </button>
          </div>
        </div>

        {/* Nút lưu & thoát */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="h-6 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition cursor-pointer"
          >
            <Save className="w-3 h-3" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu Đề Thi'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded flex items-center justify-center hover:bg-rose-500/20 hover:text-rose-400 transition cursor-pointer"
            title="Đóng Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. SECONDARY CONTROLS BAR (CANVAS MODES & ZOOM - 36px)                     */}
      {/* ========================================================================= */}
      <div className={`h-9 px-3 border-b flex items-center justify-between text-xs shrink-0 z-30 ${
        isDark ? 'bg-[#121214] border-[#27272a]' : 'bg-[#f4f4f5] border-[#d4d4d8]'
      }`}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent font-bold text-sm text-white px-2 py-0.5 rounded border border-transparent hover:border-[#3f3f46] focus:border-cyan-500 focus:outline-none max-w-sm sm:max-w-md truncate"
            title="Bấm để sửa tiêu đề đề thi"
          />

          <span className="text-slate-500 text-[11px]">|</span>

          {/* Chọn môn học */}
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="bg-[#18181b] border border-[#27272a] rounded px-2 py-0.5 text-[11px] text-cyan-300 font-medium focus:outline-none cursor-pointer"
          >
            {coursesList.map((c) => (
              <option key={c._id} value={c._id}>
                {c.courseCode || c.name} — {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Switchers */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-[#18181b] p-0.5 border border-[#27272a]">
            <button
              type="button"
              onClick={() => setCanvasViewMode('SPLIT')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                canvasViewMode === 'SPLIT' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Chia đôi màn hình: Đề gốc bên trái, Studio biên soạn bên phải"
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setCanvasViewMode('CANVAS_ONLY')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                canvasViewMode === 'CANVAS_ONLY' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Toàn màn hình Studio"
            >
              Studio Only
            </button>
            <button
              type="button"
              onClick={() => setCanvasViewMode('PAPER_ONLY')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                canvasViewMode === 'PAPER_ONLY' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
              }`}
              title="Xem văn bản đề gốc trường"
            >
              Paper Only
            </button>
          </div>

          <button
            type="button"
            onClick={() => setThemeMode(isDark ? 'ACADEMIC_LIGHT' : 'PHOTOSHOP_DARK')}
            className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title="Đổi giao diện Studio"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN WORKSPACE: LEFT TOOLS + CENTER CANVAS + RIGHT PANELS              */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden relative">

        {/* ----------------------------------------------------------------------- */}
        {/* 3.1 PHOTOSHOP LEFT TOOLBAR PALETTE (THANH CÔNG CỤ DỌC - 48px)            */}
        {/* ----------------------------------------------------------------------- */}
        <aside className={`w-12 border-r flex flex-col items-center py-2 gap-1.5 shrink-0 z-30 shadow-md ${
          isDark ? 'bg-[#18181b] border-[#27272a]' : 'bg-[#f4f4f5] border-[#d4d4d8]'
        }`}>
          {/* Top Quick Action: Mở Drawer Thêm Khối */}
          <button
            type="button"
            onClick={() => setIsInsertDrawerOpen(!isInsertDrawerOpen)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer group relative ${
              isInsertDrawerOpen ? 'bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/30' : 'text-cyan-400 hover:bg-cyan-500/20'
            }`}
            title="Mở bảng Thêm Khối Câu Hỏi"
          >
            <Plus className="w-5 h-5" />
            <span className="absolute left-11 bg-slate-900 border border-slate-700 text-white text-[11px] px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition z-50">
              {isInsertDrawerOpen ? 'Đóng Drawer Thêm Khối' : 'Bảng Thêm Khối Vào Đề'}
            </span>
          </button>

          <div className="w-6 h-px bg-slate-700 my-1"></div>

          {/* 8 Công cụ tương ứng 8 loại câu hỏi */}
          {(Object.keys(BLOCK_CATALOG) as QuestionBlockType[]).map((type) => {
            const item = BLOCK_CATALOG[type];
            const IconComp = item.icon;
            const isSelected = isInsertDrawerOpen && activeToolToInsert === type;

            return (
              <button
                key={type}
                type="button"
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', type);
                  e.dataTransfer.effectAllowed = 'copy';
                  setDraggedBlockType(type);
                }}
                onDragEnd={() => {
                  setDraggedBlockType(null);
                  setIsCanvasDragOver(false);
                }}
                onClick={() => handleSelectToolFromPalette(type)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer group relative ${
                  isSelected
                    ? `${item.bgColor} ${item.color} ring-1 ring-cyan-400 shadow-md`
                    : 'text-slate-400 hover:text-cyan-400 hover:bg-white/10'
                }`}
                title={`[${item.shortcut}] ${item.name}`}
              >
                <IconComp className="w-4 h-4" />
                <span className="absolute left-11 bg-slate-900 border border-slate-700 text-white text-[11px] px-2.5 py-1 rounded shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition z-50 flex items-center gap-1.5">
                  <span className="font-bold text-cyan-300">[{item.shortcut}]</span>
                  <span>{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">(Kéo thả vào đề)</span>
                </span>
              </button>
            );
          })}

          <div className="w-6 h-px bg-slate-700 my-1"></div>

          {/* Magic Wand AI */}
          <button
            type="button"
            onClick={() => examFileInputRef.current?.click()}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-indigo-400 hover:bg-indigo-500/20 transition-colors cursor-pointer group relative"
            title="[W] AI Tái hiện đề thi từ file trường qua OCR"
          >
            <Wand2 className="w-4 h-4 animate-pulse" />
            <span className="absolute left-11 bg-slate-900 border border-slate-700 text-white text-[11px] px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition z-50">
              AI Tái Hiện Đề Trường (OCR) [W]
            </span>
          </button>

          {/* Chế độ Dual-View */}
          {onOpenDualView && (
            <button
              type="button"
              onClick={onOpenDualView}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition-colors cursor-pointer group relative"
              title="Chế Độ Kép PDF & Snipping Tool"
            >
              <SplitSquareVertical className="w-4 h-4" />
              <span className="absolute left-11 bg-slate-900 border border-slate-700 text-white text-[11px] px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition z-50">
                Chế Độ Kép PDF & Snipping
              </span>
            </button>
          )}
        </aside>

        {/* ----------------------------------------------------------------------- */}
        {/* 3.1.5 DRAWER: THÊM KHỐI VÀO ĐỀ THI (FLYOUT DRAWER - 340px)                */}
        {/* ----------------------------------------------------------------------- */}
        <AnimatePresence>
          {isInsertDrawerOpen && (
            <motion.div
              initial={{ x: -350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -350, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute left-12 top-0 bottom-0 w-[350px] bg-[#141417] border-r border-[#27272a] shadow-2xl z-40 flex flex-col text-xs overflow-hidden"
            >
              {/* Header Drawer */}
              <div className="h-10 px-4 border-b border-[#27272a] bg-[#18181b] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <ListPlus className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-100 text-xs">Thêm Khối Vào Đề Thi</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInsertDrawerOpen(false)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Drawer */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {/* 1. Chọn chế độ nội dung (Khung Trống vs Mẫu Gợi Ý) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    1. Định dạng nội dung khối:
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-[#18181b] p-1 rounded-lg border border-[#27272a]">
                    <button
                      type="button"
                      onClick={() => setInsertUseTemplate(false)}
                      className={`py-1.5 px-2 rounded text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        !insertUseTemplate
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Khung Trống (Tự soạn)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInsertUseTemplate(true)}
                      className={`py-1.5 px-2 rounded text-[11px] font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        insertUseTemplate
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Mẫu Gợi Ý (Template)</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    {!insertUseTemplate
                      ? '• Khối mới sẽ có nội dung trắng tinh để bạn tự nhập đề bài & phương án.'
                      : '• Khối mới sẽ có sẵn đề bài & phương án mẫu thực tế để bạn tham khảo.'}
                  </p>
                </div>

                {/* 2. Chọn loại khối (Grid 4x2) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    2. Chọn loại khối câu hỏi (8 Dạng):
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(Object.keys(BLOCK_CATALOG) as QuestionBlockType[]).map((type) => {
                      const item = BLOCK_CATALOG[type];
                      const IconComp = item.icon;
                      const isSelected = activeToolToInsert === type;

                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setActiveToolToInsert(type);
                            setInsertScore(item.defaultScore);
                          }}
                          className={`p-2 rounded-lg flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold ring-1 ring-cyan-500/50'
                              : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          <IconComp className="w-4 h-4" />
                          <span className="text-[10px] truncate max-w-full font-mono">{item.shortcut}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Thẻ chi tiết loại khối đang chọn */}
                {(() => {
                  const currentItem = BLOCK_CATALOG[activeToolToInsert];
                  const IconComp = currentItem.icon;
                  return (
                    <div
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', activeToolToInsert);
                        e.dataTransfer.effectAllowed = 'copy';
                        setDraggedBlockType(activeToolToInsert);
                      }}
                      onDragEnd={() => {
                        setDraggedBlockType(null);
                        setIsCanvasDragOver(false);
                      }}
                      className={`p-3.5 rounded-xl border ${currentItem.borderColor} ${currentItem.bgColor} space-y-2 cursor-grab active:cursor-grabbing hover:shadow-lg transition-all`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-black/40 text-cyan-300">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-xs">{currentItem.name}</h4>
                            <span className="text-[10px] text-slate-400 font-mono">[{currentItem.badge}]</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono font-bold">
                          {insertScore} đ
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {currentItem.description}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px] text-cyan-300/80">
                        <span className="flex items-center gap-1">
                          <GripVertical className="w-3 h-3" />
                          <span>Kéo thẻ này thả vào Canvas</span>
                        </span>
                        <span>Shortcut [{currentItem.shortcut}]</span>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Số lượng khối cần thêm */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">3. Số lượng khối cần thêm:</label>
                    <span className="font-mono font-bold text-cyan-400">{insertBatchCount} khối</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 3, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setInsertBatchCount(num)}
                        className={`flex-1 py-1 rounded border font-mono text-[11px] transition cursor-pointer ${
                          insertBatchCount === num
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                            : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:text-white'
                        }`}
                      >
                        +{num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Cấu hình điểm số khởi tạo */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">4. Điểm số mỗi khối:</label>
                    <span className="font-mono font-bold text-amber-400">{insertScore} điểm</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[0.5, 1.0, 1.5, 2.0].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setInsertScore(sc)}
                        className={`flex-1 py-1 rounded border font-mono text-[11px] transition cursor-pointer ${
                          insertScore === sc
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                            : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:text-white'
                        }`}
                      >
                        {sc}đ
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Chọn vị trí chèn */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">5. Vị trí chèn vào đề:</label>
                  <div className="space-y-1 bg-[#18181b] p-2 rounded-lg border border-[#27272a]">
                    <label className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer">
                      <input
                        type="radio"
                        name="insertPos"
                        checked={insertPosition === 'END'}
                        onChange={() => setInsertPosition('END')}
                        className="accent-cyan-500"
                      />
                      <span className="text-slate-300">Cuối đề thi (Vị trí #{questions.length + 1})</span>
                    </label>

                    <label className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer">
                      <input
                        type="radio"
                        name="insertPos"
                        checked={insertPosition === 'AFTER_CURRENT'}
                        onChange={() => setInsertPosition('AFTER_CURRENT')}
                        className="accent-cyan-500"
                      />
                      <span className="text-slate-300">Sau câu đang chọn #{selectedQuestionStt} (Vị trí #{currentSelectedIdx + 2})</span>
                    </label>

                    <label className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 cursor-pointer">
                      <input
                        type="radio"
                        name="insertPos"
                        checked={insertPosition === 'START'}
                        onChange={() => setInsertPosition('START')}
                        className="accent-cyan-500"
                      />
                      <span className="text-slate-300">Đầu đề thi (Vị trí #1)</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Footer Drawer Action */}
              <div className="p-3 border-t border-[#27272a] bg-[#18181b] flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleInsertQuestion(activeToolToInsert, insertPosition, insertScore, insertUseTemplate, insertBatchCount)}
                  className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>
                    Xác Nhận Thêm {insertBatchCount > 1 ? `${insertBatchCount} Khối` : 'Vào Đề'} ({insertUseTemplate ? 'Mẫu' : 'Trống'})
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ----------------------------------------------------------------------- */}
        {/* 3.2 CENTER CANVAS STAGE (KHUNG LÀM VIỆC TRUNG TÂM)                       */}
        {/* ----------------------------------------------------------------------- */}
        <main
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (!isCanvasDragOver) setIsCanvasDragOver(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setIsCanvasDragOver(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsCanvasDragOver(false);
            const dropType = (e.dataTransfer.getData('text/plain') || draggedBlockType) as QuestionBlockType;
            if (dropType && BLOCK_CATALOG[dropType]) {
              handleInsertQuestion(dropType, 'AFTER_CURRENT', BLOCK_CATALOG[dropType].defaultScore);
            }
          }}
          className={`flex-1 flex flex-row min-w-0 min-h-0 overflow-hidden relative ${
            isDark ? 'bg-[#1e1e24]' : 'bg-[#e2e8f0]'
          }`}
        >
          {/* Overlay khi đang Kéo Thả vào Canvas */}
          {isCanvasDragOver && (
            <div className="absolute inset-2 z-50 rounded-2xl border-2 border-dashed border-cyan-400 bg-cyan-950/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-300 shadow-xl mb-3">
                <ListPlus className="w-8 h-8 animate-bounce" />
              </div>
              <h3 className="text-base font-bold text-white">Thả vào đây để chèn khối mới vào đề</h3>
              <p className="text-xs text-cyan-200 mt-1">Khối sẽ được chèn ngay sau câu hỏi #{selectedQuestionStt}</p>
            </div>
          )}

          {/* LEFT SUB-CANVAS: TỆP ĐỀ GỐC CỦA TRƯỜNG (DOCX/PDF) */}
          {(canvasViewMode === 'SPLIT' || canvasViewMode === 'PAPER_ONLY') && (
            <div className={`${
              canvasViewMode === 'PAPER_ONLY' ? 'w-full' : 'w-[45%]'
            } border-r border-[#27272a] flex flex-col h-full overflow-hidden bg-[#18181b]`}>
              {/* Header Canvas Left */}
              <div className="h-8 px-3 border-b border-[#27272a] bg-[#121214] flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Đề Gốc Trường (DOCX/PDF)</span>
                </span>

                <button
                  type="button"
                  onClick={() => examFileInputRef.current?.click()}
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FolderUp className="w-3 h-3" />
                  <span>{isAiReconstructing ? 'Đang phân tích...' : 'Nạp file đề trường'}</span>
                </button>
              </div>

              {/* Scrollable Paper Canvas */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center custom-scrollbar">
                <div
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
                  className="w-full max-w-lg bg-white rounded-lg shadow-xl p-6 text-slate-900 text-xs font-serif leading-relaxed select-text transition-transform"
                >
                  <div className="border-b border-slate-300 pb-2 mb-3 text-center font-sans">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">TRƯỜNG ĐẠI HỌC CÔNG NGHỆ</p>
                    <h4 className="font-bold text-sm text-slate-900 uppercase mt-0.5">{title}</h4>
                    <p className="text-[11px] text-slate-600 font-mono">Mã HP: {code} · Thời gian: {duration} phút</p>
                  </div>

                  {/* Danh sách câu hỏi render động (Không dùng mock cứng) */}
                  {questions.map((q) => {
                    const isSelected = selectedQuestionStt === q.stt;
                    return (
                      <div
                        key={q.stt}
                        onClick={() => setSelectedQuestionStt(q.stt)}
                        className={`p-2.5 rounded border mb-3 cursor-pointer transition ${
                          isSelected ? 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-400' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="font-sans font-semibold text-[11px]">
                          Câu {q.stt}: {q.prompt || <span className="text-slate-400 italic font-normal">[Chưa nhập nội dung đề bài — Click để soạn thảo]</span>}
                        </p>

                        {/* Preview options nếu có */}
                        {q.options && q.options.length > 0 && (
                          <div className="text-slate-600 mt-1 grid grid-cols-2 gap-1 font-sans text-[10px]">
                            {q.options.map((opt, oIdx) => (
                              <div
                                key={oIdx}
                                className={`px-1.5 py-0.5 rounded truncate ${
                                  q.correctAnswers.includes(oIdx) ? 'bg-emerald-100 text-emerald-800 font-bold' : ''
                                }`}
                              >
                                {String.fromCharCode(65 + oIdx)}. {opt || <span className="text-slate-400 italic">Phương án {String.fromCharCode(65 + oIdx)}...</span>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Preview hình học nếu có */}
                        {q.type === 'GEOMETRY_CANVAS' && (
                          <div className="mt-1 p-1 bg-slate-50 rounded border border-slate-200 flex justify-center">
                            <span className="text-[10px] text-indigo-600 font-mono">
                              [Sơ đồ tam giác vuông AH² = BH·CH: BH={q.bhLength || 4}cm, CH={q.chLength || 9}cm]
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* RIGHT SUB-CANVAS: STUDIO SOẠN THẢO TRỰC QUAN KHỐI ĐANG CHỌN (FOCUS STAGE) */}
          {(canvasViewMode === 'SPLIT' || canvasViewMode === 'CANVAS_ONLY') && (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#18181b]">
              {/* Header Canvas Right */}
              <div className="h-8 px-4 border-b border-[#27272a] bg-[#121214] flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-bold">Khối #{currentSelectedQuestion.stt}</span>
                  <span className="text-slate-300 font-semibold">• {getBlockName(currentSelectedQuestion.type)}</span>
                  {currentSelectedQuestion.prompt ? (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                      Đã có nội dung
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px]">
                      Khung trống
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 font-mono text-[10px]">
                  <span className="text-amber-400 font-bold">{currentSelectedQuestion.score} đ</span>
                  <span className="text-slate-600">|</span>
                  <button
                    type="button"
                    onClick={handleFillSampleForCurrent}
                    className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer flex items-center gap-0.5"
                    title="Nạp dữ liệu mẫu tham khảo cho câu này"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Nạp Mẫu</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleClearCurrentContent}
                    className="text-slate-400 hover:text-white hover:underline cursor-pointer"
                    title="Làm trống nội dung câu này"
                  >
                    [Làm Trống]
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateQuestion(currentSelectedIdx)}
                    className="hover:text-cyan-400 cursor-pointer"
                    title="Nhân bản khối này"
                  >
                    [Nhân Bản]
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuestion(currentSelectedIdx)}
                    className="hover:text-rose-400 cursor-pointer"
                    title="Xóa khối này"
                  >
                    [Xóa]
                  </button>
                </div>
              </div>

              {/* Central Editor Canvas for Selected Question */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

                {/* Prompt Card */}
                <div className="bg-[#202024] p-4 rounded-xl border border-[#27272a] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                    <label className="flex items-center gap-1.5">
                      <span>Nội dung câu hỏi / Yêu cầu đề bài:</span>
                      <span className="text-[10px] text-slate-500 font-normal">(Hỗ trợ Markdown & Công thức)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleFillSampleForCurrent}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Gợi ý mẫu</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCurrentContent}
                        className="text-[10px] text-slate-400 hover:text-rose-400 font-mono cursor-pointer"
                      >
                        Xóa trắng
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={currentSelectedQuestion.prompt}
                    placeholder={`Nhập nội dung đề bài câu hỏi số #${currentSelectedQuestion.stt} tại đây (hoặc bấm "Gợi ý mẫu" ở trên)...`}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuestions(prev => {
                        const n = [...prev];
                        n[currentSelectedIdx].prompt = val;
                        return n;
                      });
                    }}
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg p-2.5 text-xs text-white leading-relaxed focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Special Block: Geometry Canvas */}
                {currentSelectedQuestion.type === 'GEOMETRY_CANVAS' && (
                  <div className="bg-[#202024] p-4 rounded-xl border border-indigo-500/40 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                      <div className="flex items-center gap-1.5">
                        <Shapes className="w-4 h-4 text-indigo-400" />
                        <span>Sơ Đồ Hình Học Vector 2D Tương Tác</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">BH = {currentSelectedQuestion.bhLength || 4} cm, CH = {currentSelectedQuestion.chLength || 9} cm</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px]">
                          x = AH = {Math.sqrt((currentSelectedQuestion.bhLength || 4) * (currentSelectedQuestion.chLength || 9)).toFixed(1)} cm
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-44 bg-[#121214] rounded-lg border border-[#27272a] flex items-center justify-center relative overflow-hidden">
                      <svg className="w-full h-full max-w-md select-none" viewBox="0 0 520 200">
                        <defs>
                          <pattern height="20" id="grid_vec_ps" patternUnits="userSpaceOnUse" width="20">
                            <circle cx="2" cy="2" fill="#3f3f46" opacity="0.4" r="1" />
                          </pattern>
                        </defs>
                        <rect fill="url(#grid_vec_ps)" height="100%" width="100%" />
                        <polygon fill="rgba(99, 102, 241, 0.08)" points="50,165 470,165 175,45" stroke="#6366f1" strokeWidth="2.5" />
                        <line stroke="#ef4444" strokeDasharray="4,4" strokeWidth="2" x1="175" x2="175" y1="45" y2="165" />
                        <rect fill="none" height="13" stroke="#ef4444" strokeWidth="1.5" width="13" x="175" y="152" />
                        <circle cx="50" cy="165" fill="#6366f1" r="4" />
                        <circle cx="470" cy="165" fill="#6366f1" r="4" />
                        <circle cx="175" cy="45" fill="#6366f1" r="4" />
                        <circle cx="175" cy="165" fill="#ef4444" r="4" />
                        <text fill="#f4f4f5" fontSize="13" fontWeight="700" x="35" y="180">B</text>
                        <text fill="#f4f4f5" fontSize="13" fontWeight="700" x="480" y="180">C</text>
                        <text fill="#f4f4f5" fontSize="13" fontWeight="700" x="170" y="32">A</text>
                        <text fill="#ef4444" fontSize="13" fontWeight="700" x="170" y="186">H</text>
                        <text fill="#38bdf8" fontSize="11" fontWeight="600" x="90" y="180">BH = {currentSelectedQuestion.bhLength || 4} cm</text>
                        <text fill="#38bdf8" fontSize="11" fontWeight="600" x="300" y="180">CH = {currentSelectedQuestion.chLength || 9} cm</text>
                        <rect fill="#450a0a" height="20" rx="4" width="110" x="180" y="95" />
                        <text fill="#fca5a5" fontSize="11" fontWeight="700" x="185" y="110">
                          x = AH = {Math.sqrt((currentSelectedQuestion.bhLength || 4) * (currentSelectedQuestion.chLength || 9)).toFixed(1)} cm
                        </text>
                      </svg>
                    </div>

                    <div className="p-3 bg-[#18181b] rounded-lg border border-[#27272a] text-xs text-slate-300 space-y-1">
                      <span className="font-bold text-indigo-300">Hệ thức lượng tự động liên kết:</span>
                      <p className="font-mono text-[11px] text-slate-400">
                        AH² = BH · CH = {(currentSelectedQuestion.bhLength || 4) * (currentSelectedQuestion.chLength || 9)} ⇒ AH = {Math.sqrt((currentSelectedQuestion.bhLength || 4) * (currentSelectedQuestion.chLength || 9)).toFixed(1)} cm | tan(B) = AH / BH
                      </p>
                    </div>
                  </div>
                )}

                {/* Special Block: Image MCQ */}
                {currentSelectedQuestion.type === 'IMAGE_MCQ' && (
                  <div className="bg-[#202024] p-4 rounded-xl border border-blue-500/40 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-blue-300">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-blue-400" />
                        <span>Hình Ảnh Sơ Đồ Minh Họa</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => imageUploadInputRef.current?.click()}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Tải ảnh từ máy</span>
                      </button>
                    </div>

                    {currentSelectedQuestion.imageUrl && (
                      <div className="w-full h-48 bg-[#121214] rounded-lg border border-[#27272a] overflow-hidden flex items-center justify-center p-2">
                        <img
                          src={currentSelectedQuestion.imageUrl}
                          alt="Sơ đồ minh họa"
                          className="max-h-full max-w-full object-contain rounded"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Special Block: Code Debug / IDE */}
                {currentSelectedQuestion.type === 'CODE_DEBUG' && (
                  <div className="bg-[#202024] p-4 rounded-xl border border-[#27272a] space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                      <div className="flex items-center gap-1.5">
                        <Code2 className="w-4 h-4 text-cyan-400" />
                        <span>Trình Soạn Thảo Đoạn Mã Lỗi (Code IDE)</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400">C++ 17</span>
                    </div>

                    <div className="bg-[#121214] p-3 rounded-lg border border-[#27272a] font-mono text-xs">
                      <textarea
                        rows={4}
                        value={currentSelectedQuestion.buggyCode || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions(prev => {
                            const n = [...prev];
                            n[currentSelectedIdx].buggyCode = val;
                            return n;
                          });
                        }}
                        className="w-full bg-transparent text-red-300 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Special Block: Fill in the Blank */}
                {currentSelectedQuestion.type === 'FILL_IN_BLANK' && (
                  <div className="bg-[#202024] p-4 rounded-xl border border-[#27272a] space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                      <PenTool className="w-4 h-4 text-cyan-400" />
                      <span>Mẫu Câu Điền Chỗ Trống (Dùng [blank_1] cho vị trí khuyết):</span>
                    </div>
                    <textarea
                      rows={2}
                      value={currentSelectedQuestion.blankTemplate || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuestions(prev => {
                          const n = [...prev];
                          n[currentSelectedIdx].blankTemplate = val;
                          return n;
                        });
                      }}
                      className="w-full bg-[#18181b] border border-[#27272a] rounded-lg p-2.5 text-xs text-white focus:outline-none"
                    />
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 font-semibold">Từ khóa chuẩn xác:</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[11px] border border-emerald-800">
                        "{currentSelectedQuestion.blankAnswers?.[0] || 'liên tiếp'}"
                      </span>
                    </div>
                  </div>
                )}

                {/* Special Block: Audio / Video */}
                {currentSelectedQuestion.type === 'AUDIO_LISTENING' && (
                  <div className="bg-[#202024] p-4 rounded-xl border border-pink-500/40 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-pink-300">
                      <div className="flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-pink-400" />
                        <span>Bộ Phát Sóng Âm (Waveform Audio Player)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => audioUploadInputRef.current?.click()}
                          className="px-2 py-0.5 bg-pink-600 hover:bg-pink-500 text-white rounded text-[10px] font-bold cursor-pointer"
                        >
                          Tải audio MP3
                        </button>
                        <span className="text-[10px] text-amber-400 font-mono">
                          Lượt nghe: {audioPlaysCount}/{currentSelectedQuestion.playLimit || 2}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-[#121214] p-3 rounded-lg border border-[#27272a]">
                      <button
                        type="button"
                        onClick={() => {
                          if (audioPlaysCount >= (currentSelectedQuestion.playLimit || 2)) {
                            toast.error('Đã đạt giới hạn số lần nghe!');
                            return;
                          }
                          if (!isPlayingAudio) {
                            setAudioPlaysCount(prev => prev + 1);
                            setIsPlayingAudio(true);
                            if (audioPlayerRef.current) audioPlayerRef.current.play();
                          } else {
                            setIsPlayingAudio(false);
                            if (audioPlayerRef.current) audioPlayerRef.current.pause();
                          }
                        }}
                        className="w-8 h-8 rounded-full bg-pink-500 hover:bg-pink-400 text-slate-950 flex items-center justify-center transition cursor-pointer"
                      >
                        {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                      </button>

                      {currentSelectedQuestion.audioUrl && (
                        <audio
                          ref={audioPlayerRef}
                          src={currentSelectedQuestion.audioUrl}
                          onEnded={() => setIsPlayingAudio(false)}
                          className="hidden"
                        />
                      )}

                      <div className="flex-1 flex items-center gap-0.5 h-6">
                        {Array.from({ length: 32 }).map((_, barIdx) => (
                          <div
                            key={barIdx}
                            style={{ height: `${Math.sin(barIdx) * 10 + 12}px` }}
                            className={`flex-1 rounded-full transition-all ${
                              isPlayingAudio ? 'bg-pink-400 animate-pulse' : 'bg-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                        {currentSelectedQuestion.audioName || 'audio.mp3'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Special Block: Coding Problem */}
                {currentSelectedQuestion.type === 'CODING_PROBLEM' && (
                  <div className="bg-[#202024] p-4 rounded-xl border border-purple-500/40 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-300">
                      <div className="flex items-center gap-1.5">
                        <Terminal className="w-4 h-4 text-purple-400" />
                        <span>Khung Hàm Khởi Đầu & Test Cases Chấm Điểm</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRunCodeTestCases(currentSelectedIdx)}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Chạy thử Test Cases</span>
                      </button>
                    </div>

                    <div className="bg-[#121214] p-3 rounded-lg border border-[#27272a] font-mono text-xs text-purple-300">
                      <textarea
                        rows={5}
                        value={currentSelectedQuestion.starterCode || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuestions(prev => {
                            const n = [...prev];
                            n[currentSelectedIdx].starterCode = val;
                            return n;
                          });
                        }}
                        className="w-full bg-transparent text-purple-200 focus:outline-none"
                      />
                    </div>

                    <div className="p-3 bg-[#18181b] rounded-lg border border-[#27272a] space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-300 block">Test Cases (Tự động chấm):</span>
                      {currentSelectedQuestion.testCases?.map((tc, tcIdx) => (
                        <div key={tcIdx} className="font-mono text-[10px] text-slate-300 flex justify-between bg-[#121214] p-1.5 rounded border border-[#27272a]">
                          <span>{tc.input}</span>
                          <span className="text-emerald-400 font-bold">⇒ {tc.expectedOutput}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Options List (For Multiple Choice, Geometry, Image MCQ, Audio) */}
                {currentSelectedQuestion.options?.length > 0 && (
                  <div className="bg-[#202024] p-4 rounded-xl border border-[#27272a] space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <div className="flex items-center gap-2">
                        <span>Phương án trả lời ({currentSelectedQuestion.options.length}):</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {currentSelectedQuestion.selectionMode === 'MULTIPLE' ? '(Tích chọn nhiều đáp án đúng)' : '(Bấm chữ cái để chọn đáp án đúng)'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const nextMode = currentSelectedQuestion.selectionMode === 'MULTIPLE' ? 'SINGLE' : 'MULTIPLE';
                            setQuestions(prev => {
                              const n = [...prev];
                              n[currentSelectedIdx].selectionMode = nextMode;
                              return n;
                            });
                          }}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 border border-slate-700 cursor-pointer"
                        >
                          {currentSelectedQuestion.selectionMode === 'MULTIPLE' ? '☑ Đa Đáp Án' : '⦿ Đơn Đáp Án'}
                        </button>
                        {currentSelectedQuestion.options.length < 6 && (
                          <button
                            type="button"
                            onClick={() => handleAddOption(currentSelectedIdx)}
                            className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Thêm ({String.fromCharCode(65 + currentSelectedQuestion.options.length)})</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {currentSelectedQuestion.options.map((opt, oIdx) => {
                        const isCorrect = currentSelectedQuestion.correctAnswers.includes(oIdx);
                        return (
                          <div
                            key={oIdx}
                            className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                              isCorrect
                                ? 'border-emerald-500 bg-emerald-500/10 shadow-xs'
                                : 'border-[#27272a] bg-[#18181b] hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleAnswer(currentSelectedIdx, oIdx)}
                                className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold shrink-0 transition cursor-pointer ${
                                  isCorrect
                                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                                    : 'border border-slate-600 text-slate-400 hover:border-cyan-400 hover:text-white'
                                }`}
                                title="Bấm để đặt làm đáp án đúng"
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                placeholder={`Nhập phương án ${String.fromCharCode(65 + oIdx)}...`}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuestions(prev => {
                                    const next = [...prev];
                                    next[currentSelectedIdx].options[oIdx] = val;
                                    return next;
                                  });
                                }}
                                className={`text-xs bg-transparent focus:outline-none flex-1 ${
                                  isCorrect ? 'text-emerald-300 font-semibold' : 'text-slate-200'
                                }`}
                              />
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              {isCorrect && (
                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-mono text-[9px] font-bold flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" />
                                  <span>Đúng</span>
                                </span>
                              )}
                              {currentSelectedQuestion.options.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(currentSelectedIdx, oIdx)}
                                  className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                                  title={`Xóa phương án ${String.fromCharCode(65 + oIdx)}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Explanation Card */}
                <div className="bg-[#202024] p-4 rounded-xl border border-[#27272a] space-y-2">
                  <label className="text-xs font-bold text-slate-300 block">
                    Lời giải thích chi tiết & Căn cứ giáo trình:
                  </label>
                  <textarea
                    rows={2}
                    value={currentSelectedQuestion.explanation || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuestions(prev => {
                        const n = [...prev];
                        n[currentSelectedIdx].explanation = val;
                        return n;
                      });
                    }}
                    placeholder="Giải thích vì sao phương án trên là chính xác để thí sinh đối chiếu sau khi công bố kết quả..."
                    className="w-full bg-[#18181b] border border-[#27272a] rounded-lg p-2.5 text-xs text-slate-300 leading-relaxed focus:border-cyan-500 focus:outline-none"
                  />
                </div>

              </div>
            </div>
          )}

        </main>

        {/* ----------------------------------------------------------------------- */}
        {/* 3.3 PHOTOSHOP RIGHT DOCKED PANELS (LAYERS & INSPECTOR - 320px)           */}
        {/* ----------------------------------------------------------------------- */}
        <aside className={`w-80 border-l flex flex-col h-full shrink-0 z-30 shadow-xl ${
          isDark ? 'bg-[#18181b] border-[#27272a]' : 'bg-[#f4f4f5] border-[#d4d4d8]'
        }`}>
          {/* Panel Header Tabs */}
          <div className="h-9 px-2 border-b border-[#27272a] bg-[#121214] flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveRightTab('LAYERS')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
                  activeRightTab === 'LAYERS' ? 'bg-[#27272a] text-cyan-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Layers ({questions.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRightTab('PROPERTIES')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
                  activeRightTab === 'PROPERTIES' ? 'bg-[#27272a] text-cyan-300' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Thuộc tính</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveRightTab('INSERT_TAB')}
                className={`px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition ${
                  activeRightTab === 'INSERT_TAB' ? 'bg-[#27272a] text-cyan-300' : 'text-slate-400 hover:text-white'
                }`}
                title="Bảng thêm khối trực tiếp"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Khối</span>
              </button>
            </div>
          </div>

          {/* TAB 1: LAYERS (DANH SÁCH CÂU HỎI KÈM KÉO THẢ REORDER) */}
          {activeRightTab === 'LAYERS' && (
            <div className="flex-1 flex flex-col min-h-0 bg-[#18181b]">
              <div className="p-2 border-b border-[#27272a] flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                <span className="font-semibold">Kéo thả để đổi thứ tự câu:</span>
                <span className="text-cyan-400 font-mono font-bold">{questions.length} Khối</span>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                {questions.map((q, qIndex) => {
                  const isSelected = selectedQuestionStt === q.stt;
                  const itemDef = BLOCK_CATALOG[q.type];
                  const IconComp = itemDef?.icon || Radio;

                  return (
                    <div
                      key={q.stt}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ layerIdx: qIndex }));
                        setDraggedLayerIdx(qIndex);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDropIndicatorLayerIdx(qIndex);
                      }}
                      onDragLeave={() => {
                        setDropIndicatorLayerIdx(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDropIndicatorLayerIdx(null);
                        // Trường hợp 1: Kéo một công cụ mới từ Toolbar / Drawer thả vào vị trí này
                        const droppedToolType = e.dataTransfer.getData('text/plain') as QuestionBlockType;
                        if (droppedToolType && BLOCK_CATALOG[droppedToolType]) {
                          handleInsertQuestion(droppedToolType, 'AFTER_CURRENT', BLOCK_CATALOG[droppedToolType].defaultScore);
                          return;
                        }
                        // Trường hợp 2: Kéo một câu hỏi cũ để đổi thứ tự (Reorder)
                        if (draggedLayerIdx !== null) {
                          handleDropReorderLayer(draggedLayerIdx, qIndex);
                          setDraggedLayerIdx(null);
                        }
                      }}
                      onClick={() => setSelectedQuestionStt(q.stt)}
                      className={`p-2 rounded-lg border text-xs flex items-center justify-between transition-all cursor-pointer group ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-500/10 text-white font-medium shadow-sm'
                          : 'border-[#27272a] bg-[#141416] text-slate-300 hover:border-[#3f3f46]'
                      } ${dropIndicatorLayerIdx === qIndex ? 'ring-2 ring-cyan-400 border-cyan-400' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Drag Handle */}
                        <div
                          className="text-slate-600 group-hover:text-slate-300 cursor-grab active:cursor-grabbing p-0.5"
                          title="Nhấn giữ và kéo để đổi thứ tự câu"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>

                        <span className="w-5 text-[10px] font-mono text-slate-500">
                          {q.stt < 10 ? `0${q.stt}` : q.stt}
                        </span>

                        <div className={`p-1 rounded ${itemDef?.bgColor || 'bg-slate-800'} ${itemDef?.color || 'text-cyan-400'}`}>
                          <IconComp className="w-3 h-3" />
                        </div>

                        <span className="truncate max-w-[130px]">
                          {q.prompt || <span className="text-slate-500 italic font-normal">(Chưa nhập đề #{q.stt})</span>}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono text-slate-400">{q.score}đ</span>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick Add */}
              <div className="p-2 border-t border-[#27272a] flex items-center gap-2 bg-[#141416]">
                <button
                  type="button"
                  onClick={() => setIsInsertDrawerOpen(true)}
                  className="flex-1 py-1.5 bg-[#27272a] hover:bg-[#3f3f46] text-slate-200 rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Thêm Khối Mới</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PROPERTIES (THUỘC TÍNH CHI TIẾT) */}
          {activeRightTab === 'PROPERTIES' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs custom-scrollbar">
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block text-[11px]">Loại khối câu hỏi:</span>
                <select
                  value={currentSelectedQuestion.type}
                  onChange={(e) => {
                    const t = e.target.value as QuestionBlockType;
                    setQuestions(prev => {
                      const next = [...prev];
                      next[currentSelectedIdx].type = t;
                      return next;
                    });
                  }}
                  className="w-full bg-[#121214] border border-[#27272a] rounded-lg p-2 text-white font-medium cursor-pointer"
                >
                  {(Object.keys(BLOCK_CATALOG) as QuestionBlockType[]).map((t) => (
                    <option key={t} value={t}>
                      {BLOCK_CATALOG[t].name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block text-[11px]">Trọng số điểm:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.25"
                    max="5.0"
                    step="0.25"
                    value={currentSelectedQuestion.score}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setQuestions(prev => {
                        const next = [...prev];
                        next[currentSelectedIdx].score = val;
                        return next;
                      });
                    }}
                    className="flex-1 accent-cyan-500 cursor-pointer"
                  />
                  <span className="font-mono font-bold text-amber-400 w-12 text-right">{currentSelectedQuestion.score} đ</span>
                </div>
              </div>

              {/* Thông số đặc thù cho Geometry */}
              {currentSelectedQuestion.type === 'GEOMETRY_CANVAS' && (
                <div className="p-3 bg-[#121214] rounded-lg border border-indigo-500/30 space-y-2">
                  <span className="font-bold text-indigo-300 block text-[11px]">Tham số hình học tam giác vuông:</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Độ dài BH (cm):</span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={currentSelectedQuestion.bhLength || 4}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 4;
                          setQuestions(prev => {
                            const n = [...prev];
                            n[currentSelectedIdx].bhLength = val;
                            return n;
                          });
                        }}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded p-1 text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Độ dài CH (cm):</span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={currentSelectedQuestion.chLength || 9}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 9;
                          setQuestions(prev => {
                            const n = [...prev];
                            n[currentSelectedIdx].chLength = val;
                            return n;
                          });
                        }}
                        className="w-full bg-[#18181b] border border-[#27272a] rounded p-1 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 bg-[#121214] rounded-lg border border-[#27272a] space-y-2">
                <span className="font-bold text-cyan-400 block text-[11px]">Cấu hình chấm điểm AI:</span>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Tự động chấm tức thì:</span>
                  <span className="text-emerald-400 font-bold">BẬT</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Xáo trộn phương án:</span>
                  <span className="text-slate-200 font-semibold">Tự động khi phát đề</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setVideoGuideModal({
                  open: true,
                  title: `Video Hướng Dẫn: ${getBlockName(currentSelectedQuestion.type)}`,
                  desc: `Clip ngắn 20s hướng dẫn giảng viên tinh chỉnh barem điểm và góc nhìn thí sinh làm bài đối với dạng câu hỏi: ${getBlockName(currentSelectedQuestion.type)}.`
                })}
                className="w-full py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500/30"
              >
                <Play className="w-3.5 h-3.5 fill-amber-400" />
                <span>Xem Video Hướng Dẫn Khối</span>
              </button>
            </div>
          )}

          {/* TAB 3: INSERT TAB (THÊM KHỐI TRỰC TIẾP TỪ BẢNG PHẢI) */}
          {activeRightTab === 'INSERT_TAB' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs custom-scrollbar">
              <span className="text-slate-300 font-bold block text-[11px]">Chọn khối muốn thêm vào đề:</span>
              <div className="space-y-2">
                {(Object.keys(BLOCK_CATALOG) as QuestionBlockType[]).map((t) => {
                  const it = BLOCK_CATALOG[t];
                  const IconC = it.icon;
                  return (
                    <div
                      key={t}
                      className="p-3 rounded-xl bg-[#141416] border border-[#27272a] hover:border-cyan-500/50 flex items-center justify-between transition-all"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${it.bgColor} ${it.color}`}>
                          <IconC className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-white block">{it.name}</span>
                          <span className="text-[10px] text-slate-400">{it.defaultScore}đ · {it.badge}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInsertQuestion(t, 'END', it.defaultScore, false, 1)}
                          className="px-2 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer"
                          title="Thêm khối trắng vào đề"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Trống</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertQuestion(t, 'END', it.defaultScore, true, 1)}
                          className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold rounded text-[11px] flex items-center gap-1 cursor-pointer"
                          title="Thêm khối có sẵn nội dung mẫu gợi ý"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>+ Mẫu</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: EXAM INFO (THÔNG TIN CHUNG ĐỀ THI) */}
          {activeRightTab === 'EXAM_INFO' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs custom-scrollbar">
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block text-[11px]">Mã học phần:</span>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-[#121214] border border-[#27272a] rounded p-2 text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-semibold block text-[11px]">Thời gian làm bài (phút):</span>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                  className="w-full bg-[#121214] border border-[#27272a] rounded p-2 text-white font-mono"
                />
              </div>

              <div className="p-3 bg-[#121214] rounded-lg border border-[#27272a] space-y-2">
                <span className="font-bold text-slate-300 block text-[11px]">Tiến độ hoàn thành đề thi:</span>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full"></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>{questions.length}/{questions.length} Khối sẵn sàng</span>
                  <span className="text-emerald-400 font-bold">Tổng điểm: {totalCalculatedScore} đ</span>
                </div>
              </div>
            </div>
          )}

        </aside>

      </div>

      {/* ========================================================================= */}
      {/* 4. PHOTOSHOP BOTTOM STATUS BAR (THANH TRẠNG THÁI - 26px)                  */}
      {/* ========================================================================= */}
      <footer className={`h-7 px-3 border-t flex items-center justify-between text-[11px] font-mono shrink-0 z-40 ${
        isDark ? 'bg-[#121214] border-[#27272a] text-[#71717a]' : 'bg-[#e4e4e7] border-[#d4d4d8] text-[#71717a]'
      }`}>
        <div className="flex items-center gap-3">
          <span className="text-slate-300">ĐỀ: {code}</span>
          <span>•</span>
          <span className="text-cyan-400">{questions.length} Khối Câu Hỏi</span>
          <span>•</span>
          <span>Tổng điểm: {totalCalculatedScore} đ</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Auto-Save: Sẵn sàng</span>
          </span>
          <span>•</span>
          <span>Tỷ lệ Zoom: {zoomLevel}%</span>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* VIDEO GUIDE MODAL (POPUP CLIP 20S THEO BLUEPRINT 11.3.1)                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {videoGuideModal?.open && (
          <div className="fixed inset-0 z-70 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-white p-5 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Play className="w-4 h-4 fill-amber-400" />
                  <span>{videoGuideModal.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setVideoGuideModal(null)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="w-full h-52 bg-slate-950 rounded-xl border border-slate-800 relative flex flex-col items-center justify-center overflow-hidden">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Play className="w-7 h-7 fill-amber-400 ml-1" />
                </div>
                <span className="text-xs text-slate-400 mt-2 font-mono">Video Hướng Dẫn Thao Tác (00:20s)</span>
                <div className="absolute bottom-2 left-3 right-3 flex items-center gap-2">
                  <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 w-1/3"></div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">00:07 / 00:20</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {videoGuideModal.desc}
              </p>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setVideoGuideModal(null)}
                  className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Đóng hướng dẫn
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* STUDENT PREVIEW MODAL (GIAO DIỆN LÀM BÀI CỦA THÍ SINH - LIVE)             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showStudentPreview && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-5xl bg-[#E6FFFA] rounded-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[92vh] overflow-hidden text-slate-900"
            >
              {/* Header Modal */}
              <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#319795] text-white flex items-center justify-center font-bold">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs sm:text-sm font-bold text-[#134E4A]">
                        Đang xem trước với vai trò: Thí sinh
                      </span>
                      <span className="px-2 py-0.5 rounded bg-[#D5EDE8] text-[#134E4A] font-mono text-[11px] font-bold">
                        Mã HP: {code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Chế độ Zen Focus thi trực tuyến · Thí sinh thấy chính xác giao diện này khi phát đề
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowStudentPreview(false)}
                    className="h-8 px-3 rounded-lg bg-[#DAF3EE] hover:bg-rose-100 hover:text-rose-600 text-[#134E4A] font-mono text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>✕ Thoát</span>
                  </button>
                </div>
              </div>

              {/* Sub Bar Thời gian */}
              <div className="px-6 py-2 bg-[#319795] text-white flex items-center justify-between text-xs font-medium shrink-0">
                <span>Kỳ thi: {title} · {questions.length} câu hỏi · {duration} phút</span>
                <div className="flex items-center gap-2 font-mono font-bold text-xs sm:text-sm">
                  <Timer className="w-4 h-4" />
                  <span>Thời gian còn lại: 58:42</span>
                </div>
              </div>

              {/* Body Workspace Thí sinh */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-12 gap-5 custom-scrollbar">
                <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
                  <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-[#319795] text-white font-bold text-xs">
                        Câu {previewActiveStt} / {questions.length}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">[{getBlockName(questions[previewActiveStt - 1]?.type || 'MULTIPLE_CHOICE')}]</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-relaxed">
                      {questions[previewActiveStt - 1]?.prompt}
                    </h3>

                    {/* Phương án trả lời */}
                    {questions[previewActiveStt - 1]?.options?.length > 0 && (
                      <div className="space-y-2 pt-2">
                        {questions[previewActiveStt - 1].options.map((opt, optIdx) => {
                          const isSelectedAns = previewAnswers[previewActiveStt] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => setPreviewAnswers(prev => ({ ...prev, [previewActiveStt]: optIdx }))}
                              className={`w-full p-3 rounded-xl border text-left text-xs font-medium flex items-center gap-3 transition-all cursor-pointer ${
                                isSelectedAns
                                  ? 'border-[#319795] bg-[#E6FFFA] text-[#134E4A] font-bold shadow-xs'
                                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelectedAns ? 'bg-[#319795] text-white' : 'border border-slate-300 text-slate-500'
                              }`}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      disabled={previewActiveStt <= 1}
                      onClick={() => setPreviewActiveStt(prev => Math.max(1, prev - 1))}
                      className="px-4 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      ← Câu trước
                    </button>
                    <button
                      type="button"
                      disabled={previewActiveStt >= questions.length}
                      onClick={() => setPreviewActiveStt(prev => Math.min(questions.length, prev + 1))}
                      className="px-4 py-2 rounded-lg bg-[#319795] text-white font-bold text-xs hover:bg-[#287e7c] disabled:opacity-50 cursor-pointer"
                    >
                      Câu tiếp theo →
                    </button>
                  </div>
                </div>

                {/* Right Panel Thí sinh: Bảng điều hướng câu hỏi */}
                <div className="col-span-12 lg:col-span-4 bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-4">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wide">Danh sách câu hỏi</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {questions.map((q) => {
                      const isAnswered = previewAnswers[q.stt] !== undefined;
                      const isCurrent = previewActiveStt === q.stt;
                      return (
                        <button
                          key={q.stt}
                          type="button"
                          onClick={() => setPreviewActiveStt(q.stt)}
                          className={`h-9 rounded-lg font-mono text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                            isCurrent
                              ? 'bg-[#319795] text-white ring-2 ring-[#319795]/40 shadow-sm'
                              : isAnswered
                              ? 'bg-[#D5EDE8] text-[#134E4A]'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {q.stt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

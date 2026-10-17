import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Send,
  Save,
  User,
  Monitor,
  Maximize2,
  Minimize2,
  Loader2,
  Sparkles,
  HelpCircle,
  FileCheck2,
  Eye,
  AlertCircle,
  Zap,
  Volume2,
  VolumeX,
  Filter,
  Keyboard,
  RotateCcw,
  Check,
  Flame,
  Award,
  FileText,
  Columns,
  LayoutGrid,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  Download,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  CheckSquare
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '../../api/apiClient';

interface Question {
  stt: number;
  _id: string;
  type: 'MULTIPLE_CHOICE' | 'ESSAY' | 'CODING_PROBLEM';
  content: string;
  image?: string;
  score: number;
  options?: string[];
  minWords?: number;
  templateCode?: Record<string, string>;
  testCases?: Array<{ input: string; expectedOutput: string }>;
}

interface ExamData {
  examStudent: {
    id: string;
    candidateCode: string;
    seatRow: number;
    seatCol: number;
    trustScore: number;
    startedAt: string;
    extraTimeMinutes: number;
  };
  student: {
    id: string;
    name: string;
    studentCode: string;
    email: string;
  };
  session: {
    id: string;
    code: string;
    title: string;
    durationMinutes: number;
    roomCode: string;
    roomName: string;
  };
  examPaper?: {
    id: string;
    code: string;
    title: string;
    paperType: 'STRUCTURED_QUIZ' | 'FILE_ATTACHED';
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number;
    totalQuestions: number;
    submissionMode: string;
  };
  savedAnswers: Record<string, any>;
  questions: Question[];
}

export default function TakeExam() {
  const { sessionStudentId } = useParams<{ sessionStudentId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [trustScore, setTrustScore] = useState(100);
  const [timeLeft, setTimeLeft] = useState(3600); // seconds
  const [autoSaveTime, setAutoSaveTime] = useState<string>('Vừa mới đây');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Tính năng Chế độ làm bài: Chia đôi (File Đề thi & Phiếu tô OMR) hoặc Thẻ Quiz từng câu
  const [workspaceMode, setWorkspaceMode] = useState<'SPLIT_FILE' | 'QUIZ_CARDS'>('QUIZ_CARDS');
  const [fileZoom, setFileZoom] = useState<number>(100);
  const [isProctorCollapsed, setIsProctorCollapsed] = useState<boolean>(false);

  // Tính năng Quiz tương tác cao
  const [filterTab, setFilterTab] = useState<'ALL' | 'ANSWERED' | 'UNANSWERED' | 'FLAGGED'>('ALL');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Webcam & AI state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [aiLogs, setAiLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'warn' | 'success' }>>([
    { time: new Date().toLocaleTimeString('vi-VN'), text: 'Khởi động buồng thi Quiz bảo mật ExamGuard AI', type: 'info' },
    { time: new Date().toLocaleTimeString('vi-VN'), text: 'Đã kích hoạt camera & AI giám sát tư thế realtime', type: 'success' }
  ]);

  // Socket.IO & Proctor Warning & Suspended States
  const socketRef = useRef<Socket | null>(null);
  const [directWarning, setDirectWarning] = useState<{ message: string; timestamp: Date } | null>(null);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  // Bộ phát âm thanh tổng hợp (Web Audio API - không phụ thuộc file ngoài)
  const playQuizSound = (type: 'select' | 'flag' | 'warning' | 'finish') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'select') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.08); // G5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'flag') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'warning') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(174.61, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (_) {}
  };

  // 1. Tải đề thi đã lọc bảo mật
  useEffect(() => {
    async function fetchExam() {
      try {
        setLoading(true);
        const targetId = sessionStudentId || 'fallback_student';
        const res = await apiClient.get(`/api/exam/questions/${targetId}`);
        if (res.data && res.data.success) {
          const data: ExamData = res.data.data;
          setExamData(data);
          setAnswers(data.savedAnswers || {});
          setTrustScore(data.examStudent.trustScore || 100);

          // Tính thời gian còn lại
          const totalSec = (data.session.durationMinutes || 60) * 60;
          if (data.examStudent.startedAt) {
            const elapsed = Math.floor((Date.now() - new Date(data.examStudent.startedAt).getTime()) / 1000);
            setTimeLeft(Math.max(0, totalSec - elapsed));
          } else {
            setTimeLeft(totalSec);
          }

          // Tự động chuyển sang chế độ Chia đôi (Đề thi & Phiếu tô OMR) nếu là đề thi đính kèm tệp
          if (data.examPaper?.paperType === 'FILE_ATTACHED') {
            setWorkspaceMode('SPLIT_FILE');
          }
        }
      } catch (err: any) {
        console.error('Lỗi tải đề thi Quiz:', err);
        toast.error('Không thể tải bài thi. Đang kết nối lại...');
      } finally {
        setLoading(false);
      }
    }
    fetchExam();
  }, [sessionStudentId]);

  // 2. Khởi tạo Webcam
  useEffect(() => {
    let stream: MediaStream | null = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.warn('Không thể truy cập camera thực:', err);
        setCameraActive(false);
      }
    }
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Hàm phát hiện vi phạm trình duyệt và gửi lên server
  const triggerAntiCheatEvent = async (eventType: string, details: any = {}) => {
    if (!examData?.examStudent?.id) return;
    try {
      const res = await apiClient.post('/api/proctor/anti-cheat-event', {
        sessionStudentId: examData.examStudent.id,
        eventType,
        details
      });
      if (res.data?.success && !res.data.debounced) {
        if (res.data.trustScore !== undefined) {
          setTrustScore(res.data.trustScore);
        }
        playQuizSound('warning');
        toast.error(`CẢNH BÁO AN NINH: ${res.data.message} (-${res.data.penalty}đ)`, {
          duration: 5000,
          icon: '🚨'
        });
        setAiLogs(prev => [
          {
            time: new Date().toLocaleTimeString('vi-VN'),
            text: `${eventType}: ${res.data.message} (-${res.data.penalty}đ)`,
            type: 'warn'
          },
          ...prev.slice(0, 10)
        ]);
      }
    } catch (_) {}
  };

  // 3. Giám sát chống gian lận đa tầng: Tab switch, Chuột phải, Copy/Paste, DevTools F12
  useEffect(() => {
    if (!examData) return;

    // A. Chuyển tab / thu nhỏ trình duyệt
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerAntiCheatEvent('TAB_SWITCH', { action: 'hidden' });
      }
    };

    // B. Chặn chuột phải (Context Menu)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerAntiCheatEvent('RIGHT_CLICK', { x: e.clientX, y: e.clientY });
    };

    // C. Chặn Copy, Paste, Cut
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      triggerAntiCheatEvent('COPY_PASTE', { type: e.type });
    };

    // D. Chặn DevTools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, PrintScreen)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        (e.ctrlKey && ['u', 'U'].includes(e.key))
      ) {
        e.preventDefault();
        triggerAntiCheatEvent('DEVTOOLS_OPEN', { key: e.key });
      } else if (e.key === 'PrintScreen') {
        triggerAntiCheatEvent('FULLSCREEN_EXIT', { key: 'PrintScreen' });
        toast.error('CẢNH BÁO: Nghiêm cấm chụp màn hình bài thi!', { icon: '🚫' });
      }
    };

    // E. Thoát Fullscreen
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
        triggerAntiCheatEvent('FULLSCREEN_EXIT', { time: new Date() });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [examData, isFullscreen]);

  // 4. Gửi frame camera định kỳ lên server để phân tích AI (Adaptive Interval theo điểm uy tín)
  useEffect(() => {
    if (!cameraActive || !examData) return;

    // Tần suất thích ứng: uy tín < 70 -> 10s, < 90 -> 15s, >= 90 -> 20s
    const checkIntervalMs = trustScore >= 90 ? 20000 : trustScore >= 70 ? 15000 : 10000;

    const interval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 320, 240);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const formData = new FormData();
          formData.append('sessionStudentId', examData.examStudent.id);
          formData.append('frame', blob, 'frame.jpg');

          const res = await apiClient.post('/api/proctor/inspect-frame', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          if (res.data?.success) {
            if (res.data.trustScore !== undefined) {
              setTrustScore(res.data.trustScore);
            }
            if (res.data.detectedEvent && res.data.detectedEvent !== 'NORMAL') {
              const eventName = res.data.detectedEvent;
              const isStaff = res.data.isProctorPresence;
              const penalty = res.data.penalty || 0;

              if (penalty > 0) {
                playQuizSound('warning');
              }

              setAiLogs(prev => [
                {
                  time: new Date().toLocaleTimeString('vi-VN'),
                  text: isStaff
                    ? `Cán bộ ${res.data.proctorName || 'coi thi'} ghé bàn - Miễn trừ phạt`
                    : `AI phát hiện: ${eventName} (-${penalty}đ)`,
                  type: isStaff ? 'info' : 'warn'
                },
                ...prev.slice(0, 10)
              ]);
            }
          }
        } catch (_) {}
      }, 'image/jpeg', 0.6);
    }, checkIntervalMs);

    return () => clearInterval(interval);
  }, [cameraActive, examData, trustScore]);

  // 5. Kết nối Socket.IO thời gian thực để nhận cảnh báo từ Giám thị & gửi Heartbeat
  useEffect(() => {
    if (!examData) return;

    const socketUrl = window.location.origin;
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_session', {
        sessionId: examData.session.id,
        role: 'student',
        studentId: examData.student.id,
        candidateCode: examData.examStudent.candidateCode
      });
    });

    // Nhận cảnh báo trực tiếp từ Giám thị
    const warningChannel = `student:warning:${examData.student.id}`;
    socket.on(warningChannel, (data: any) => {
      playQuizSound('warning');
      setDirectWarning({
        message: data.message || 'Yêu cầu tập trung làm bài, nhìn thẳng vào màn hình!',
        timestamp: new Date(data.timestamp || Date.now())
      });
      if (data.newTrustScore !== undefined) {
        setTrustScore(data.newTrustScore);
      } else {
        setTrustScore(prev => Math.max(0, prev - (data.penalty || 5)));
      }
    });

    // Nhận thông báo cộng bù giờ
    socket.on('student:extra_time', (data: any) => {
      if (data.candidateCode === examData.examStudent.candidateCode) {
        setTimeLeft(prev => prev + (data.extraMinutes || 5) * 60);
        toast.success(`GIÁM THỊ ĐÃ CỘNG BÙ ${data.extraMinutes} PHÚT LÀM BÀI CHO BẠN!`, { duration: 6000 });
      }
    });

    // Nhận thông báo đình chỉ thi
    socket.on('student:suspended', (data: any) => {
      if (data.candidateCode === examData.examStudent.candidateCode) {
        setIsSuspended(true);
        setSuspendReason(data.reason || 'Vi phạm quy chế thi');
        toast.error('BẠN ĐÃ BỊ ĐÌNH CHỈ THI BỞI HỘI ĐỒNG COI THI!', { duration: 10000 });
      }
    });

    // Gửi Heartbeat định kỳ 10s cho giám thị
    const heartbeatInterval = setInterval(() => {
      socket.emit('student:heartbeat', {
        sessionId: examData.session.id,
        studentId: examData.student.id,
        candidateCode: examData.examStudent.candidateCode,
        currentQuestion: currentIdx + 1,
        trustScore
      });
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
  }, [examData, currentIdx, trustScore]);

  // 5. Bộ đếm ngược thời gian (Countdown)
  useEffect(() => {
    if (timeLeft <= 0) {
      handleFinalSubmit(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // 6. Auto-save mỗi 15 giây
  useEffect(() => {
    const autoSaveInterval = setInterval(async () => {
      if (!examData) return;
      try {
        await apiClient.post('/api/exam/save-progress', {
          sessionStudentId: examData.examStudent.id,
          answers
        });
        setAutoSaveTime(new Date().toLocaleTimeString('vi-VN'));
      } catch (_) {}
    }, 15000);

    return () => clearInterval(autoSaveInterval);
  }, [examData, answers]);

  // Xử lý chọn đáp án MCQ kèm tự động chuyển câu (Auto-advance)
  const handleSelectOption = (qId: string, optIdx: number, targetIdx?: number) => {
    playQuizSound('select');
    const qIndex = targetIdx !== undefined ? targetIdx : currentIdx;
    setAnswers(prev => ({
      ...prev,
      [qId]: optIdx,
      [qIndex]: optIdx
    }));

    if (workspaceMode === 'QUIZ_CARDS' && autoAdvance && examData && currentIdx < examData.questions.length - 1) {
      setTimeout(() => {
        setCurrentIdx(prev => Math.min((examData?.questions.length || 1) - 1, prev + 1));
      }, 350);
    }
  };

  // Xóa lựa chọn đáp án trắc nghiệm
  const handleClearOption = (qId: string, qIndex: number) => {
    setAnswers(prev => {
      const next = { ...prev };
      delete next[qId];
      delete next[qIndex];
      return next;
    });
  };

  // Xử lý nhập Tự luận hoặc Code
  const handleTextChange = (qId: string, val: string) => {
    setAnswers(prev => ({
      ...prev,
      [qId]: val,
      [currentIdx]: val
    }));
  };

  // Toggle đánh dấu cờ xem lại
  const toggleFlag = (idx: number) => {
    playQuizSound('flag');
    setFlagged(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Toggle Toàn màn hình
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Nộp bài thi chính thức
  const handleFinalSubmit = async (isTimeout = false) => {
    if (!examData || isSubmitting) return;
    setIsSubmitting(true);
    setShowSubmitModal(false);

    try {
      const res = await apiClient.post('/api/exam/submit', {
        sessionStudentId: examData.examStudent.id,
        answers
      });

      if (res.data && res.data.success) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        toast.success(isTimeout ? 'Hết giờ làm bài Quiz! Hệ thống đã tự động nộp bài.' : 'Hoàn thành bài Quiz thành công!');
        
        setTimeout(() => {
          navigate(`/exam-result/${examData.examStudent.id}`);
        }, 1200);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Có lỗi khi nộp bài Quiz. Vui lòng thử lại!');
      setIsSubmitting(false);
    }
  };

  // Phím tắt bàn phím làm Quiz (A, B, C, D, 1, 2, 3, 4, Mũi tên trái/phải, F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['TEXTAREA', 'INPUT'].includes((e.target as HTMLElement)?.tagName)) return;
      if (!examData || !examData.questions || examData.questions.length === 0) return;

      const currentQ = examData.questions[currentIdx];
      const key = e.key.toLowerCase();

      if (currentQ?.type === 'MULTIPLE_CHOICE' && currentQ.options) {
        if (key === 'a' || key === '1') {
          e.preventDefault();
          handleSelectOption(currentQ._id, 0);
        } else if (key === 'b' || key === '2') {
          e.preventDefault();
          handleSelectOption(currentQ._id, 1);
        } else if (key === 'c' || key === '3') {
          e.preventDefault();
          handleSelectOption(currentQ._id, 2);
        } else if (key === 'd' || key === '4') {
          e.preventDefault();
          handleSelectOption(currentQ._id, 3);
        }
      }

      if (key === 'arrowleft') {
        e.preventDefault();
        setCurrentIdx(prev => Math.max(0, prev - 1));
      } else if (key === 'arrowright') {
        e.preventDefault();
        setCurrentIdx(prev => Math.min(examData.questions.length - 1, prev + 1));
      } else if (key === 'f') {
        e.preventDefault();
        toggleFlag(currentIdx);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, examData, autoAdvance, soundEnabled]);

  // Format giờ phút giây
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Tính toán tiến độ & danh sách lọc câu hỏi
  const totalCount = examData?.questions?.length || 0;
  const answeredCount = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const filteredQuestionIndices = useMemo(() => {
    if (!examData) return [];
    return examData.questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => {
        const isAns = answers[q._id] !== undefined || answers[idx] !== undefined;
        const isFlag = !!flagged[idx];
        if (filterTab === 'ANSWERED') return isAns;
        if (filterTab === 'UNANSWERED') return !isAns;
        if (filterTab === 'FLAGGED') return isFlag;
        return true;
      })
      .map(({ idx }) => idx);
  }, [examData, answers, flagged, filterTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <Zap className="w-8 h-8 text-cyan-400 absolute inset-0 m-auto" />
        </div>
        <p className="mt-4 text-slate-300 font-medium">Đang tải phòng thi Quiz ExamGuard AI...</p>
        <span className="text-xs text-slate-500 mt-1">Đang mã hóa dữ liệu & nạp thuật toán chống gian lận</span>
      </div>
    );
  }

  if (!examData || !examData.questions || examData.questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
        <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
        <h2 className="text-2xl font-bold">Không tìm thấy dữ liệu ca thi Quiz</h2>
        <p className="text-slate-400 mt-2 text-center max-w-md">Vui lòng kiểm tra lại liên kết hoặc liên hệ Giám thị phòng thi để được xếp chỗ.</p>
        <button onClick={() => navigate('/')} className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition">
          Trở về Dashboard
        </button>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <div className="bg-slate-900 border border-rose-500/50 rounded-3xl p-8 max-w-lg w-full text-center space-y-4 shadow-2xl ring-1 ring-rose-500/30">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold text-rose-400">BÀI THI ĐÃ BỊ ĐÌNH CHỈ</h2>
          <p className="text-slate-300 text-sm">
            Tài khoản bài thi của bạn đã bị Giám thị khóa do vi phạm quy chế thi nghiêm trọng.
          </p>
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 font-mono">
            Lý do: <b className="text-rose-300">{suspendReason || 'Vi phạm an ninh phòng thi'}</b>
          </div>
          <p className="text-xs text-slate-500">
            Mọi thao tác làm bài đã bị đóng băng. Vui lòng rời khỏi phòng thi hoặc làm việc trực tiếp với Cán bộ coi thi.
          </p>
        </div>
      </div>
    );
  }

  const currentQ = examData.questions[currentIdx];
  const qId = currentQ._id;
  const currentVal = answers[qId] !== undefined ? answers[qId] : answers[currentIdx];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Hidden canvas for webcam frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── TOP HEADER ── */}
      <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-white tracking-wide text-sm">EXAMGUARD AI</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                <span>SECURE EXAM MODE</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xs">{examData.session.title}</p>
          </div>
        </div>

        {/* Chế độ làm bài Switcher (Đề thi & Phiếu OMR vs Thẻ Quiz) */}
        <div className="hidden lg:flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs shadow-inner">
          <button
            onClick={() => setWorkspaceMode('SPLIT_FILE')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium transition ${
              workspaceMode === 'SPLIT_FILE'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Chế độ Chia đôi: Xem File đề thi song song với Phiếu tô trắc nghiệm OMR"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Đề Thi & Phiếu OMR</span>
            {examData.examPaper?.paperType === 'FILE_ATTACHED' && (
              <span className="w-2 h-2 rounded-full bg-cyan-300 animate-pulse"></span>
            )}
          </button>
          <button
            onClick={() => setWorkspaceMode('QUIZ_CARDS')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg font-medium transition ${
              workspaceMode === 'QUIZ_CARDS'
                ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Chế độ Từng câu: Thẻ câu hỏi trắc nghiệm tương tác"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Thẻ Quiz Từng Câu</span>
          </button>
        </div>

        {/* Thanh tiến độ làm bài */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="text-right">
            <span className="text-xs text-slate-400">Tiến độ bài thi:</span>
            <span className="text-xs font-bold text-cyan-400 ml-1.5">{answeredCount}/{totalCount} câu ({progressPercent}%)</span>
          </div>
          <div className="w-36 lg:w-44 h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Nút công cụ & Nộp bài */}
        <div className="flex items-center space-x-2">
          {/* Nút bật tắt âm thanh */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition"
            title={soundEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Nút toàn màn hình */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition"
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Nút nộp bài */}
          <button
            onClick={() => setShowSubmitModal(true)}
            disabled={isSubmitting}
            className="flex items-center space-x-2 px-4 sm:px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>NỘP BÀI THI</span>
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 flex overflow-hidden">
        {workspaceMode === 'SPLIT_FILE' ? (
          /* ======================================================== */
          /* CHẾ ĐỘ 1: CHIA ĐÔI MÀN HÌNH (FILE ĐỀ THI & PHIẾU TÔ OMR) */
          /* ======================================================== */
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden border-r border-slate-800/80">
            {/* SUB-PANEL 1: KHUNG XEM TỆP ĐỀ THI (PDF / IMAGE / DOCUMENT) (60% WIDTH) */}
            <div className="flex-1 flex flex-col bg-slate-950/70 border-b lg:border-b-0 lg:border-r border-slate-800/80 overflow-hidden">
              {/* Top toolbar */}
              <div className="h-12 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs font-bold text-white truncate max-w-xs">
                    {examData.examPaper?.title || examData.session.title}
                  </span>
                  {examData.examPaper?.fileName && (
                    <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 truncate max-w-[140px]">
                      {examData.examPaper.fileName}
                    </span>
                  )}
                  {examData.examPaper?.fileSize ? (
                    <span className="hidden md:inline text-[10px] text-slate-500 font-mono">
                      ({(examData.examPaper.fileSize / 1024 / 1024).toFixed(1)} MB)
                    </span>
                  ) : null}
                </div>

                {/* Zoom controls & External link */}
                <div className="flex items-center space-x-1.5">
                  <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700/60 text-xs">
                    <button
                      onClick={() => setFileZoom(prev => Math.max(50, prev - 15))}
                      className="p-1 hover:text-white text-slate-400 rounded transition"
                      title="Thu nhỏ (-15%)"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 font-mono text-[11px] text-slate-300 font-bold min-w-[42px] text-center">
                      {fileZoom}%
                    </span>
                    <button
                      onClick={() => setFileZoom(prev => Math.min(250, prev + 15))}
                      className="p-1 hover:text-white text-slate-400 rounded transition"
                      title="Phóng to (+15%)"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setFileZoom(100)}
                      className="p-1 hover:text-white text-slate-400 rounded transition border-l border-slate-700/50"
                      title="Về cỡ gốc (100%)"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                  </div>

                  {examData.examPaper?.fileUrl && (
                    <a
                      href={examData.examPaper.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-cyan-400 bg-slate-800/80 hover:bg-slate-700 rounded-lg transition"
                      title="Mở file đề thi ở tab mới"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Main File Viewport with Security Anti-Cheat Watermark */}
              <div className="flex-1 relative overflow-auto bg-slate-950 flex flex-col items-center justify-start custom-scrollbar">
                {/* Anti-leak dynamic diagonal watermark */}
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden z-10 flex flex-wrap items-center justify-around gap-20 p-8 opacity-[0.06]">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="transform -rotate-25 font-mono text-sm font-black text-white tracking-widest whitespace-nowrap">
                      {examData.student.name} • SBD: {examData.examStudent.candidateCode} • KHÔNG CHỤP ĐỀ THI
                    </div>
                  ))}
                </div>

                {/* View content based on file type */}
                {examData.examPaper?.fileUrl ? (
                  (() => {
                    const ext = (examData.examPaper.fileName || examData.examPaper.fileUrl).split('.').pop()?.toLowerCase();
                    const isPdf = ext === 'pdf';
                    const isImg = ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '');

                    if (isPdf) {
                      return (
                        <div className="w-full h-full relative">
                          <iframe
                            src={`${examData.examPaper.fileUrl}#toolbar=0`}
                            className="w-full h-full border-0 select-none bg-slate-900"
                            title="Đề thi PDF"
                          />
                        </div>
                      );
                    }

                    if (isImg) {
                      return (
                        <div className="p-4 w-full flex justify-center">
                          <img
                            src={examData.examPaper.fileUrl}
                            alt="Đề thi"
                            style={{ transform: `scale(${fileZoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.15s ease-out' }}
                            className="max-w-full rounded-xl shadow-2xl border border-slate-800 select-none"
                          />
                        </div>
                      );
                    }

                    // Fallback for docx or other formats
                    return (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto">
                        <div className="w-16 h-16 rounded-3xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/10">
                          <FileText className="w-8 h-8" />
                        </div>
                        <h3 className="text-base font-bold text-white mb-1.5">{examData.examPaper.fileName || 'Tệp Đề Thi Đính Kèm'}</h3>
                        <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                          Đề thi được Giảng viên đính kèm dưới dạng tài liệu (.{ext}). Bạn có thể tải hoặc mở tệp trên máy để xem chi tiết, sau đó tô đáp án vào Phiếu Trả Lời ở cột bên phải.
                        </p>
                        <a
                          href={examData.examPaper.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition active:scale-95"
                        >
                          <Download className="w-4 h-4" />
                          <span>Tải / Mở Tệp Đề Thi</span>
                        </a>
                      </div>
                    );
                  })()
                ) : (
                  // Continuous Structured Question Sheet
                  <div className="p-6 max-w-3xl w-full space-y-6">
                    <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                      <span>Đang hiển thị đề thi dạng văn bản liên tục. Thí sinh đọc đề bên trái và tô đáp án ở phiếu bên phải.</span>
                      <span className="font-bold text-cyan-400">{examData.questions.length} câu</span>
                    </div>
                    {examData.questions.map((q, idx) => (
                      <div
                        key={q._id || idx}
                        onClick={() => setCurrentIdx(idx)}
                        className={`p-5 rounded-2xl border transition-all ${
                          currentIdx === idx
                            ? 'bg-slate-900/90 border-cyan-500/60 ring-1 ring-cyan-500/30 shadow-lg'
                            : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-cyan-400">Câu {idx + 1} ({q.score} điểm)</span>
                          {flagged[idx] && <Bookmark className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                        </div>
                        <div className="text-sm text-slate-200 font-medium whitespace-pre-line mb-3">
                          {q.content}
                        </div>
                        {q.type === 'MULTIPLE_CHOICE' && q.options && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {q.options.map((opt, optIdx) => {
                              const letter = String.fromCharCode(65 + optIdx);
                              const isSelected = (answers[q._id] !== undefined ? answers[q._id] : answers[idx]) === optIdx;
                              return (
                                <div
                                  key={optIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectOption(q._id, optIdx, idx);
                                  }}
                                  className={`p-2.5 rounded-xl border flex items-center space-x-2 cursor-pointer transition ${
                                    isSelected
                                      ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-200 font-semibold'
                                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                  }`}
                                >
                                  <span className={`w-6 h-6 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                    isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {letter}
                                  </span>
                                  <span className="truncate">{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SUB-PANEL 2: PHIẾU TRẢ LỜI TRẮC NGHIỆM ĐIỆN TỬ (DIGITAL OMR ANSWER SHEET) (40% WIDTH) */}
            <div className="w-full lg:w-96 xl:w-[420px] shrink-0 flex flex-col bg-slate-900/80 overflow-hidden border-t lg:border-t-0">
              {/* OMR Header & Controls */}
              <div className="p-4 bg-slate-900 border-b border-slate-800 space-y-3 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white tracking-wide uppercase">PHIẾU TÔ TRẮC NGHIỆM</h3>
                      <p className="text-[10px] text-slate-400">Tự động chấm • Lưu realtime</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                    SBD: {examData.examStudent.candidateCode}
                  </span>
                </div>

                {/* Mini progress */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Tiến độ bài thi:</span>
                    <span className="font-bold text-emerald-400">{answeredCount} / {totalCount} câu ({progressPercent}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Filter mini tabs */}
                <div className="flex items-center space-x-1 text-[11px]">
                  <button
                    onClick={() => setFilterTab('ALL')}
                    className={`flex-1 py-1 rounded-md text-center font-medium transition ${
                      filterTab === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Tất cả ({totalCount})
                  </button>
                  <button
                    onClick={() => setFilterTab('UNANSWERED')}
                    className={`flex-1 py-1 rounded-md text-center font-medium transition ${
                      filterTab === 'UNANSWERED' ? 'bg-slate-700 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Chưa tô ({totalCount - answeredCount})
                  </button>
                  <button
                    onClick={() => setFilterTab('FLAGGED')}
                    className={`flex-1 py-1 rounded-md text-center font-medium transition ${
                      filterTab === 'FLAGGED' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Cần xem ({Object.values(flagged).filter(Boolean).length})
                  </button>
                </div>

                {/* Quick jump pills */}
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar pt-1">
                  {examData.questions.map((q, idx) => {
                    const isAns = answers[q._id] !== undefined || answers[idx] !== undefined;
                    const isFlag = flagged[idx];
                    const isCur = currentIdx === idx;
                    let pillClass = 'bg-slate-800 text-slate-400 hover:bg-slate-700';
                    if (isCur) pillClass = 'bg-cyan-500 text-slate-950 font-bold ring-1 ring-cyan-300';
                    else if (isFlag) pillClass = 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold';
                    else if (isAns) pillClass = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold';

                    return (
                      <button
                        key={q._id || idx}
                        onClick={() => setCurrentIdx(idx)}
                        className={`w-7 h-7 rounded-lg text-[10px] flex items-center justify-center transition-all ${pillClass}`}
                        title={`Nhảy tới Câu ${idx + 1}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* OMR Question Rows List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
                {examData.questions.map((q, idx) => {
                  if (filterTab !== 'ALL' && !filteredQuestionIndices.includes(idx)) return null;

                  const qVal = answers[q._id] !== undefined ? answers[q._id] : answers[idx];
                  const isAns = qVal !== undefined && qVal !== null && qVal !== '';
                  const isFlag = !!flagged[idx];
                  const isCur = currentIdx === idx;

                  return (
                    <div
                      key={q._id || idx}
                      onClick={() => setCurrentIdx(idx)}
                      className={`p-3 rounded-2xl border transition-all ${
                        isCur
                          ? 'bg-slate-950 border-cyan-500/70 ring-1 ring-cyan-500/40 shadow-lg'
                          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isCur ? 'bg-cyan-500 text-slate-950' : isAns ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-slate-200">
                            Câu {idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-500">({q.score}đ)</span>
                        </div>

                        <div className="flex items-center space-x-1.5">
                          {/* Flag button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFlag(idx);
                            }}
                            className={`p-1.5 rounded-lg text-[11px] transition ${
                              isFlag ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'
                            }`}
                            title={isFlag ? 'Bỏ đánh dấu' : 'Đánh dấu xem lại'}
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${isFlag ? 'fill-amber-400' : ''}`} />
                          </button>

                          {/* Clear answer button */}
                          {isAns && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClearOption(q._id, idx);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                              title="Bỏ tô câu này"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 4 OMR Bubble buttons */}
                      {q.type === 'MULTIPLE_CHOICE' ? (
                        <div className="grid grid-cols-4 gap-2 pt-1">
                          {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                            const isSelected = Number(qVal) === optIdx;
                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSelectOption(q._id, optIdx, idx);
                                }}
                                className={`h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/30 ring-2 ring-cyan-400 scale-[1.03]'
                                    : 'bg-slate-800/80 border border-slate-700/70 text-slate-300 hover:border-cyan-400 hover:bg-slate-700 hover:text-white'
                                }`}
                              >
                                {letter}
                              </button>
                            );
                          })}
                        </div>
                      ) : q.type === 'ESSAY' ? (
                        <div className="pt-1">
                          <textarea
                            rows={2}
                            value={qVal || ''}
                            onChange={(e) => handleTextChange(q._id, e.target.value)}
                            placeholder="Nhập câu trả lời tự luận..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                          ></textarea>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 italic py-1">
                          Câu hỏi lập trình - chuyển sang Thẻ Quiz để chạy code.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* OMR Footer sticky */}
              <div className="p-3.5 bg-slate-900 border-t border-slate-800 shrink-0 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center space-x-1">
                    <Save className="w-3 h-3 text-emerald-400" />
                    <span>Tự động lưu: <b className="text-slate-300">{autoSaveTime}</b></span>
                  </span>
                  <span className="text-cyan-400 font-medium">Mã ca: {examData.session.code}</span>
                </div>

                <button
                  onClick={() => setShowSubmitModal(true)}
                  disabled={isSubmitting}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>NỘP BÀI THI CHÍNH THỨC</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* CHẾ ĐỘ 2: THẺ CÂU HỎI QUIZ TƯƠNG TÁC (QUIZ CARDS)       */
          /* ======================================================== */
          <div className="flex-1 flex flex-col bg-slate-900/50 overflow-y-auto custom-scrollbar border-r border-slate-800/80">
            {/* Top Bar: Bộ lọc câu hỏi & Cài đặt Quiz */}
            <div className="p-4 bg-slate-900/60 border-b border-slate-800/70 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Tab lọc câu hỏi */}
                <div className="flex items-center space-x-1.5 text-xs">
                  <button
                    onClick={() => setFilterTab('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      filterTab === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Tất cả ({totalCount})
                  </button>
                  <button
                    onClick={() => setFilterTab('ANSWERED')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      filterTab === 'ANSWERED' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Đã làm ({answeredCount})
                  </button>
                  <button
                    onClick={() => setFilterTab('UNANSWERED')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      filterTab === 'UNANSWERED' ? 'bg-slate-700 text-white font-bold' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Chưa làm ({totalCount - answeredCount})
                  </button>
                  <button
                    onClick={() => setFilterTab('FLAGGED')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center space-x-1 ${
                      filterTab === 'FLAGGED' ? 'bg-amber-500 text-slate-950 font-bold shadow' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Bookmark className="w-3 h-3" />
                    <span>Cần xem lại ({Object.values(flagged).filter(Boolean).length})</span>
                  </button>
                </div>

                {/* Tùy chọn Auto-advance */}
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoAdvance}
                      onChange={e => setAutoAdvance(e.target.checked)}
                      className="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <span>Tự động qua câu tiếp theo</span>
                  </label>
                </div>
              </div>

              {/* Navigation Pill Grid */}
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar pt-1">
                {examData.questions.map((q, idx) => {
                  if (filterTab !== 'ALL' && !filteredQuestionIndices.includes(idx)) return null;

                  const isAns = answers[q._id] !== undefined || answers[idx] !== undefined;
                  const isFlag = flagged[idx];
                  const isCur = currentIdx === idx;

                  let btnClass = 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700';
                  if (isCur) {
                    btnClass = 'ring-2 ring-cyan-400 bg-cyan-500/20 text-cyan-300 font-bold border-cyan-500/50 shadow-md shadow-cyan-500/20';
                  } else if (isFlag) {
                    btnClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold';
                  } else if (isAns) {
                    btnClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold';
                  }

                  return (
                    <button
                      key={q._id || idx}
                      onClick={() => setCurrentIdx(idx)}
                      className={`w-9 h-9 rounded-xl border text-xs flex items-center justify-center transition-all ${btnClass}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Khu vực Thẻ Câu hỏi Quiz (Interactive Quiz Card) */}
            <div className="flex-1 p-6 flex flex-col justify-between">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                {/* Header Thẻ câu hỏi */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <span className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-600/20 to-indigo-600/20 border border-cyan-500/30 text-cyan-300 text-xs font-bold rounded-xl flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span>CÂU HỎI {currentIdx + 1} / {totalCount}</span>
                    </span>
                    <span className="text-xs text-slate-400 font-medium">({currentQ.score} điểm)</span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider">
                      {currentQ.type === 'MULTIPLE_CHOICE' ? '• Trắc nghiệm Quiz' : currentQ.type === 'ESSAY' ? '• Tự luận ngắn' : '• Lập trình'}
                    </span>
                  </div>

                  <button
                    onClick={() => toggleFlag(currentIdx)}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs transition border ${
                      flagged[currentIdx]
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{flagged[currentIdx] ? 'Đã gắn cờ xem lại' : 'Gắn cờ câu này'}</span>
                  </button>
                </div>

                {/* Nội dung câu hỏi */}
                <div className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed whitespace-pre-line">
                  {currentQ.content}
                </div>

                {/* Danh sách Lựa chọn Trắc nghiệm (Interactive Option Cards) */}
                {currentQ.type === 'MULTIPLE_CHOICE' && currentQ.options && (
                  <div className="grid grid-cols-1 gap-3.5 pt-2">
                    {currentQ.options.map((opt, optIdx) => {
                      const isSelected = Number(currentVal) === optIdx;
                      const letter = String.fromCharCode(65 + optIdx); // A, B, C, D

                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleSelectOption(qId, optIdx)}
                          className={`flex items-center p-4 rounded-2xl border transition-all cursor-pointer group ${
                            isSelected
                              ? 'bg-gradient-to-r from-cyan-950/60 to-slate-900 border-cyan-500 ring-2 ring-cyan-500/50 text-white shadow-xl shadow-cyan-950/50 scale-[1.01]'
                              : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700'
                          }`}
                        >
                          {/* Option badge with hotkey hint */}
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs mr-4 transition-all ${
                              isSelected
                                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                                : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                            }`}
                          >
                            {letter}
                          </div>

                          {/* Option text */}
                          <span className="flex-1 text-sm sm:text-base leading-relaxed font-normal">{opt}</span>

                          {/* Selected indicator */}
                          {isSelected ? (
                            <div className="w-6 h-6 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center animate-in zoom-in-75">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-mono hidden sm:inline-block">Phím [{letter}]</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tự luận */}
                {currentQ.type === 'ESSAY' && (
                  <div className="mt-4">
                    <textarea
                      rows={6}
                      value={currentVal || ''}
                      onChange={e => handleTextChange(qId, e.target.value)}
                      placeholder="Nhập câu trả lời tự luận của bạn tại đây..."
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 resize-none font-sans"
                    ></textarea>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mt-2 px-1">
                      <span>Số từ tối thiểu: {currentQ.minWords || 0} từ</span>
                      <span>Số ký tự: {(currentVal || '').length}</span>
                    </div>
                  </div>
                )}

                {/* Coding Problem */}
                {currentQ.type === 'CODING_PROBLEM' && (
                  <div className="mt-4">
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden font-mono text-xs">
                      <div className="bg-slate-800/60 px-4 py-2.5 text-slate-400 flex items-center justify-between border-b border-slate-800">
                        <span>Code Sandbox (C / C++)</span>
                        <span className="text-[10px] text-cyan-400">ExamGuard Engine</span>
                      </div>
                      <textarea
                        rows={8}
                        value={currentVal || currentQ.templateCode?.c || ''}
                        onChange={e => handleTextChange(qId, e.target.value)}
                        className="w-full bg-transparent p-4 text-cyan-300 font-mono text-xs focus:outline-none resize-none leading-relaxed"
                      ></textarea>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Bar: Nút chuyển câu & Tự động lưu */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 border-t border-slate-800/60 mt-4">
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Đã lưu đám mây: <b className="text-slate-400">{autoSaveTime}</b></span>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                    className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Câu trước (←)</span>
                  </button>
                  <button
                    disabled={currentIdx === totalCount - 1}
                    onClick={() => setCurrentIdx(prev => Math.min(totalCount - 1, prev + 1))}
                    className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-cyan-600/20 transition"
                  >
                    <span>Câu tiếp theo (→)</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PANEL PHẢI: KHU VỰC CAMERA & GIÁM SÁT AI (COLLAPSIBLE)   */}
        {/* ======================================================== */}
        <div className={`${
          isProctorCollapsed ? 'w-16' : 'w-80 md:w-88'
        } bg-slate-900/90 border-l border-slate-800 p-3 sm:p-4 flex flex-col justify-between overflow-y-auto custom-scrollbar transition-all duration-300 shrink-0`}>
          {isProctorCollapsed ? (
            /* COLLAPSED HUD VIEW */
            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={() => setIsProctorCollapsed(false)}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 flex items-center justify-center transition"
                title="Mở rộng bảng Giám sát AI"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Mini camera */}
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-500/50 relative bg-slate-950" title="Webcam giám sát đang hoạt động">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute top-1 right-1"></span>
              </div>

              {/* Mini Timer */}
              <div className="flex flex-col items-center py-2 text-center" title="Thời gian còn lại">
                <Clock className="w-4 h-4 text-cyan-400 mb-1" />
                <span className="font-mono text-[10px] font-bold text-slate-200">
                  {Math.floor(timeLeft / 60)}p
                </span>
              </div>

              {/* Mini Trust score */}
              <div className="flex flex-col items-center py-2 text-center" title="Điểm uy tín">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
                <span className={`font-mono text-[10px] font-bold ${
                  trustScore >= 80 ? 'text-emerald-400' : trustScore >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}>
                  {trustScore}
                </span>
              </div>
            </div>
          ) : (
            /* FULL EXPANDED PROCTOR HUD */
            <div className="space-y-4">
              {/* Header with collapse button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-white uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>GIÁM SÁT AI REALTIME</span>
                </div>
                <button
                  onClick={() => setIsProctorCollapsed(true)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                  title="Thu gọn bảng giám sát"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 1. KHUNG CAMERA LIVE & HUD AI OVERLAY */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-slate-950 aspect-video shadow-2xl group">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-400 p-4 text-center">
                    <Camera className="w-8 h-8 mb-2 text-slate-600 animate-pulse" />
                    <span className="text-xs">Đang nạp Webcam giám sát...</span>
                  </div>
                )}

                {/* HUD Overlay elements */}
                <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-full border border-slate-700/60 text-[10px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="font-semibold text-emerald-400 uppercase tracking-wider">AI PROCTORING</span>
                </div>

                <div className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono">
                  30 FPS
                </div>

                {/* Bounding box giả lập AI nhận diện mắt/mặt */}
                <div className="absolute inset-x-12 inset-y-5 border border-cyan-400/30 rounded-2xl pointer-events-none">
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400"></div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400"></div>
                </div>

                {/* Footer thanh camera */}
                <div className="absolute bottom-2 inset-x-2 bg-slate-900/85 backdrop-blur px-3 py-1.5 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium truncate max-w-[120px]">{examData.student.name}</span>
                  <span className="text-cyan-400 font-mono font-bold">SBD: {examData.examStudent.candidateCode}</span>
                </div>
              </div>

              {/* 2. ĐỒNG HỒ ĐẾM NGƯỢC (COUNTDOWN TIMER) */}
              <div className={`p-4 rounded-2xl border text-center transition-all ${
                timeLeft < 300
                  ? 'bg-red-500/10 border-red-500/40 animate-pulse text-red-400'
                  : timeLeft < 900
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-100'
              }`}>
                <div className="flex items-center justify-center space-x-1.5 text-xs text-slate-400 mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="uppercase tracking-wider font-semibold">Thời gian còn lại</span>
                </div>
                <div className="font-mono text-3xl font-extrabold tracking-wider">
                  {formatTime(timeLeft)}
                </div>
              </div>

              {/* 3. ĐIỂM UY TÍN REALTIME (TRUST SCORE METER) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Điểm uy tín:</span>
                  </span>
                  <span className={`font-mono font-bold text-sm ${
                    trustScore >= 80 ? 'text-emerald-400' : trustScore >= 50 ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {trustScore} / 100
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      trustScore >= 80 ? 'bg-emerald-500' : trustScore >= 50 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${trustScore}%` }}
                  ></div>
                </div>

                <p className="text-[11px] text-slate-400 mt-2">
                  {trustScore >= 80
                    ? 'Mức độ tin cậy: Xuất sắc'
                    : trustScore >= 50
                    ? 'Cảnh báo: Có dấu hiệu quay đầu/mất tập trung'
                    : 'Nguy cơ đình chỉ: Điểm uy tín quá thấp'}
                </p>
              </div>

              {/* 4. THÔNG TIN THÍ SINH & CA THI */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 text-xs space-y-1.5">
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Môn thi:</span>
                  <span className="text-slate-200 font-medium truncate max-w-[150px]">{examData.session.title}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/60">
                  <span className="text-slate-500">Vị trí ngồi:</span>
                  <span className="text-cyan-400 font-bold">
                    {examData.session.roomCode} — Dãy {examData.examStudent.seatRow}, Cột {examData.examStudent.seatCol}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Mã sinh viên:</span>
                  <span className="text-slate-200 font-mono">{examData.student.studentCode}</span>
                </div>
              </div>

              {/* 5. LIVE NOTIFICATION FEED */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center space-x-1">
                  <Eye className="w-3 h-3 text-cyan-400" />
                  <span>Nhật ký giám sát AI:</span>
                </div>
                <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar text-[10px]">
                  {aiLogs.map((log, i) => (
                    <div key={i} className="flex items-start space-x-1.5 text-slate-400">
                      <span className="font-mono text-slate-600">{log.time}</span>
                      <span className={log.type === 'warn' ? 'text-amber-400' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'}>
                        {log.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="text-[10px] text-slate-600 text-center pt-2">
            ExamGuard AI • Mã phiên: {examData.session.code}
          </div>
        </div>
      </div>

      {/* ── MODAL XÁC NHẬN NỘP BÀI QUIZ ── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <FileCheck2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-center text-white">Xác nhận Nộp Bài Quiz?</h3>
            <p className="text-xs text-slate-400 text-center mt-1">
              Hệ thống ExamGuard AI sẽ tự động chấm điểm bài làm của bạn ngay tức thì.
            </p>

            <div className="bg-slate-950 rounded-2xl p-4 my-4 space-y-2 text-xs border border-slate-800/80">
              <div className="flex justify-between">
                <span className="text-slate-400">Số câu đã hoàn thành:</span>
                <span className="font-bold text-emerald-400">{answeredCount} / {totalCount} câu</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Số câu còn trống:</span>
                <span className="font-bold text-amber-400">{totalCount - answeredCount} câu</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Số câu đánh dấu cờ:</span>
                <span className="font-bold text-amber-300">{Object.values(flagged).filter(Boolean).length} câu</span>
              </div>
              <div className="flex justify-between border-t border-slate-800/60 pt-2">
                <span className="text-slate-400">Điểm uy tín ghi nhận:</span>
                <span className="font-bold text-cyan-400">{trustScore} / 100</span>
              </div>
            </div>

            {totalCount - answeredCount > 0 && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300 flex items-start space-x-2 mb-4">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Bạn vẫn còn <b>{totalCount - answeredCount} câu chưa làm</b>. Các câu chưa trả lời sẽ tính 0 điểm nếu nộp bài ngay!</span>
              </div>
            )}

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition"
              >
                Tiếp tục làm bài
              </button>
              <button
                onClick={() => handleFinalSubmit(false)}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition"
              >
                Đồng ý nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── MODAL CẢNH BÁO TRỰC TIẾP TỪ GIÁM THỊ (SOCKET.IO) ── */}
      {directWarning && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wide">
              CẢNH BÁO TỪ CÁN BỘ COI THI
            </h3>
            <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/30 text-amber-200 text-sm font-semibold">
              "{directWarning.message}"
            </div>
            <p className="text-xs text-slate-400">
              Bạn bị trừ <b className="text-amber-400">5 điểm uy tín</b>. Vui lòng tập trung nhìn thẳng màn hình, không thực hiện hành vi khả nghi.
            </p>
            <button
              onClick={() => setDirectWarning(null)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-amber-500/20"
            >
              TÔI ĐÃ HIỂU VÀ QUAY LẠI LÀM BÀI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

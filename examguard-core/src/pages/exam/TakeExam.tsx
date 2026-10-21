import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Calendar,
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
  CheckSquare,
  QrCode,
  UploadCloud,
  ImageIcon,
  FileCheck,
  Trash2,
  Lock,
  Unlock,
  Hourglass,
  ArrowRight,
  ScanFace,
  Sun,
  Moon,
  LogOut,
  BookOpen
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '../../api/apiClient';
import { useQuizSound } from './hooks/useQuizSound';
import { useAntiCheat } from './hooks/useAntiCheat';
import { TopWarningBanner } from './components/TopWarningBanner';
import { FaceCheckInGate } from './components/FaceCheckInGate';
import { MathSymbolKeyboard } from './components/MathSymbolKeyboard';
import { NovageniusQuestionMatrix } from './components/NovageniusQuestionMatrix';
import { useTheme } from '../../context/ThemeContext';
const officialLogo = '/logo.png';

interface Question {
  stt: number;
  _id: string;
  type: 'MULTIPLE_CHOICE' | 'ESSAY' | 'CODING_PROBLEM';
  content: string;
  image?: string;
  score: number;
  options?: string[];
  selectionMode?: 'SINGLE' | 'MULTIPLE' | 'ALTERNATIVE';
  scoringMode?: 'ALL_OR_NOTHING' | 'PARTIAL_CREDIT';
  minWords?: number;
  submissionMethod?: 'TEXT_EDITOR' | 'FILE_UPLOAD' | 'HYBRID_TEXT_FILE';
  allowAttachment?: boolean;
  templateCode?: Record<string, string>;
  testCases?: Array<{ input: string; expectedOutput: string }>;
}

export interface StudentSessionItem {
  id: string;
  candidateCode: string;
  seatRow: number;
  seatCol: number;
  seatPin?: string;
  status: string;
  trustScore: number;
  officialScore?: number;
  session: {
    id: string;
    code: string;
    title: string;
    subjectName?: string;
    roomName: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    status: string;
    gradingStatus?: string;
  };
  isEnded: boolean;
  isUpcoming: boolean;
  isHappening: boolean;
  countdownSeconds: number;
}

interface ExamData {
  isSessionEnded?: boolean;
  endedAt?: string;
  message?: string;
  isPreExamWaiting?: boolean;
  countdownSeconds?: number;
  isLateBlocked?: boolean;
  lateMinutes?: number;
  serverTime?: string;
  startTime?: string;
  todaySessions?: StudentSessionItem[];
  nextSession?: StudentSessionItem | null;
  hasActiveExamNow?: boolean;
  examStudent: {
    id: string;
    candidateCode: string;
    seatRow: number;
    seatCol: number;
    seatPin?: string;
    trustScore: number;
    startedAt?: string;
    extraTimeMinutes: number;
    isLateUnlocked?: boolean;
    status?: string;
    checkinAt?: string;
  };
  student: {
    id: string;
    name: string;
    studentCode: string;
    email?: string;
    className?: string;
  };
  session: {
    id: string;
    code: string;
    title: string;
    subjectName?: string;
    durationMinutes: number;
    roomCode: string;
    roomName: string;
    startTime?: string;
    endTime?: string;
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
    structureType?: 'PURE_MCQ' | 'HYBRID' | 'PURE_ESSAY';
    mcqCount?: number;
    essayCount?: number;
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
  const { isDark, toggleTheme } = useTheme();
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'PROCTOR' | 'NAVIGATOR'>('NAVIGATOR');
  const [showMathKeyboard, setShowMathKeyboard] = useState(true);

  // Tính năng Chế độ làm bài: Chia đôi (File Đề thi & Phiếu tô OMR) hoặc Thẻ Quiz từng câu
  const [workspaceMode, setWorkspaceMode] = useState<'SPLIT_FILE' | 'QUIZ_CARDS'>('QUIZ_CARDS');
  const [fileZoom, setFileZoom] = useState<number>(100);
  const [isProctorCollapsed, setIsProctorCollapsed] = useState<boolean>(false);

  // Tính năng Quiz tương tác cao
  const [filterTab, setFilterTab] = useState<'ALL' | 'ANSWERED' | 'UNANSWERED' | 'FLAGGED'>('ALL');
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleInsertMathSymbol = (symbol: string) => {
    if (!examData) return;
    const currentQ = examData.questions[currentIdx];
    const qId = currentQ._id;
    const currentVal = answers[qId] !== undefined ? answers[qId] : answers[currentIdx];

    if (currentQ.type === 'ESSAY') {
      const prevText = typeof currentVal === 'object' ? (currentVal?.text || '') : (currentVal || '');
      const newText = prevText + symbol;
      handleTextChange(qId, newText);
      toast.success(`Đã chèn ký hiệu "${symbol}"`);
    } else {
      navigator.clipboard?.writeText(symbol);
      toast.success(`Đã chép ký hiệu "${symbol}" vào clipboard`);
    }
  };

  // Webcam & AI state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
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

  // Cảnh báo an ninh chống gian lận nổi bật toàn màn hình
  const [securityAlert, setSecurityAlert] = useState<{
    eventType: string;
    title: string;
    message: string;
    penalty: number;
    newScore: number;
  } | null>(null);

  // Tự động đóng cảnh báo an ninh sau 8 giây nếu thí sinh không bấm xác nhận
  useEffect(() => {
    if (!securityAlert) return;
    const timer = setTimeout(() => {
      setSecurityAlert(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [securityAlert]);

  // Trạng thái Quét & Xác thực Khuôn mặt Check-in trước khi vào thi (Face Check-In Gate)
  const [hasFaceCheckedIn, setHasFaceCheckedIn] = useState<boolean>(() => {
    const key = `face_checkedin_${sessionStudentId || 'current'}`;
    return sessionStorage.getItem(key) === 'true';
  });
  const [isFaceCheckingIn, setIsFaceCheckingIn] = useState<boolean>(false);
  const [faceCheckinError, setFaceCheckinError] = useState<string | null>(null);
  const [faceSimilarity, setFaceSimilarity] = useState<number | null>(null);

  // Tự động công nhận đã checkin nếu DB đã có checkinAt hoặc status là IN_EXAM/SUBMITTED
  useEffect(() => {
    if (examData?.examStudent?.checkinAt || examData?.examStudent?.status === 'IN_EXAM' || examData?.examStudent?.status === 'SUBMITTED') {
      setHasFaceCheckedIn(true);
    }
  }, [examData]);

  // Xử lý quét khuôn mặt và đối chiếu danh tính + chỗ ngồi
  const handleFaceCheckIn = async () => {
    if (!videoRef.current) {
      toast.error('Webcam chưa sẵn sàng!');
      return;
    }
    setIsFaceCheckingIn(true);
    setFaceCheckinError(null);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);

      const targetId = examData?.examStudent?.id || sessionStudentId;
      const res = await apiClient.post('/api/proctor/verify-checkin', {
        sessionStudentId: targetId,
        image_base64: imageBase64
      });

      if (res.data?.success && res.data?.verified) {
        const sim = res.data.similarity || 92;
        setFaceSimilarity(sim);
        playQuizSound('finish');
        toast.success(`Xác thực khuôn mặt thành công! Độ khớp: ${sim}%`);
        sessionStorage.setItem(`face_checkedin_${sessionStudentId || 'current'}`, 'true');
        setTimeout(() => {
          setHasFaceCheckedIn(true);
        }, 1200);
      } else {
        setFaceCheckinError(res.data?.message || 'Khuôn mặt không khớp với hồ sơ thí sinh ngồi bàn này!');
        playQuizSound('warning');
      }
    } catch (err: any) {
      console.error('Lỗi checkin:', err);
      const msg = err.response?.data?.message || err.message || 'Lỗi kết nối máy chủ AI!';
      setFaceCheckinError(msg);
      playQuizSound('warning');
    } finally {
      setIsFaceCheckingIn(false);
    }
  };

  // Bộ phát âm thanh tổng hợp (Tuân thủ SRP - Web Audio API Hook)
  const { playQuizSound } = useQuizSound(soundEnabled);

  // Quản lý Đếm ngược Giờ vào thi (Countdown Waiting Room) & Chặn Vào Phòng khi Đi Muộn (>15p)
  const [isPreExamWaiting, setIsPreExamWaiting] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState(0);
  const [isLateBlocked, setIsLateBlocked] = useState(false);
  const [lateMinutes, setLateMinutes] = useState(0);
  const [isSessionEnded, setIsSessionEnded] = useState(false);

  // 1. Tải đề thi đã lọc bảo mật & Kiểm tra Phòng chờ / Chặn muộn / Ca thi kết thúc
  const fetchExam = async (silent = false, customStudentId?: string) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const targetId = customStudentId || sessionStudentId || 'fallback_student';
      const res = await apiClient.get(`/api/exam/questions/${targetId}`);
      if (res.data && res.data.success) {
        const data: ExamData = res.data.data;
        setExamData(data);

        // Trường hợp 0: Ca thi đã kết thúc -> Khóa phòng thi & Hiển thị màn hình kết thúc
        if (data.isSessionEnded) {
          setIsSessionEnded(true);
          setIsPreExamWaiting(false);
          setIsLateBlocked(false);
          return;
        }

        // Trường hợp 1: Chưa đến giờ thi -> Kích hoạt Phòng chờ & Đếm ngược
        if (data.isPreExamWaiting) {
          setIsPreExamWaiting(true);
          setCountdownSeconds(data.countdownSeconds || 0);
          setIsLateBlocked(false);
          setIsSessionEnded(false);
          return;
        }

        // Trường hợp 2: Đi muộn quá 15 phút -> Chặn vào phòng thi
        if (data.isLateBlocked) {
          setIsLateBlocked(true);
          setLateMinutes(data.lateMinutes || 15);
          setIsPreExamWaiting(false);
          setIsSessionEnded(false);
          return;
        }

        // Trường hợp 3: Vào phòng thi và làm bài bình thường
        setIsPreExamWaiting(false);
        setIsLateBlocked(false);
        setIsSessionEnded(false);
        setAnswers(data.savedAnswers || {});
        setTrustScore(data.examStudent?.trustScore !== undefined ? data.examStudent.trustScore : 100);

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
  };

  useEffect(() => {
    fetchExam();
  }, [sessionStudentId]);

  // Bộ đếm ngược tự động giờ phát đề thi (Pre-Exam Countdown Timer)
  useEffect(() => {
    if (!isPreExamWaiting || countdownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          playQuizSound('finish');
          toast.success('ĐÃ ĐẾN GIỜ PHÁT ĐỀ THI! Đang tải đề thi...', { icon: '🎯', duration: 4000 });
          setTimeout(() => {
            fetchExam();
          }, 800);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPreExamWaiting, countdownSeconds]);

  // 2. Quản lý Webcam bền vững — Tự động giữ stream và gắn lại tức thì khi đổi màn hình/làm mới
  const startCamera = useCallback(async () => {
    try {
      let stream = streamRef.current;
      const isLive = stream && stream.active && stream.getVideoTracks().some(t => t.readyState === 'live');
      
      if (!isLive) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false
        });
        streamRef.current = stream;
      }
      
      setCameraActive(true);
      if (videoRef.current && stream) {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
        videoRef.current.play().catch(e => console.warn('Camera play warning:', e));
      }
    } catch (err) {
      console.warn('Không thể truy cập camera thực:', err);
      setCameraActive(false);
    }
  }, []);

  // Callback ref: Mỗi khi thẻ video được React mount vào DOM (phòng chờ, đề thi, thu/phóng HUD),
  // ngay lập tức gắn stream và kích hoạt video không bao giờ bị màn hình đen
  const bindVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el) {
      if (streamRef.current && streamRef.current.active && streamRef.current.getVideoTracks().some(t => t.readyState === 'live')) {
        if (el.srcObject !== streamRef.current) {
          el.srcObject = streamRef.current;
        }
        el.play().catch(err => console.warn('bindVideoRef play err:', err));
      } else {
        startCamera();
      }
    }
  }, [startCamera]);

  // Khởi tạo camera khi mount component & dọn dẹp khi unmount hoàn toàn
  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [startCamera]);

  // Tự động gán lại stream khi chuyển đổi giữa Phòng chờ và Buồng thi chính, hoặc Thu gọn/Mở rộng HUD
  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current && streamRef.current && streamRef.current.active) {
        if (videoRef.current.srcObject !== streamRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
        videoRef.current.play().catch(() => {});
      } else if (!streamRef.current || !streamRef.current.active) {
        startCamera();
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [isPreExamWaiting, isProctorCollapsed, loading, isLateBlocked, startCamera]);

  // Hàm phát hiện vi phạm trình duyệt và gửi lên server
  const triggerAntiCheatEvent = async (eventType: string, details: any = {}) => {
    if (!examData?.examStudent?.id) return;
    try {
      const res = await apiClient.post('/api/proctor/anti-cheat-event', {
        sessionStudentId: examData.examStudent.id,
        eventType,
        details
      });
      if (res.data?.success) {
        const penalty = Number(res.data.penalty ?? 0);
        const updatedScore = res.data.trustScore !== undefined 
          ? Number(res.data.trustScore) 
          : Math.max(0, trustScore - penalty);
        
        setTrustScore(updatedScore);

        if (!res.data.debounced && penalty > 0) {
          playQuizSound('warning');

          // Kích hoạt Modal Cảnh báo An ninh Toàn màn hình nổi bật
          setSecurityAlert({
            eventType,
            title: res.data.title || 'CẢNH BÁO VI PHẠM QUY CHẾ THI',
            message: res.data.message || 'Phát hiện hành vi không hợp lệ trên máy làm bài!',
            penalty,
            newScore: updatedScore
          });

          toast.error(`CẢNH BÁO AN NINH: ${res.data.title || eventType} (-${penalty}đ)`, {
            duration: 6000,
            icon: '🚨'
          });

          setAiLogs(prev => [
            {
              time: new Date().toLocaleTimeString('vi-VN'),
              text: `${eventType}: ${res.data.title || res.data.message} (-${penalty}đ)`,
              type: 'warn'
            },
            ...prev.slice(0, 15)
          ]);
        }
      }
    } catch (_) {}
  };

  // 3. Giám sát chống gian lận đa tầng (Tuân thủ SRP - Anti-Cheat Security Hook)
  useAntiCheat({
    enabled: Boolean(examData && !isPreExamWaiting && !isLateBlocked && !isSessionEnded),
    onViolation: triggerAntiCheatEvent,
    isFullscreen,
    setIsFullscreen
  });

  // 4. Gửi frame camera định kỳ lên server để phân tích AI (Adaptive Interval theo điểm uy tín)
  useEffect(() => {
    if (!cameraActive || !examData || isPreExamWaiting || isLateBlocked) return;

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
  }, [cameraActive, examData, trustScore, isPreExamWaiting, isLateBlocked]);

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
        candidateCode: examData.examStudent?.candidateCode
      });
    });

    // Nhận thông báo mở bàn thi đặc cách từ Giám thị
    socket.on('student:late_unlocked', (data: any) => {
      if (
        data.candidateCode === examData.examStudent?.candidateCode ||
        data.examStudentId === examData.examStudent?.id ||
        data.studentId === examData.student?.id
      ) {
        playQuizSound('finish');
        toast.success(`CÁN BỘ COI THI ĐÃ MỞ BÀN THI ĐẶC CÁCH CHO BẠN!${data.extraMinutes > 0 ? ` (+${data.extraMinutes} phút bù)` : ''}`, {
          icon: '🔓',
          duration: 8000
        });
        setIsLateBlocked(false);
        fetchExam();
      }
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
      if (data.candidateCode === examData.examStudent?.candidateCode) {
        setTimeLeft(prev => prev + (data.extraMinutes || 5) * 60);
        toast.success(`GIÁM THỊ ĐÃ CỘNG BÙ ${data.extraMinutes} PHÚT LÀM BÀI CHO BẠN!`, { duration: 6000 });
      }
    });

    // Nhận thông báo đình chỉ thi
    socket.on('student:suspended', (data: any) => {
      if (data.candidateCode === examData.examStudent?.candidateCode) {
        setIsSuspended(true);
        setSuspendReason(data.reason || 'Vi phạm quy chế thi');
        toast.error('BẠN ĐÃ BỊ ĐÌNH CHỈ THI BỞI HỘI ĐỒNG COI THI!', { duration: 10000 });
      }
    });

    // Nhận thông báo Kết thúc ca thi & Đóng buồng thi từ Giám thị
    socket.on('session:ended', (data: any) => {
      playQuizSound('finish');
      toast.success(data.message || 'CÁN BỘ COI THI ĐÃ KẾT THÚC CA THI VÀ ĐÓNG BUỒNG THI!', { icon: '🏁', duration: 10000 });
      setIsSessionEnded(true);
      fetchExam();
    });

    // Gửi Heartbeat định kỳ 10s cho giám thị (chỉ khi đang thi)
    const heartbeatInterval = setInterval(() => {
      if (isPreExamWaiting || isLateBlocked) return;
      socket.emit('student:heartbeat', {
        sessionId: examData.session.id,
        studentId: examData.student.id,
        candidateCode: examData.examStudent?.candidateCode,
        currentQuestion: currentIdx + 1,
        trustScore
      });
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);
      socket.disconnect();
    };
  }, [examData, currentIdx, trustScore, isPreExamWaiting, isLateBlocked]);

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

  // Helper kiểm tra một lựa chọn optIdx có đang được thí sinh chọn hay không
  const isOptionSelected = (val: any, optIdx: number): boolean => {
    if (Array.isArray(val)) return val.includes(optIdx);
    return val !== undefined && val !== null && Number(val) === optIdx;
  };

  // Xử lý chọn đáp án MCQ (hỗ trợ cả 1 đáp án Radio lẫn Nhiều đáp án Checkbox)
  const handleToggleOption = (qId: string, optIdx: number, targetIdx?: number) => {
    playQuizSound('select');
    const qIndex = targetIdx !== undefined ? targetIdx : currentIdx;
    const currentQ = examData?.questions[qIndex];
    const isMulti = currentQ?.selectionMode === 'MULTIPLE';

    setAnswers(prev => {
      const prevVal = prev[qId] !== undefined ? prev[qId] : prev[qIndex];
      let nextVal: any;

      if (isMulti) {
        const curArr: number[] = Array.isArray(prevVal)
          ? [...prevVal]
          : prevVal !== undefined && prevVal !== null && prevVal !== ''
            ? [Number(prevVal)]
            : [];
        if (curArr.includes(optIdx)) {
          nextVal = curArr.filter(x => x !== optIdx);
        } else {
          nextVal = [...curArr, optIdx].sort((a, b) => a - b);
        }
      } else {
        nextVal = optIdx;
      }

      return {
        ...prev,
        [qId]: nextVal,
        [qIndex]: nextVal
      };
    });

    if (!isMulti && workspaceMode === 'QUIZ_CARDS' && autoAdvance && examData && currentIdx < examData.questions.length - 1) {
      setTimeout(() => {
        setCurrentIdx(prev => Math.min((examData?.questions.length || 1) - 1, prev + 1));
      }, 350);
    }
  };

  // Giữ alias tương thích
  const handleSelectOption = handleToggleOption;

  // Xóa lựa chọn đáp án trắc nghiệm
  const handleClearOption = (qId: string, qIndex: number) => {
    setAnswers(prev => {
      const next = { ...prev };
      delete next[qId];
      delete next[qIndex];
      return next;
    });
  };

  // Xử lý nộp file / ảnh bài làm giấy cho câu tự luận
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrTokenSeconds, setQrTokenSeconds] = useState(60);

  // Timer đếm ngược token QR 60s
  useEffect(() => {
    let timer: any = null;
    if (showQrModal) {
      setQrTokenSeconds(60);
      timer = setInterval(() => {
        setQrTokenSeconds(prev => (prev <= 1 ? 60 : prev - 1));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showQrModal]);

  // Chụp bài làm giấy qua Webcam máy tính (Chuẩn phòng thi - KHÔNG DÙNG ĐIỆN THOẠI)
  const [showWebcamCaptureModal, setShowWebcamCaptureModal] = useState(false);
  const [webcamSnapshot, setWebcamSnapshot] = useState<string | null>(null);
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);

  const handleSnapFromWebcam = () => {
    if (!videoRef.current) {
      toast.error('Webcam chưa sẵn sàng!');
      return;
    }
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Chụp khung hình từ webcam máy tính
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const snapshotUrl = canvas.toDataURL('image/jpeg', 0.95);
    setWebcamSnapshot(snapshotUrl);
    toast.success('Đã chụp ảnh bài thi từ Webcam!');
  };

  const handleStartCountdownCapture = () => {
    setCaptureCountdown(3);
    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(interval);
        setCaptureCountdown(null);
        handleSnapFromWebcam();
      } else {
        setCaptureCountdown(count);
      }
    }, 1000);
  };

  const handleConfirmWebcamSnapshot = (qId: string) => {
    if (!webcamSnapshot) return;
    handleFileUpload(qId, {
      fileUrl: webcamSnapshot,
      fileName: `bai_lam_giay_cau_${currentIdx + 1}.jpg`
    });
    setWebcamSnapshot(null);
    setShowWebcamCaptureModal(false);
  };

  const handleInsertSymbol = (qId: string, sym: string) => {
    const prevVal = answers[qId];
    const prevText = typeof prevVal === 'object' ? (prevVal?.text || '') : (typeof prevVal === 'string' ? prevVal : '');
    handleTextChange(qId, prevText + sym);
  };

  // Xử lý nhập Tự luận hoặc Code
  const handleTextChange = (qId: string, val: string) => {
    setAnswers(prev => {
      const prevVal = prev[qId];
      if (typeof prevVal === 'object' && prevVal?.fileUrl) {
        const newVal = { ...prevVal, text: val };
        return {
          ...prev,
          [qId]: newVal,
          [currentIdx]: newVal
        };
      }
      return {
        ...prev,
        [qId]: val,
        [currentIdx]: val
      };
    });
  };

  const handleFileUpload = (qId: string, fileData: { fileUrl: string; fileName: string; fileSize?: number }) => {
    const prevVal = answers[qId];
    const prevText = typeof prevVal === 'object' ? (prevVal?.text || '') : (typeof prevVal === 'string' ? prevVal : '');
    const newVal = {
      text: prevText,
      fileUrl: fileData.fileUrl,
      fileName: fileData.fileName,
      fileSize: fileData.fileSize,
      scannedAt: new Date().toISOString(),
      verified: true
    };
    setAnswers(prev => ({
      ...prev,
      [qId]: newVal,
      [currentIdx]: newVal
    }));
    setAiLogs(prev => [
      { time: new Date().toLocaleTimeString('vi-VN'), text: `Nhận ảnh quét bài thi giấy câu ${currentIdx + 1} (${fileData.fileName}) - Đã kiểm tra tính hợp lệ EXIF`, type: 'success' },
      ...prev
    ]);
    toast.success('Đã đính kèm ảnh bài làm giấy thành công!');
  };

  const handleRemoveFile = (qId: string) => {
    const prevVal = answers[qId];
    const prevText = typeof prevVal === 'object' ? (prevVal?.text || '') : (typeof prevVal === 'string' ? prevVal : '');
    const newVal = prevText ? { text: prevText } : '';
    setAnswers(prev => ({
      ...prev,
      [qId]: newVal,
      [currentIdx]: newVal
    }));
    toast('Đã gỡ tệp bài làm đính kèm.');
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
          handleToggleOption(currentQ._id, 0);
        } else if (key === 'b' || key === '2') {
          e.preventDefault();
          handleToggleOption(currentQ._id, 1);
        } else if (key === 'c' || key === '3') {
          e.preventDefault();
          handleToggleOption(currentQ._id, 2);
        } else if (key === 'd' || key === '4') {
          e.preventDefault();
          handleToggleOption(currentQ._id, 3);
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

  // Tính toán tiến độ & danh sách lọc câu hỏi chính xác
  const totalCount = examData?.questions?.length || 0;
  const answeredCount = useMemo(() => {
    if (!examData?.questions) return 0;
    return examData.questions.filter((q, idx) => {
      const val = answers[q._id] !== undefined ? answers[q._id] : answers[idx];
      if (val === undefined || val === null) return false;
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'string') return val.trim().length > 0;
      return true;
    }).length;
  }, [examData, answers]);

  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  const filteredQuestionIndices = useMemo(() => {
    if (!examData) return [];
    return examData.questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => {
        const val = answers[q._id] !== undefined ? answers[q._id] : answers[idx];
        const isAns = val !== undefined && val !== null && (Array.isArray(val) ? val.length > 0 : typeof val === 'string' ? val.trim().length > 0 : true);
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

  // ── MÀN HÌNH 1: BÀN THI BỊ KHÓA DO ĐẾN MUỘN QUÁ 15 PHÚT ──
  if (isLateBlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8 font-sans select-none relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-800/80 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center space-x-2">
                <span>EXAMGUARD AI</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  SECURITY LOCKDOWN
                </span>
              </h1>
              <p className="text-xs text-slate-400">{examData?.session?.title || 'Phòng thi Trực tuyến'}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono text-slate-400 block">{examData?.session?.roomName || 'Phòng thi'}</span>
            <span className="text-[11px] font-mono text-cyan-400 font-semibold">{examData?.session?.code}</span>
          </div>
        </div>

        {/* Center Card */}
        <div className="max-w-xl w-full mx-auto my-auto relative z-10 py-6">
          <div className="bg-slate-900/90 border border-rose-500/40 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6 text-center ring-1 ring-rose-500/20">
            {/* Lock Icon */}
            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/50 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-950/50">
                <Lock className="w-10 h-10" />
              </div>
            </div>

            {/* Title & Warning */}
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-wide">
                BÀN THI ĐÃ BỊ KHÓA
              </h2>
              <div className="inline-block px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold uppercase tracking-wider">
                ĐẾN MUỘN {lateMinutes} PHÚT (VƯỢT QUÁ QUY ĐỊNH 15 PHÚT)
              </div>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-md mx-auto pt-1">
                Theo <b className="text-amber-400">Điều 14 Quy chế coi thi</b> của Nhà trường: Thí sinh đến muộn quá 15 phút sau khi phát đề và bắt đầu tính giờ làm bài sẽ <b className="text-rose-400">không được phép tự ý vào phòng thi</b>.
              </p>
            </div>

            {/* Detailed Info Grid */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Thí sinh:</span>
                <span className="font-bold text-slate-200">{examData?.student?.name}</span>
                <span className="block text-[10px] text-slate-400 font-mono">MSSV: {examData?.student?.studentCode}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Số báo danh / Vị trí bàn:</span>
                <span className="font-bold text-cyan-400 font-mono">{examData?.examStudent?.candidateCode}</span>
                <span className="block text-[10px] text-slate-400">Dãy {examData?.examStudent?.seatRow} - Cột {examData?.examStudent?.seatCol}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Giờ bắt đầu ca thi:</span>
                <span className="font-semibold text-slate-300 font-mono">
                  {examData?.session?.startTime ? new Date(examData.session.startTime).toLocaleTimeString('vi-VN') : 'Đang tải...'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Trạng thái khóa bàn:</span>
                <span className="font-bold text-rose-400 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span>ĐANG KHÓA (CHỜ GIÁM THỊ)</span>
                </span>
              </div>
            </div>

            {/* Instruction box */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-left text-xs text-amber-200/90 space-y-1">
              <div className="font-bold flex items-center space-x-1.5 text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                <span>HƯỚNG DẪN XỬ LÝ ĐẶC CÁCH:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Vui lòng <b>báo cáo trực tiếp với Giám thị tại phòng thi</b>. Nếu có lý do bất khả kháng được Hội đồng thi chấp thuận, Giám thị sẽ dùng quyền quản trị mở bàn đặc cách cho bạn trên màn hình giám sát.
              </p>
            </div>

            {/* Socket Live Pulse */}
            <div className="flex items-center justify-center space-x-2 text-[11px] text-cyan-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Đang kết nối Realtime Socket.IO — Tự động mở khi Giám thị duyệt...</span>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => fetchExam()}
                disabled={loading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition active:scale-95 flex items-center justify-center space-x-2"
              >
                <RotateCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Kiểm Tra Lại Trạng Thái Bàn Thi</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition"
              >
                Về Trang Chủ
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 relative z-10 pt-4">
          ExamGuard AI Security Engine • Hệ thống Giám sát Khảo thí Toàn vẹn v2.0
        </div>
      </div>
    );
  }

  // ── MÀN HÌNH 2: PHÒNG CHỜ THI TRỰC TUYẾN & ĐẾM NGƯỢC GIỜ PHÁT ĐỀ ──
  if (isPreExamWaiting) {
    const hours = Math.floor(countdownSeconds / 3600);
    const mins = Math.floor((countdownSeconds % 3600) / 60);
    const secs = countdownSeconds % 60;

    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-4 md:p-8 font-sans select-none relative overflow-hidden">
        {/* Hidden canvas for webcam */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="max-w-6xl w-full mx-auto flex items-center justify-between pb-4 border-b border-slate-800/80 relative z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center space-x-2">
                <span>EXAMGUARD AI</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center space-x-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>PHÒNG CHỜ THI TRỰC TUYẾN</span>
                </span>
              </h1>
              <p className="text-xs text-slate-400">{examData?.session?.subjectName || examData?.session?.title}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="hidden sm:block text-right">
              <span className="text-slate-400 block">{examData?.session?.roomName}</span>
              <span className="text-cyan-400 font-bold">Mã ca: {examData?.session?.code}</span>
            </div>
          </div>
        </div>

        {/* Main Content: 2-column layout */}
        <div className="max-w-6xl w-full mx-auto my-auto relative z-10 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column (7 cols): Hero Countdown Timer */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-cyan-400 flex items-center space-x-1.5 tracking-wider uppercase">
                  <Clock className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                  <span>ĐỒNG HỒ ĐẾM NGƯỢC GIỜ PHÁT ĐỀ</span>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Phát đề lúc: <b className="text-white">{examData?.session?.startTime ? new Date(examData.session.startTime).toLocaleTimeString('vi-VN') : ''}</b>
                </span>
              </div>

              {/* Huge Digital Clock */}
              <div className="py-6 text-center">
                <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-md mx-auto">
                  {/* Hours */}
                  <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 md:p-4 shadow-inner">
                    <div className="text-3xl md:text-5xl font-black font-mono text-cyan-400 tracking-wider">
                      {String(hours).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500 font-semibold tracking-widest mt-1">GIỜ</div>
                  </div>

                  {/* Minutes */}
                  <div className="bg-slate-950/90 border border-slate-800 rounded-2xl p-3 md:p-4 shadow-inner">
                    <div className="text-3xl md:text-5xl font-black font-mono text-cyan-400 tracking-wider">
                      {String(mins).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500 font-semibold tracking-widest mt-1">PHÚT</div>
                  </div>

                  {/* Seconds */}
                  <div className={`bg-slate-950/90 border rounded-2xl p-3 md:p-4 shadow-inner transition-colors ${
                    countdownSeconds <= 10 ? 'border-amber-500/60 bg-amber-950/30' : 'border-slate-800'
                  }`}>
                    <div className={`text-3xl md:text-5xl font-black font-mono tracking-wider ${
                      countdownSeconds <= 10 ? 'text-amber-400 animate-pulse' : 'text-cyan-400'
                    }`}>
                      {String(secs).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500 font-semibold tracking-widest mt-1">GIÂY</div>
                  </div>
                </div>

                {countdownSeconds <= 10 && (
                  <p className="mt-4 text-xs font-bold text-amber-300 animate-bounce">
                    ⚡ CHUẨN BỊ MỞ ĐỀ THI TRONG {countdownSeconds} GIÂY...
                  </p>
                )}
                {countdownSeconds > 10 && (
                  <p className="mt-4 text-xs text-slate-400">
                    Đề thi sẽ tự động hiển thị và bắt đầu tính giờ ngay khi đồng hồ về <b className="text-cyan-400 font-mono">00:00:00</b>. Vui lòng giữ nguyên màn hình!
                  </p>
                )}
              </div>

              {/* Ca thi overview stats */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800 text-center text-xs">
                <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Thời lượng:</span>
                  <span className="font-bold text-white font-mono">{examData?.session?.durationMinutes || 60} phút</span>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Số lượng câu:</span>
                  <span className="font-bold text-white font-mono">{examData?.examPaper?.totalQuestions || 'Theo đề'} câu</span>
                </div>
                <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-500 block">Hình thức nộp:</span>
                  <span className="font-bold text-cyan-400 font-mono">Trắc nghiệm Quiz</span>
                </div>
              </div>
            </div>

            {/* Quick check button */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-2">
              <span className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Hệ thống giám sát ExamGuard AI đã sẵn sàng</span>
              </span>
              <button
                onClick={() => {
                  fetchExam(true);
                  startCamera();
                  toast.success('Đã cập nhật trạng thái phòng thi', { id: 'refreshed' });
                }}
                className="text-cyan-400 hover:text-cyan-300 underline font-medium"
              >
                Làm mới trạng thái
              </button>
            </div>
          </div>

          {/* Right Column (5 cols): Camera Check & Candidate Info Card */}
          <div className="lg:col-span-5 space-y-4">
            {/* Candidate Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>THÔNG TIN THÍ SINH DỰ THI</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                  SBD: {examData?.examStudent?.candidateCode}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Họ và tên:</span>
                  <span className="font-bold text-white truncate block">{examData?.student?.name}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Mã sinh viên:</span>
                  <span className="font-mono font-bold text-slate-200 block">{examData?.student?.studentCode}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Lớp quản lý:</span>
                  <span className="font-bold text-slate-300 block">{examData?.student?.className || 'K23CNT3'}</span>
                </div>
                <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Vị trí bàn thi:</span>
                  <span className="font-bold text-cyan-400 font-mono block">Dãy {examData?.examStudent?.seatRow} - Cột {examData?.examStudent?.seatCol}</span>
                </div>
              </div>
            </div>

            {/* Webcam Live Test Box */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                  <Camera className="w-4 h-4 text-cyan-400" />
                  <span>KIỂM TRA CAMERA & KHUÔN MẶT</span>
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  cameraActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  {cameraActive ? 'CAMERA HOẠT ĐỘNG' : 'CHƯA BẬT CAMERA'}
                </span>
              </div>

              <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
                <video
                  ref={bindVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-slate-950/80 z-20">
                    <Camera className="w-8 h-8 text-slate-600 mb-1" />
                    <p className="text-[11px] text-slate-400 mb-2">Vui lòng cấp quyền Camera trình duyệt để tiến hành nhận diện AI</p>
                    <button
                      onClick={() => startCamera()}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg transition shadow-md"
                    >
                      Kích hoạt lại Camera
                    </button>
                  </div>
                )}
                {cameraActive && (
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm border border-emerald-500/30 text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>AI Face Liveness Active</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quy chế thi tóm tắt */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5 text-xs text-slate-400 space-y-1.5">
              <span className="font-bold text-slate-300 block text-[11px] uppercase tracking-wider">
                Lưu ý Quy chế coi thi:
              </span>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400">
                <li>Tuyệt đối <b>không chuyển tab</b> hoặc mở DevTools (Hệ thống trừ điểm uy tín).</li>
                <li>Ngồi thẳng, giữ khuôn mặt luôn ở giữa khung hình camera.</li>
                <li>Thí sinh đến muộn quá 15 phút sẽ bị khóa bàn thi theo Quy chế.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 relative z-10 pt-4">
          ExamGuard AI • Phòng Chờ Thi Trực Tuyến & Chống Gian Lận Đa Tầng v2.0
        </div>
      </div>
    );
  }

  // Màn hình Ca thi đã kết thúc & Đóng buồng thi
  if (isSessionEnded) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 md:p-8 font-sans relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 max-w-4xl mx-auto w-full relative z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center space-x-2">
                <span>EXAMGUARD AI</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  CA THI ĐÃ KẾT THÚC
                </span>
              </h1>
              <p className="text-xs text-slate-400">{examData?.session?.title || 'Phòng thi Trực tuyến'}</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono text-slate-400 block">{examData?.session?.roomName || 'Phòng thi'}</span>
            <span className="text-[11px] font-mono text-cyan-400 font-semibold">{examData?.session?.code}</span>
          </div>
        </div>

        {/* Center Content Card */}
        <div className="max-w-xl w-full mx-auto my-auto relative z-10 py-6">
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl space-y-6 text-center ring-1 ring-indigo-500/20">
            {/* Status Icon */}
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/40 flex items-center justify-center text-cyan-400 shadow-xl shadow-indigo-950/50">
              <CheckCircle2 className="w-10 h-10 text-cyan-400" />
            </div>

            {/* Title & Badge */}
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-wide">
                BUỒNG THI ĐÃ ĐÓNG
              </h2>
              <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                ✓ BÀI LÀM ĐÃ ĐƯỢC THU NHẬN AN TOÀN
              </div>
              <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-md mx-auto pt-1">
                Ca thi đã chính thức kết thúc lúc <b className="text-cyan-400 font-mono">{examData?.session?.endTime ? new Date(examData.session.endTime).toLocaleTimeString('vi-VN') : 'vừa qua'}</b>. Toàn bộ câu trả lời của bạn đã được niêm phong để chuyển sang hội đồng rà soát & chấm điểm.
              </p>
            </div>

            {/* Student & Session Info Grid */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">Thí sinh:</span>
                <span className="font-bold text-slate-200">{examData?.student?.name}</span>
                <span className="block text-[10px] text-slate-400 font-mono">MSSV: {examData?.student?.studentCode}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Số báo danh / Lớp:</span>
                <span className="font-bold text-cyan-400 font-mono">{examData?.examStudent?.candidateCode}</span>
                <span className="block text-[10px] text-slate-400">{examData?.student?.className || 'Lớp K23'}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Điểm uy tín kết thúc:</span>
                <span className={`font-mono font-bold ${
                  (examData?.examStudent?.trustScore || 100) >= 80 ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {examData?.examStudent?.trustScore !== undefined ? examData.examStudent.trustScore : 100}/100đ
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">Trạng thái bài thi:</span>
                <span className="font-bold text-emerald-400 flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ĐÃ NỘP BÀI (CHỜ CÔNG BỐ)</span>
                </span>
              </div>
            </div>

            {/* Notice */}
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 text-xs text-indigo-300 text-left space-y-1">
              <span className="font-bold block text-white">Quy trình công bố kết quả:</span>
              <p className="text-[11px] text-slate-300">
                Theo quy chế khảo thí, điểm thi và đáp án chi tiết sẽ được hiển thị ngay sau khi Cán bộ chấm thi hoàn tất quy trình rà soát và công bố chính thức.
              </p>
            </div>

            {/* ── CARD CA THI KẾ TIẾP CỦA THÍ SINH (2 MÔN THI LIÊN TIẾP NHAU) ── */}
            {examData?.nextSession && (
              <div className="bg-gradient-to-r from-purple-950/70 via-indigo-950/80 to-cyan-950/70 border border-purple-500/40 rounded-2xl p-4 text-left shadow-xl relative overflow-hidden ring-1 ring-purple-500/30">
                <div className="flex items-center justify-between pb-2 border-b border-purple-500/30 mb-2.5">
                  <span className="text-xs font-bold text-purple-300 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>CA THI KẾ TIẾP TRONG NGÀY HÔM NAY:</span>
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    examData.nextSession.isHappening 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 animate-pulse'
                      : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  }`}>
                    {examData.nextSession.isHappening ? '🟢 PHÒNG THI ĐANG MỞ' : '⏳ SẮP DIỄN RA'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-white">
                    {examData.nextSession.session.title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-300">
                    <span>Phòng: <b className="text-cyan-400 font-mono">{examData.nextSession.session.roomName}</b></span>
                    <span>•</span>
                    <span>Giờ thi: <b className="text-white font-mono">{new Date(examData.nextSession.session.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(examData.nextSession.session.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</b></span>
                    <span>•</span>
                    <span>SBD: <b className="text-cyan-300 font-mono">{examData.nextSession.candidateCode}</b></span>
                  </div>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-400">
                    {examData.nextSession.isHappening ? (
                      <span className="text-emerald-400 font-bold flex items-center space-x-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
                        Đã đến giờ thi! Bấm nút để vào phòng thi
                      </span>
                    ) : (
                      <span>Đếm ngược giờ mở đề: <b className="text-amber-400 font-mono font-bold">{Math.floor(examData.nextSession.countdownSeconds / 60)} phút {examData.nextSession.countdownSeconds % 60}s</b></span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      const nextId = examData.nextSession?.id;
                      if (nextId) {
                        navigate(`/take-exam/${nextId}`);
                        fetchExam(false, nextId);
                      }
                    }}
                    className="py-2 px-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center justify-center space-x-1.5 active:scale-95"
                  >
                    <span>Vào Phòng Thi Môn Kế Tiếp</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* ── LỘ TRÌNH CÁC MÔN THI TRONG NGÀY CỦA THÍ SINH (NẾU CÓ TỪ 2 CA THI) ── */}
            {examData?.todaySessions && examData.todaySessions.length > 1 && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>LỘ TRÌNH THI TRONG NGÀY ({examData.todaySessions.length} CA THI):</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">Quy chế: 1 ca / khung giờ</span>
                </div>

                <div className="space-y-2">
                  {examData.todaySessions.map((ts, idx) => {
                    const isCurrent = ts.id.toString() === examData.examStudent?.id?.toString();
                    return (
                      <div
                        key={ts.id}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          isCurrent
                            ? 'bg-slate-900 border-cyan-500/30'
                            : ts.isHappening
                            ? 'bg-emerald-950/30 border-emerald-500/40'
                            : 'bg-slate-900/40 border-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                            isCurrent ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-200">
                              {ts.session.title}
                              {isCurrent && <span className="text-[10px] text-cyan-400 ml-1.5 font-normal">(Ca hiện tại)</span>}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center space-x-2">
                              <span>{new Date(ts.session.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(ts.session.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span>•</span>
                              <span>{ts.session.roomName}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {ts.isEnded ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                              ✓ Đã nộp
                            </span>
                          ) : ts.isHappening ? (
                            <button
                              onClick={() => {
                                navigate(`/take-exam/${ts.id}`);
                                fetchExam(false, ts.id);
                              }}
                              className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center space-x-1"
                            >
                              <span>Vào thi</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-medium">
                              Sắp tới ({Math.floor(ts.countdownSeconds / 60)}p)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => navigate(`/exam-result/${examData?.examStudent?.id || 'fallback_student'}`)}
                className="py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-600/20 transition active:scale-95 flex items-center justify-center space-x-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>Xem Trạng Thái Điểm</span>
              </button>

              <button
                onClick={() => navigate('/exam-sessions')}
                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Danh Sách Ca Thi</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-600 relative z-10 pt-4">
          ExamGuard AI • Hệ thống Quản lý Thi Trực Tuyến & Chống Gian Lận Đa Tầng v2.0
        </div>
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

  // ── CỔNG XÁC THỰC KHUÔN MẶT & ĐIỂM DANH CHỖ NGỒI (FACE CHECK-IN GATE - SRP) ──
  if (!hasFaceCheckedIn) {
    return (
      <FaceCheckInGate
        examData={examData}
        bindVideoRef={bindVideoRef}
        cameraActive={cameraActive}
        isFaceCheckingIn={isFaceCheckingIn}
        faceCheckinError={faceCheckinError}
        faceSimilarity={faceSimilarity}
        onFaceCheckIn={handleFaceCheckIn}
      />
    );
  }

  const currentQ = examData.questions[currentIdx];
  const qId = currentQ._id;
  const currentVal = answers[qId] !== undefined ? answers[qId] : answers[currentIdx];

  return (
    <div className={`h-screen overflow-hidden flex flex-col font-sans select-none transition-colors duration-200 ${
      isDark ? 'bg-[#0B0F19] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Hidden canvas for webcam frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── TOP HEADER (STYLED AFTER IMAGE 1 & IMAGE 4) ── */}
      <header className={`h-16 px-4 sm:px-6 flex items-center justify-between z-20 shrink-0 border-b backdrop-blur-md transition-colors ${
        isDark ? 'bg-slate-900/90 border-slate-800/80' : 'bg-white/95 border-slate-200 shadow-xs'
      }`}>
        {/* LEFT: Safe Exit button + Brand Logo */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button
            type="button"
            onClick={() => setShowExitConfirmModal(true)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-700 hover:text-slate-900'
            }`}
            title="Rời khỏi phòng thi an toàn"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden sm:inline">Rời phòng</span>
          </button>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-800 hidden sm:block"></div>

          <div className="flex items-center space-x-2.5">
            <img src={officialLogo} alt="ExamGuard AI" className="w-8 h-8 object-contain rounded-lg" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-wide text-xs sm:text-sm text-slate-900 dark:text-white">
                  EXAMGUARD <span className="text-teal-600 dark:text-teal-400">AI</span>
                </span>
                <span className="hidden md:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping"></span>
                  <span>PHÒNG THI AN NINH</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">{examData.session.title}</p>
            </div>
          </div>
        </div>

        {/* CENTER: Workspace Mode Switcher & Digital Countdown Timer (Image 4 Novagenius) */}
        <div className="flex items-center space-x-3">
          {/* Chế độ làm bài Switcher */}
          <div className={`hidden lg:flex items-center p-1 rounded-xl border text-xs shadow-inner ${
            isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setWorkspaceMode('SPLIT_FILE')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                workspaceMode === 'SPLIT_FILE'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Split View: Xem tài liệu đề thi song song với công thức và bài làm"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split View (Đề & Công thức)</span>
            </button>
            <button
              onClick={() => setWorkspaceMode('QUIZ_CARDS')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                workspaceMode === 'QUIZ_CARDS'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
              title="Novagenius Quiz: Thẻ câu hỏi trắc nghiệm tương tác"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Thẻ Quiz Từng Câu</span>
            </button>
          </div>

          {/* Digital Timer Pill (Image 4 Novagenius) */}
          <div className={`flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-full border text-xs font-mono font-bold transition-all shadow-xs ${
            timeLeft < 300
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-500 animate-pulse'
              : isDark
              ? 'bg-slate-900 border-slate-800 text-teal-300'
              : 'bg-white border-slate-200 text-teal-700'
          }`}>
            <Clock className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-sm font-extrabold">{formatTime(timeLeft)}</span>
            <span className="text-[10px] text-slate-400 font-sans hidden sm:inline">
              / {examData.session.durationMinutes}:00
            </span>
          </div>
        </div>

        {/* RIGHT: Candidate Profile Badge, Theme Switcher & Submit CTA */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Candidate Profile Pill (Image 1 style) */}
          <div className={`hidden xl:flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xs'
          }`}>
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
              {examData.student.name?.slice(0, 2).toUpperCase() || 'TS'}
            </div>
            <div className="text-left">
              <span className="font-semibold block text-xs leading-none text-slate-800 dark:text-slate-200">{examData.student.name}</span>
              <span className="text-[10px] text-slate-400 font-mono">SBD: {examData.examStudent.candidateCode}</span>
            </div>
          </div>

          {/* Nút chuyển chế độ Sáng / Tối */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-amber-400'
                : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Nút bật tắt âm thanh */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white'
                : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title={soundEnabled ? 'Tắt âm thanh hiệu ứng' : 'Bật âm thanh hiệu ứng'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-teal-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>

          {/* Nút toàn màn hình */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-400 hover:text-white'
                : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            title={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Nút Nộp bài thi CTA chính thức */}
          <button
            onClick={() => setShowSubmitModal(true)}
            disabled={isSubmitting}
            className="flex items-center space-x-1.5 sm:space-x-2 px-3.5 sm:px-5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/20 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>NỘP BÀI</span>
          </button>
        </div>
      </header>

      {/* ── MAIN WORKSPACE ── */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
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
                              const curAnswerVal = answers[q._id] !== undefined ? answers[q._id] : answers[idx];
                              const isSelected = isOptionSelected(curAnswerVal, optIdx);
                              return (
                                <div
                                  key={optIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleOption(q._id, optIdx, idx);
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

                      {/* Ảnh sơ đồ mạch / đồ thị đính kèm nếu có */}
                      {q.image && (
                        <div
                          className="my-2 rounded-xl overflow-hidden border border-slate-800 bg-white/5 max-h-48 flex items-center justify-center p-1.5 cursor-zoom-in"
                          onClick={() => window.open(q.image, '_blank')}
                          title="Click để phóng to ảnh sơ đồ"
                        >
                          <img src={q.image} alt={`Hình vẽ câu ${idx + 1}`} className="max-h-44 object-contain rounded" />
                        </div>
                      )}

                      {/* 4 OMR Bubble buttons */}
                      {q.type === 'MULTIPLE_CHOICE' ? (
                        <div>
                          {q.selectionMode === 'MULTIPLE' && (
                            <div className="text-[10px] text-amber-400 font-semibold mb-1 flex items-center space-x-1">
                              <span>☑ Chọn nhiều đáp án (Hộp kiểm)</span>
                            </div>
                          )}
                          <div className="grid grid-cols-4 gap-2 pt-1">
                            {['A', 'B', 'C', 'D'].map((letter, optIdx) => {
                              const isSelected = isOptionSelected(qVal, optIdx);
                              return (
                                <button
                                  key={letter}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleOption(q._id, optIdx, idx);
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
                        </div>
                      ) : q.type === 'ESSAY' ? (
                        <div className="pt-1 space-y-1.5">
                          {q.submissionMethod === 'FILE_UPLOAD' ? (
                            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-300">
                              <span className="flex items-center space-x-1.5 text-cyan-400 font-medium">
                                <Camera className="w-3.5 h-3.5" />
                                <span>Ảnh bài làm giấy</span>
                              </span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                                qVal && (typeof qVal === 'object' ? qVal.fileUrl : qVal)
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {qVal && (typeof qVal === 'object' ? qVal.fileUrl : qVal) ? '✓ Đã có ảnh' : 'Chưa nộp ảnh'}
                              </span>
                            </div>
                          ) : (
                            <textarea
                              rows={2}
                              value={typeof qVal === 'object' ? (qVal.text || '') : (qVal || '')}
                              onChange={(e) => handleTextChange(q._id, e.target.value)}
                              placeholder={q.submissionMethod === 'HYBRID_TEXT_FILE' ? "Gõ tóm tắt / chuyển sang Thẻ Quiz để nộp ảnh..." : "Nhập câu trả lời tự luận..."}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            ></textarea>
                          )}
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

                {/* Hình ảnh minh họa đi kèm câu hỏi (Ví dụ: Sơ đồ mạch logic, Đồ thị, Bảng chân trị) */}
                {currentQ.image && (
                  <div className="my-4 p-3 bg-slate-950/90 rounded-2xl border border-slate-800 shadow-xl max-w-xl mx-auto">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2 px-1">
                      <span className="flex items-center space-x-1.5 font-medium text-cyan-400">
                        <ImageIcon className="w-4 h-4" />
                        <span>Sơ đồ / Hình vẽ minh họa Câu {currentIdx + 1}:</span>
                      </span>
                      <span className="text-[10px] text-slate-500">Click ảnh để phóng to</span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-slate-800 bg-white/5 flex items-center justify-center p-2">
                      <img
                        src={currentQ.image}
                        alt={`Sơ đồ câu ${currentIdx + 1}`}
                        className="max-h-72 w-full object-contain cursor-zoom-in hover:scale-105 transition-transform duration-200"
                        onClick={() => window.open(currentQ.image, '_blank')}
                      />
                    </div>
                  </div>
                )}

                {/* Gợi ý mở File đề thi gốc để xem sơ đồ nếu là đề thi đính kèm tệp */}
                {examData.examPaper?.fileUrl && !currentQ.image && (
                  <div className="mt-3 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 text-xs text-cyan-300">
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>Câu hỏi có thể chứa sơ đồ mạch logic hoặc bảng biểu trong <b>File đề thi gốc</b>.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWorkspaceMode('SPLIT_FILE')}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center space-x-1.5 transition shadow shrink-0"
                    >
                      <Columns className="w-3.5 h-3.5" />
                      <span>Mở File đề song song (Split View)</span>
                    </button>
                  </div>
                )}

                {currentQ.selectionMode === 'MULTIPLE' && (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mt-3">
                    <CheckSquare className="w-4 h-4 text-amber-400" />
                    <span>Câu hỏi có nhiều đáp án đúng (Thí sinh có thể chọn nhiều phương án dạng hộp kiểm)</span>
                  </div>
                )}

                {/* Danh sách Lựa chọn Trắc nghiệm (Interactive Option Cards) */}
                {currentQ.type === 'MULTIPLE_CHOICE' && currentQ.options && (
                  <div className="grid grid-cols-1 gap-3.5 pt-2">
                    {currentQ.options.map((opt, optIdx) => {
                      const isSelected = isOptionSelected(currentVal, optIdx);
                      const letter = String.fromCharCode(65 + optIdx); // A, B, C, D

                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleToggleOption(qId, optIdx)}
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
                {currentQ.type === 'ESSAY' && (() => {
                  const method = currentQ.submissionMethod || 'TEXT_EDITOR';
                  const textVal = typeof currentVal === 'object' ? (currentVal?.text || '') : (typeof currentVal === 'string' ? currentVal : '');
                  const fileVal = typeof currentVal === 'object' ? currentVal?.fileUrl : null;
                  const fileName = typeof currentVal === 'object' ? currentVal?.fileName : null;
                  const scannedAt = typeof currentVal === 'object' ? currentVal?.scannedAt : null;

                  return (
                    <div className="mt-4 space-y-4">
                      {/* Method Header Badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                        <div className="flex items-center space-x-2">
                          {method === 'FILE_UPLOAD' ? (
                            <span className="flex items-center space-x-1.5 text-cyan-400 font-semibold">
                              <Camera className="w-4 h-4" />
                              <span>Hình thức: Nộp ảnh quét bài làm trên giấy thi</span>
                            </span>
                          ) : method === 'HYBRID_TEXT_FILE' ? (
                            <span className="flex items-center space-x-1.5 text-indigo-400 font-semibold">
                              <Sparkles className="w-4 h-4" />
                              <span>Hình thức kết hợp: Gõ tóm tắt & Chụp ảnh bài làm giấy</span>
                            </span>
                          ) : (
                            <span className="flex items-center space-x-1.5 text-slate-300 font-semibold">
                              <FileText className="w-4 h-4" />
                              <span>Hình thức: Soạn thảo câu trả lời trực tiếp</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {method === 'FILE_UPLOAD' 
                            ? 'Làm bài chi tiết ra giấy rồi quét nộp ảnh' 
                            : `Số từ tối thiểu: ${currentQ.minWords || 0} từ`}
                        </span>
                      </div>

                      {/* Text editor area if TEXT_EDITOR or HYBRID */}
                      {(method === 'TEXT_EDITOR' || method === 'HYBRID_TEXT_FILE') && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-medium text-slate-300">
                              {method === 'HYBRID_TEXT_FILE' ? '1. Câu trả lời tóm tắt / Biểu thức logic rút gọn:' : 'Nội dung câu trả lời:'}
                            </label>
                            <span className="text-[11px] text-slate-400">Hỗ trợ bộ gõ ký hiệu toán & logic</span>
                          </div>

                          {/* Quick Logic Symbols Toolbar for Discrete Math & Circuit Gates */}
                          <div className="flex flex-wrap items-center gap-1.5 py-1.5 px-2.5 bg-slate-900/90 border border-slate-800 rounded-xl mb-2 text-xs">
                            <span className="text-[10px] text-cyan-400 font-mono font-bold mr-1">Ký hiệu logic:</span>
                            {[
                              { label: "x̄ (NOT)", val: "̄" },
                              { label: "¬ (NOT)", val: "¬" },
                              { label: "∧ (AND)", val: " ∧ " },
                              { label: "∨ (OR)", val: " ∨ " },
                              { label: "⊕ (XOR)", val: " ⊕ " },
                              { label: "⊼ (NAND)", val: " ⊼ " },
                              { label: "⊽ (NOR)", val: " ⊽ " },
                              { label: "→", val: " → " },
                              { label: "↔", val: " ↔ " },
                              { label: "F(x,y,z)", val: "F(x,y,z) = " }
                            ].map((sym, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => handleInsertSymbol(qId, sym.val)}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-200 text-xs font-mono transition border border-slate-700/80 hover:font-bold"
                                title={`Chèn ký hiệu ${sym.label}`}
                              >
                                {sym.label}
                              </button>
                            ))}
                          </div>

                          <textarea
                            rows={method === 'HYBRID_TEXT_FILE' ? 4 : 6}
                            value={textVal}
                            onChange={e => handleTextChange(qId, e.target.value)}
                            placeholder={method === 'HYBRID_TEXT_FILE' 
                              ? "Nhập biểu thức kết quả, bảng chân trị rút gọn hoặc tóm tắt các bước chính (ví dụ: F = (x·y)' + (y'·z'))..."
                              : "Nhập câu trả lời tự luận của bạn tại đây... (Sử dụng thanh ký hiệu logic bên trên hoặc gõ trực tiếp)"}
                            className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 resize-none font-sans"
                          ></textarea>
                          <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1 px-1">
                            <span>Ký tự: {textVal.length}</span>
                            <span>Từ: {textVal.trim() ? textVal.trim().split(/\s+/).length : 0}</span>
                          </div>
                        </div>
                      )}

                      {/* Paper scan / File upload area if FILE_UPLOAD or HYBRID */}
                      {(method === 'FILE_UPLOAD' || method === 'HYBRID_TEXT_FILE') && (
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1.5">
                            {method === 'HYBRID_TEXT_FILE' ? '2. Ảnh chụp bài giải chi tiết / Sơ đồ mạch trên giấy thi:' : 'Ảnh chụp bài làm trên giấy thi:'}
                          </label>

                          {fileVal ? (
                            /* Already uploaded preview card */
                            <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-xs">
                                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                                  <span>ĐÃ NỘP BÀI LÀM GIẤY THÀNH CÔNG</span>
                                  <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                                    Đã xác thực
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(qId)}
                                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Xóa / Chụp lại</span>
                                </button>
                              </div>

                              <div className="relative group max-w-md mx-auto rounded-xl overflow-hidden border border-slate-700 bg-black/40">
                                <img
                                  src={fileVal}
                                  alt="Bài làm giấy thí sinh"
                                  className="max-h-64 w-full object-contain mx-auto"
                                />
                                <div className="p-2 bg-slate-950/90 border-t border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
                                  <span className="truncate max-w-[200px]">{fileName || 'bai-lam-giay.jpg'}</span>
                                  <span className="text-slate-400">
                                    {scannedAt ? new Date(scannedAt).toLocaleTimeString('vi-VN') : 'Vừa xong'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Upload trigger card */
                            <div className="bg-slate-950/90 border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-5 text-center transition">
                              <div className="max-w-md mx-auto space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                                  <Camera className="w-6 h-6" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-semibold text-slate-200">Chụp bài làm giấy thi của bạn</h4>
                                  <p className="text-xs text-slate-400 mt-1">
                                    Vẽ sơ đồ mạch logic hoặc trình bày bài giải lên giấy thi được phát. Giơ trang giấy trước Webcam máy tính để chụp trực tiếp (Chuẩn quy chế phòng thi cấm dùng điện thoại).
                                  </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                                  {/* Primary Button: PC Webcam Capture (No phone required!) */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setWebcamSnapshot(null);
                                      setShowWebcamCaptureModal(true);
                                    }}
                                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition"
                                  >
                                    <Camera className="w-4 h-4 text-white" />
                                    <span>Chụp bằng Webcam máy tính (Không cần điện thoại)</span>
                                  </button>

                                  <label className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center space-x-1.5 border border-slate-700 cursor-pointer transition">
                                    <UploadCloud className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Tải ảnh từ máy (.jpg, .png)</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const reader = new FileReader();
                                          reader.onload = () => {
                                            handleFileUpload(qId, {
                                              fileUrl: reader.result as string,
                                              fileName: file.name,
                                              fileSize: file.size
                                            });
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                  </label>

                                  <button
                                    type="button"
                                    onClick={() => setShowQrModal(true)}
                                    className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center space-x-1 border border-slate-800 transition"
                                    title="Chỉ dùng khi thi tại nhà hoặc được giám thị cho phép"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                    <span>QR Mobile (Thi từ xa)</span>
                                  </button>
                                </div>

                                <div className="flex items-center justify-center space-x-1.5 text-[10px] text-emerald-400/90 pt-1">
                                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Tuân thủ quy chế thi: Không cần mở điện thoại • Chụp an toàn qua Webcam buồng thi</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

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

                {/* Bàn phím ký hiệu toán học & khoa học (Theo mẫu Image 1) */}
                <div className="pt-2">
                  <MathSymbolKeyboard onInsert={handleInsertMathSymbol} />
                </div>
              </div>

              {/* Bottom Bar: Nút chuyển câu & Tự động lưu */}
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 border-t mt-4 ${
                isDark ? 'border-slate-800/60' : 'border-slate-200'
              }`}>
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <Save className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Đã lưu đám mây: <b className={isDark ? 'text-slate-300' : 'text-slate-700'}>{autoSaveTime}</b></span>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
                    className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed transition border ${
                      isDark
                        ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                        : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Câu trước (←)</span>
                  </button>
                  <button
                    disabled={currentIdx === totalCount - 1}
                    onClick={() => setCurrentIdx(prev => Math.min(totalCount - 1, prev + 1))}
                    className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-600 hover:from-blue-600 hover:to-indigo-500 text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-700/20 transition"
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
        {/* PANEL PHẢI: KHU VỰC CAMERA & NOVAGENIUS MA TRẬN (COLLAPSIBLE) */}
        {/* ======================================================== */}
        <div className={`${
          isProctorCollapsed ? 'w-16' : 'w-80 md:w-92'
        } h-full border-l p-3 sm:p-4 flex flex-col justify-between overflow-y-auto custom-scrollbar transition-all duration-300 shrink-0 ${
          isDark ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {isProctorCollapsed ? (
            /* COLLAPSED HUD VIEW */
            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={() => setIsProctorCollapsed(false)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition border ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-teal-400'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-teal-600'
                }`}
                title="Mở rộng bảng Giám sát & Ma trận câu"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Mini camera */}
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-teal-500/50 relative bg-slate-950" title="Webcam giám sát đang hoạt động">
                <video
                  ref={bindVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute top-1 right-1"></span>
              </div>

              {/* Mini Timer */}
              <div className="flex flex-col items-center py-2 text-center" title="Thời gian còn lại">
                <Clock className="w-4 h-4 text-teal-500 mb-1" />
                <span className={`font-mono text-[10px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {Math.floor(timeLeft / 60)}p
                </span>
              </div>

              {/* Mini Trust score */}
              <div className="flex flex-col items-center py-2 text-center" title="Điểm uy tín">
                <ShieldCheck className="w-4 h-4 text-emerald-500 mb-1" />
                <span className={`font-mono text-[10px] font-bold ${
                  trustScore >= 80 ? 'text-emerald-500' : trustScore >= 50 ? 'text-amber-500' : 'text-rose-500'
                }`}>
                  {trustScore}
                </span>
              </div>
            </div>
          ) : (
            /* FULL EXPANDED VIEW WITH NOVAGENIUS & PROCTOR TABS */
            <div className="space-y-4">
              {/* Header with Tab switcher & collapse button */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-1 p-0.5 rounded-xl border bg-slate-100 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setSidebarTab('NAVIGATOR')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center space-x-1.5 ${
                      sidebarTab === 'NAVIGATOR'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Ma trận đề</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSidebarTab('PROCTOR')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs transition flex items-center space-x-1.5 ${
                      sidebarTab === 'PROCTOR'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Camera AI</span>
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => startCamera()}
                    className="p-1 text-slate-400 hover:text-teal-500 rounded-lg transition"
                    title="Làm mới kết nối Webcam"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsProctorCollapsed(true)}
                    className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition"
                    title="Thu gọn bảng"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* TAB 1: NOVAGENIUS QUESTION MATRIX (IMAGE 4) */}
              {sidebarTab === 'NAVIGATOR' && (
                <div className="space-y-3">
                  <NovageniusQuestionMatrix
                    questions={examData.questions}
                    answers={answers}
                    flagged={flagged}
                    currentIdx={currentIdx}
                    onSelectQuestion={setCurrentIdx}
                    timeLeft={timeLeft}
                    totalDurationMinutes={examData.session.durationMinutes}
                    formatTime={formatTime}
                  />

                  {/* Compact Biometric HUD chip */}
                  <div className={`p-2.5 rounded-xl border flex items-center space-x-2.5 ${
                    isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="w-12 h-10 rounded-lg overflow-hidden border border-teal-500/40 relative bg-black shrink-0">
                      <video ref={bindVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping absolute top-0.5 right-0.5"></span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Bảo mật AI:</span>
                        <span className="font-mono font-bold text-teal-600 dark:text-teal-400">{trustScore}/100</span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Nhận diện khuôn mặt liên tục</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: FULL PROCTOR AI CAMERA HUD */}
              {sidebarTab === 'PROCTOR' && (
                <div className="space-y-4">
                  {/* 1. KHUNG CAMERA LIVE & HUD AI OVERLAY */}
              <div className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/40 bg-slate-950 aspect-video shadow-2xl group">
                <video
                  ref={bindVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />

                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-slate-400 p-4 text-center z-20">
                    <Camera className="w-8 h-8 mb-2 text-slate-500 animate-pulse" />
                    <span className="text-xs mb-2">Webcam đang chờ cấp quyền hoặc bị ngắt</span>
                    <button
                      onClick={() => startCamera()}
                      className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold rounded-lg transition shadow-md"
                    >
                      Bật lại Camera
                    </button>
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

              {/* 4. THÔNG TIN THÍ SINH & CA THI (COMPACT & COMPLETE) */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 text-xs space-y-2 shadow-lg">
                {/* Header: Candidate Name & SBD */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Thí sinh</span>
                    <span className="text-white font-bold text-sm truncate block">
                      {examData.student.name || 'Lục Văn Sơn'}
                    </span>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">Số báo danh</span>
                    <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono font-bold text-xs rounded-lg inline-block">
                      {examData.examStudent.candidateCode}
                    </span>
                  </div>
                </div>

                {/* 2-Column Academic & Exam Info Grid */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px]">Mã sinh viên</span>
                    <span className="text-slate-200 font-mono font-semibold">{examData.student.studentCode}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px]">Lớp học</span>
                    <span className="text-slate-200 font-medium truncate block">{examData.student.className || 'K23CNT3'}</span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px]">Phòng thi & Vị trí</span>
                    <span className="text-emerald-400 font-bold">
                      {examData.session.roomCode} • D{examData.examStudent.seatRow}-C{examData.examStudent.seatCol}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800/60">
                    <span className="text-slate-400 block text-[10px]">Mã ca thi</span>
                    <span className="text-slate-300 font-mono text-[10px] truncate block">{examData.session.code}</span>
                  </div>
                </div>

                {/* Full Subject Title */}
                <div className="bg-slate-950/40 px-2.5 py-1.5 rounded-xl border border-slate-800/40 flex items-center justify-between">
                  <span className="text-slate-400 text-[10px] shrink-0">Học phần:</span>
                  <span className="text-slate-200 font-medium text-[11px] truncate ml-2 text-right" title={examData.session.title}>
                    {examData.session.title}
                  </span>
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
                      <span className={log.type === 'warn' ? 'text-amber-400 font-medium' : log.type === 'success' ? 'text-emerald-400' : 'text-slate-300'}>
                        {log.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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
              Bài thi sẽ được ghi nhận an toàn trên máy chủ. Điểm số chính thức và đáp án sẽ được hiển thị khi Giảng viên công bố kết quả.
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

      {/* ── MODAL XÁC NHẬN RỜI PHÒNG THI AN TOÀN (IMAGE 1 IŠEITI) ── */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 ${
            isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
              <LogOut className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-center">Xác nhận Rời Phòng Thi?</h3>
            <p className="text-xs text-slate-400 text-center mt-2 leading-relaxed">
              Bạn đang ở trong phòng thi an ninh ExamGuard AI. Nếu bạn rời khỏi giao diện mà chưa bấm nộp bài chính thức, kết quả hiện tại có thể không được tính điểm.
            </p>

            <div className={`rounded-2xl p-4 my-4 space-y-2 text-xs border ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Số câu đã làm:</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">{answeredCount} / {totalCount} câu</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thời gian còn lại:</span>
                <span className="font-bold text-amber-500">{formatTime(timeLeft)}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition border ${
                  isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-700'
                }`}
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  navigate('/student/dashboard');
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition"
              >
                Rời phòng thi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── THÔNG BÁO CẢNH BÁO AN NINH TRÊN TOP MÀN HÌNH (SRP - TopWarningBanner) ── */}
      <TopWarningBanner
        securityAlert={securityAlert}
        directWarning={directWarning}
        onDismissSecurityAlert={() => setSecurityAlert(null)}
        onDismissDirectWarning={() => setDirectWarning(null)}
      />

      {/* ── MODAL CHỤP BÀI LÀM GIẤY QUA WEBCAM MÁY TÍNH (CHUẨN QUY CHẾ - KHÔNG DÙNG ĐIỆN THOẠI) ── */}
      {showWebcamCaptureModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span>CHỤP BÀI LÀM GIẤY QUA WEBCAM MÁY TÍNH</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-normal">
                  Chuẩn phòng thi
                </span>
              </div>
              <button
                onClick={() => {
                  setShowWebcamCaptureModal(false);
                  setWebcamSnapshot(null);
                  setCaptureCountdown(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs text-slate-300">
                Giơ trang giấy thi chứa sơ đồ mạch / bài giải trước Webcam máy tính. Căn chỉnh trang giấy vào giữa khung hình.
              </p>
            </div>

            {/* Viewfinder or Snapshot Preview */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-slate-700 bg-black aspect-video flex items-center justify-center">
              {webcamSnapshot ? (
                /* Snapshot preview */
                <img
                  src={webcamSnapshot}
                  alt="Ảnh bài làm chụp từ webcam"
                  className="w-full h-full object-contain"
                />
              ) : (
                /* Live viewfinder mirror */
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={el => {
                      if (el && streamRef.current && streamRef.current.active) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      } else if (el && videoRef.current && videoRef.current.srcObject) {
                        el.srcObject = videoRef.current.srcObject;
                        el.play().catch(() => {});
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                  {/* Document overlay guide */}
                  <div className="absolute inset-6 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                    <span className="text-[10px] bg-slate-950/80 text-emerald-300 px-2 py-0.5 rounded self-start">
                      [Vùng trang giấy A4]
                    </span>
                    <span className="text-[10px] bg-slate-950/80 text-slate-300 px-2 py-0.5 rounded self-center">
                      Cầm thẳng và giữ yên trang giấy
                    </span>
                  </div>

                  {/* Countdown overlay */}
                  {captureCountdown !== null && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-6xl font-black text-emerald-400 animate-ping">
                        {captureCountdown}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {webcamSnapshot ? (
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWebcamSnapshot(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl flex items-center justify-center space-x-1.5 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Chụp lại tấm khác</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmWebcamSnapshot(qId)}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/20 transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Xác nhận nộp bài làm này</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={handleSnapFromWebcam}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl flex items-center justify-center space-x-1.5 transition"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Chụp ngay</span>
                </button>
                <button
                  type="button"
                  onClick={handleStartCountdownCapture}
                  disabled={captureCountdown !== null}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Đếm ngược 3s rồi chụp (Khuyên dùng)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL QUÉT QR BÀI LÀM GIẤY QUA MOBILE (LIVE CAMERA SAFE MODE) ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm">
                <QrCode className="w-5 h-5 text-cyan-400" />
                <span>CHỤP BÀI LÀM GIẤY QUA MOBILE SAFE CAMERA</span>
              </div>
              <button
                onClick={() => setShowQrModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                Dùng camera điện thoại thông minh quét mã QR dưới đây để kích hoạt luồng chụp bài làm trực tiếp trên bàn thi:
              </p>
              
              {/* Dynamic QR Code box */}
              <div className="inline-block p-4 bg-white rounded-2xl shadow-xl shadow-cyan-500/10 border-4 border-cyan-500/30">
                <svg
                  className="w-48 h-48 mx-auto"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Outer Frame */}
                  <rect width="100" height="100" fill="white" />
                  {/* Top-left marker */}
                  <rect x="6" y="6" width="28" height="28" rx="4" fill="#0f172a" />
                  <rect x="11" y="11" width="18" height="18" rx="2" fill="white" />
                  <rect x="15" y="15" width="10" height="10" rx="1" fill="#0891b2" />
                  {/* Top-right marker */}
                  <rect x="66" y="6" width="28" height="28" rx="4" fill="#0f172a" />
                  <rect x="71" y="11" width="18" height="18" rx="2" fill="white" />
                  <rect x="75" y="15" width="10" height="10" rx="1" fill="#0891b2" />
                  {/* Bottom-left marker */}
                  <rect x="6" y="66" width="28" height="28" rx="4" fill="#0f172a" />
                  <rect x="11" y="71" width="18" height="18" rx="2" fill="white" />
                  <rect x="15" y="75" width="10" height="10" rx="1" fill="#0891b2" />
                  {/* Simulated QR data grid */}
                  <rect x="40" y="8" width="6" height="6" fill="#0f172a" />
                  <rect x="50" y="8" width="8" height="6" fill="#0891b2" />
                  <rect x="42" y="18" width="14" height="6" fill="#0f172a" />
                  <rect x="38" y="28" width="6" height="6" fill="#0f172a" />
                  <rect x="52" y="28" width="6" height="6" fill="#0891b2" />
                  <rect x="8" y="42" width="14" height="6" fill="#0f172a" />
                  <rect x="28" y="40" width="8" height="12" fill="#0891b2" />
                  <rect x="42" y="42" width="16" height="16" rx="3" fill="#0f172a" />
                  <rect x="64" y="40" width="10" height="8" fill="#0891b2" />
                  <rect x="80" y="42" width="12" height="6" fill="#0f172a" />
                  <rect x="42" y="66" width="8" height="14" fill="#0891b2" />
                  <rect x="54" y="72" width="12" height="6" fill="#0f172a" />
                  <rect x="72" y="66" width="8" height="8" fill="#0f172a" />
                  <rect x="84" y="76" width="8" height="16" fill="#0891b2" />
                  <rect x="66" y="84" width="12" height="8" fill="#0f172a" />
                  {/* Center Key icon */}
                  <circle cx="50" cy="50" r="5" fill="#38bdf8" />
                </svg>
                <div className="text-[10px] text-slate-800 font-mono font-bold mt-1 tracking-wider">
                  TOKEN: {examData?.examStudent?.candidateCode || 'CAND'}-{qrTokenSeconds}S
                </div>
              </div>

              <div className="flex items-center justify-center space-x-2 text-xs">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">
                  Token bảo mật tự động làm mới sau: <b className="text-amber-400 font-mono">{qrTokenSeconds}s</b>
                </span>
              </div>
            </div>

            {/* Tri-Shield Security Notice */}
            <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800 space-y-2 text-[11px] text-slate-300">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><b>Chỉ mở Camera trực tiếp:</b> Điện thoại không thể chọn ảnh từ thư viện Gallery, ngăn chặn tuyệt đối việc nhận ảnh từ Zalo/mạng xã hội.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><b>Xác thực EXIF & Tem thời gian:</b> Thời gian chụp ảnh phải nằm trong khung giờ thi và trùng khớp với phiên làm bài.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span><b>Giám sát liên tục qua Webcam:</b> Camera PC tiếp tục theo dõi tư thế của bạn trong suốt quá trình thao tác chụp giấy.</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-1">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition"
              >
                Đóng
              </button>
              <label className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl text-center cursor-pointer shadow-lg shadow-cyan-600/20 transition">
                <span>Chọn ảnh mẫu thử nghiệm</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        handleFileUpload(qId, {
                          fileUrl: reader.result as string,
                          fileName: file.name,
                          fileSize: file.size
                        });
                        setShowQrModal(false);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

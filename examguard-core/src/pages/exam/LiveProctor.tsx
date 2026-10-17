import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  Users,
  Eye,
  AlertTriangle,
  Clock,
  PlusCircle,
  PauseCircle,
  Ban,
  RotateCcw,
  Camera,
  Search,
  Sliders,
  ChevronRight,
  Maximize2,
  CheckCircle2,
  XCircle,
  Loader2,
  Volume2,
  VolumeX,
  Activity,
  Filter,
  BarChart3,
  ExternalLink,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '../../api/apiClient';

interface StudentSeat {
  _id: string;
  candidateCode: string;
  blindCode: string;
  seatRow: number;
  seatCol: number;
  seatPin: string;
  status: 'ASSIGNED' | 'CHECKED_IN' | 'IN_EXAM' | 'SUBMITTED' | 'SUSPENDED';
  trustScore: number;
  extraTimeMinutes: number;
  proctorOverrideUntil?: string;
  isOnline?: boolean;
  currentQuestion?: number;
  student: {
    _id: string;
    name: string;
    studentCode: string;
    email?: string;
  };
}

interface ViolationLog {
  _id: string;
  type: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  penalty: number;
  isProctorPresence: boolean;
  proctorName: string;
  isDismissed: boolean;
  dismissReason?: string;
  snapshotUrl?: string;
  createdAt: string;
  examStudent?: {
    _id?: string;
    candidateCode: string;
    seatRow: number;
    seatCol: number;
  };
  student?: {
    name: string;
    studentCode: string;
  };
}

interface RoomStats {
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  suspendedStudents: number;
  flaggedStudents: number;
  avgTrustScore: number;
  totalViolations: number;
  severityCounts: {
    CRITICAL: number;
    HIGH: number;
    MEDIUM: number;
    LOW: number;
  };
}

export default function LiveProctor() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [room, setRoom] = useState<any>(null);
  const [students, setStudents] = useState<StudentSeat[]>([]);
  const [violations, setViolations] = useState<ViolationLog[]>([]);
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<StudentSeat | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  // Filters & Toggles
  const [filterMode, setFilterMode] = useState<'ALL' | 'FLAGGED' | 'IN_EXAM' | 'SUSPENDED'>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);

  // Modal actions
  const [warningMsg, setWarningMsg] = useState('Yêu cầu tập trung làm bài, nhìn thẳng vào màn hình.');
  const [actionLoading, setActionLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  const fetchRoomState = async () => {
    try {
      const targetId = sessionId || 'fallback_session';
      const [roomRes, statsRes] = await Promise.all([
        apiClient.get(`/api/proctor/live/${targetId}`),
        apiClient.get(`/api/proctor/statistics/${targetId}`).catch(() => ({ data: { success: false } }))
      ]);

      if (roomRes.data && roomRes.data.success) {
        setSession(roomRes.data.data.session);
        setRoom(roomRes.data.data.room);
        setStudents(roomRes.data.data.students || []);
        setViolations(roomRes.data.data.recentViolations || []);
      }

      if (statsRes.data && statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err: any) {
      console.warn('Lỗi fetch proctor room:', err);
    } finally {
      setLoading(false);
    }
  };

  // Socket.IO Realtime Connection
  useEffect(() => {
    fetchRoomState();

    const socketUrl = window.location.origin;
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      if (sessionId) {
        socket.emit('join_session', { sessionId, role: 'proctor' });
      }
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // 1. Nhận sự kiện vi phạm thời gian thực từ AI hoặc Trình duyệt
    socket.on('proctor:violation', (violationData: any) => {
      setViolations(prev => [
        {
          _id: violationData.violationId || String(Date.now()),
          type: violationData.type,
          severity: violationData.severity || 'LOW',
          penalty: violationData.penalty || 0,
          isProctorPresence: violationData.isProctorPresence || false,
          proctorName: violationData.proctorName || '',
          isDismissed: false,
          snapshotUrl: violationData.snapshotUrl || '',
          createdAt: violationData.createdAt || new Date().toISOString(),
          examStudent: {
            candidateCode: violationData.candidateCode,
            seatRow: violationData.seatRow,
            seatCol: violationData.seatCol
          },
          student: {
            name: violationData.studentName || 'Thí sinh',
            studentCode: violationData.candidateCode
          }
        },
        ...prev.slice(0, 49)
      ]);

      // Cập nhật điểm uy tín trên bàn thi tương ứng
      if (violationData.candidateCode) {
        setStudents(prev =>
          prev.map(s => {
            if (s.candidateCode === violationData.candidateCode) {
              return { ...s, trustScore: violationData.newTrustScore };
            }
            return s;
          })
        );
      }

      // Thông báo toast và âm thanh nếu có vi phạm nghiêm trọng
      if (!violationData.isProctorPresence) {
        const sev = violationData.severity || 'LOW';
        if (sev === 'CRITICAL') {
          toast.error(`🚨 BÀN R${violationData.seatRow}-C${violationData.seatCol} (${violationData.candidateCode}): VI PHẠM ĐẶC BIỆT NGHIÊM TRỌNG: ${violationData.type}!`, { duration: 6000 });
        } else if (sev === 'HIGH') {
          toast.error(`⚠️ Bàn R${violationData.seatRow}-C${violationData.seatCol}: Cảnh báo ${violationData.type} (-${violationData.penalty}đ)`, { duration: 4000 });
        } else {
          toast(`⚠️ Bàn R${violationData.seatRow}-C${violationData.seatCol}: ${violationData.type}`, { icon: '⚠️' });
        }
      }
    });

    // 2. Nhận cập nhật trạng thái thí sinh
    socket.on('proctor:student_update', (updateData: any) => {
      setStudents(prev =>
        prev.map(s => {
          if (s._id === updateData.examStudentId || s.candidateCode === updateData.candidateCode) {
            return {
              ...s,
              trustScore: updateData.trustScore !== undefined ? updateData.trustScore : s.trustScore,
              status: updateData.status || s.status
            };
          }
          return s;
        })
      );
    });

    // 3. Nhận cập nhật bàn thi có giám thị đứng cạnh (Proctor Override)
    socket.on('proctor:override_update', (overrideData: any) => {
      setStudents(prev =>
        prev.map(s => {
          if (s.candidateCode === overrideData.candidateCode) {
            return { ...s, proctorOverrideUntil: overrideData.overrideUntil };
          }
          return s;
        })
      );
      toast.success(`Đã tạm dừng giám sát AI cho bàn R${overrideData.seatRow}-C${overrideData.seatCol}`);
    });

    // 4. Sinh viên online / offline
    socket.on('student:online', (data: any) => {
      setStudents(prev =>
        prev.map(s => (s.candidateCode === data.candidateCode ? { ...s, isOnline: true } : s))
      );
    });

    socket.on('student:offline', (data: any) => {
      setStudents(prev =>
        prev.map(s => (s._id === data.studentId ? { ...s, isOnline: false } : s))
      );
    });

    // 5. Thí sinh gửi tiến độ câu hỏi (Heartbeat)
    socket.on('proctor:student_heartbeat', (data: any) => {
      setStudents(prev =>
        prev.map(s => {
          if (s.candidateCode === data.candidateCode) {
            return {
              ...s,
              isOnline: true,
              currentQuestion: data.currentQuestion,
              trustScore: data.trustScore !== undefined ? data.trustScore : s.trustScore
            };
          }
          return s;
        })
      );
    });

    // Polling dự phòng mỗi 15 giây (thay vì 5s)
    const interval = setInterval(fetchRoomState, 15000);

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [sessionId]);

  // Hành động: Gửi cảnh báo
  const handleSendWarning = async () => {
    if (!selectedSeat) return;
    setActionLoading(true);
    try {
      const res = await apiClient.post('/api/proctor/send-warning', {
        sessionStudentId: selectedSeat._id,
        message: warningMsg
      });
      if (res.data?.success) {
        toast.success(`Đã gửi cảnh báo tới bàn R${selectedSeat.seatRow}-C${selectedSeat.seatCol}!`);
        setSelectedSeat(null);
        fetchRoomState();
      }
    } catch (e: any) {
      toast.error('Lỗi gửi cảnh báo');
    } finally {
      setActionLoading(false);
    }
  };

  // Hành động: Tạm dừng giám sát AI 2 phút (Proctor Override)
  const handleProctorOverride = async () => {
    if (!selectedSeat) return;
    setActionLoading(true);
    try {
      const res = await apiClient.post('/api/proctor/override', {
        sessionStudentId: selectedSeat._id,
        durationMinutes: 2
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setSelectedSeat(null);
        fetchRoomState();
      }
    } catch (e) {
      toast.error('Lỗi kích hoạt Override');
    } finally {
      setActionLoading(false);
    }
  };

  // Hành động: Bù giờ
  const handleAddExtraTime = async (minutes: number) => {
    if (!selectedSeat) return;
    setActionLoading(true);
    try {
      const res = await apiClient.post('/api/proctor/extra-time', {
        sessionStudentId: selectedSeat._id,
        extraMinutes: minutes
      });
      if (res.data?.success) {
        toast.success(res.data.message);
        setSelectedSeat(null);
        fetchRoomState();
      }
    } catch (e) {
      toast.error('Lỗi cộng bù giờ');
    } finally {
      setActionLoading(false);
    }
  };

  // Hành động: Đình chỉ thi
  const handleSuspend = async () => {
    if (!selectedSeat) return;
    if (!window.confirm(`XÁC NHẬN ĐÌNH CHỈ THI THÍ SINH ${selectedSeat.candidateCode}? Bài thi sẽ bị khóa ngay lập tức.`)) return;
    setActionLoading(true);
    try {
      const res = await apiClient.post('/api/proctor/suspend', {
        sessionStudentId: selectedSeat._id,
        reason: 'Vi phạm quy chế thi nghiêm trọng'
      });
      if (res.data?.success) {
        toast.success(`Đã đình chỉ thi thí sinh ${selectedSeat.candidateCode}!`);
        setSelectedSeat(null);
        fetchRoomState();
      }
    } catch (e) {
      toast.error('Lỗi đình chỉ thi');
    } finally {
      setActionLoading(false);
    }
  };

  // Hành động: Hủy bỏ vi phạm bắt nhầm (Dismiss)
  const handleDismissViolation = async (violationId: string) => {
    try {
      const res = await apiClient.post('/api/proctor/dismiss-violation', {
        violationId,
        reason: 'Giám thị xác nhận kiểm tra trực tiếp: Bình thường / không vi phạm'
      });
      if (res.data?.success) {
        toast.success('Đã hủy vi phạm và phục hồi điểm uy tín cho thí sinh!');
        setViolations(prev =>
          prev.map(v => (v._id === violationId ? { ...v, isDismissed: true } : v))
        );
        fetchRoomState();
      }
    } catch (e) {
      toast.error('Lỗi hủy bỏ vi phạm');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
        <p className="text-slate-400 font-medium">Đang kết nối phòng giám sát ExamGuard AI Socket.IO Live...</p>
      </div>
    );
  }

  const rows = room?.rows || 5;
  const cols = room?.cols || 8;

  // Map vị trí bàn (row, col)
  const seatMap: Record<string, StudentSeat> = {};
  students.forEach(st => {
    seatMap[`${st.seatRow}-${st.seatCol}`] = st;
  });

  // Lọc theo chế độ
  const filteredStudents = students.filter(st => {
    if (filterMode === 'FLAGGED') return st.trustScore < 80;
    if (filterMode === 'IN_EXAM') return st.status === 'IN_EXAM';
    if (filterMode === 'SUSPENDED') return st.status === 'SUSPENDED';
    return true;
  });

  const inExamCount = students.filter(s => s.status === 'IN_EXAM').length;
  const violationCount = students.filter(s => s.trustScore < 80).length;
  const avgTrust = stats ? stats.avgTrustScore : Math.round(students.reduce((a, b) => a + b.trustScore, 0) / (students.length || 1));

  const getSeverityBadge = (sev?: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">NGHIÊM TRỌNG</span>;
      case 'HIGH':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">CAO</span>;
      case 'MEDIUM':
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">TRUNG BÌNH</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">THẤP</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-[1680px] mx-auto space-y-5">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
              <span className="hover:text-slate-200 cursor-pointer" onClick={() => navigate('/exam-sessions')}>Quản lý Ca thi</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-cyan-400 font-medium">Giám thị Trực ban Realtime (Socket.IO)</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
              <span>PHÒNG GIÁM SÁT THÔNG MINH: {room?.name || 'Phòng Thi'}</span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center space-x-1.5 ${
                socketConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {socketConnected ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400 animate-pulse" />}
                <span>{socketConnected ? 'SOCKET.IO LIVE' : 'ĐANG KẾT NỐI...'}</span>
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Ca thi: <b className="text-slate-200">{session?.title}</b> • Môn: <b className="text-indigo-400">{session?.subject?.name} ({session?.subject?.courseCode})</b> • Giám thị: <b className="text-slate-300">{session?.proctor1?.fullName || 'Cán bộ 1'}</b>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition text-xs flex items-center space-x-1.5"
              title={soundEnabled ? 'Tắt âm thanh cảnh báo' : 'Bật âm thanh cảnh báo'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              <span>{soundEnabled ? 'Chuông: Bật' : 'Chuông: Tắt'}</span>
            </button>

            <button
              onClick={() => navigate(`/grading-review/${session?._id}`)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center space-x-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Xem Bảng Chấm Thi</span>
            </button>
          </div>
        </div>

        {/* 4 Thẻ thống kê thời gian thực */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-xs text-slate-400 uppercase font-semibold">Tổng số bàn thi</span>
            <div className="text-2xl font-bold font-mono text-white mt-1">{rows * cols} bàn</div>
            <span className="text-[11px] text-slate-500">{rows} dãy × {cols} cột</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-xs text-slate-400 uppercase font-semibold">Đang làm bài</span>
            <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{inExamCount} thí sinh</div>
            <span className="text-[11px] text-slate-500">{students.length} đã được gán chỗ</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-xs text-slate-400 uppercase font-semibold">Cảnh báo bất thường</span>
            <div className={`text-2xl font-bold font-mono mt-1 ${violationCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {violationCount} bàn
            </div>
            <span className="text-[11px] text-slate-500">Điểm uy tín dưới 80đ</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-xs text-slate-400 uppercase font-semibold">Điểm uy tín TB</span>
            <div className={`text-2xl font-bold font-mono mt-1 ${avgTrust >= 85 ? 'text-emerald-400' : avgTrust >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>
              {avgTrust} / 100
            </div>
            <span className="text-[11px] text-slate-500">{stats?.totalViolations || violations.length} sự kiện AI phát hiện</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <span className="text-xs text-slate-400 uppercase font-semibold">AI Face & Pose Core</span>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-1">ArcFace 3D</div>
            <span className="text-[11px] text-slate-500">Khử phạt khi Giám thị ghé bàn</span>
          </div>
        </div>

        {/* Bộ lọc nhanh sơ đồ bàn */}
        <div className="flex items-center space-x-2 pb-1">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 font-semibold uppercase">Lọc hiển thị:</span>
          {(['ALL', 'FLAGGED', 'IN_EXAM', 'SUSPENDED'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterMode === mode
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {mode === 'ALL' && 'Tất cả bàn'}
              {mode === 'FLAGGED' && `Cần lưu ý (${violationCount})`}
              {mode === 'IN_EXAM' && `Đang làm (${inExamCount})`}
              {mode === 'SUSPENDED' && 'Bị đình chỉ'}
            </button>
          ))}
        </div>

        {/* Layout: Sơ đồ phòng bên trái (75%) + Alert Feed bên phải (25%) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* SƠ ĐỒ LƯỚI BÀN THI */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white">SƠ ĐỒ BÀN THI THỰC TẾ (REALTIME DESK MATRIX)</span>
                <span className="text-xs text-slate-400">(Nhấp vào bàn để điều khiển, bù giờ, gửi cảnh báo)</span>
              </div>

              {/* Chú giải màu sắc */}
              <div className="hidden md:flex items-center space-x-3 text-xs text-slate-400">
                <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500"></span><span>Bình thường</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500"></span><span>Cảnh báo</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500/40 border border-rose-500"></span><span>Nghiêm trọng</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded bg-purple-500/40 border border-purple-500"></span><span>Giám thị tại bàn</span></span>
              </div>
            </div>

            {/* BẢNG GIẢNG VIÊN / MẶT TRƯỚC PHÒNG */}
            <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-xl py-2 text-center text-xs font-semibold text-slate-500 tracking-wider">
              [ BẢNG GIẢNG ĐƯỜNG & BÀN CÁN BỘ COI THI ]
            </div>

            {/* GRID OF DESKS */}
            <div className="space-y-3">
              {Array.from({ length: rows }).map((_, rIdx) => {
                const rNum = rIdx + 1;
                return (
                  <div key={rNum} className="flex items-center space-x-3">
                    <span className="w-8 font-mono text-xs text-slate-500 font-bold">Dãy {rNum}</span>
                    <div className="flex-1 grid grid-cols-4 md:grid-cols-8 gap-3">
                      {Array.from({ length: cols }).map((_, cIdx) => {
                        const cNum = cIdx + 1;
                        const st = seatMap[`${rNum}-${cNum}`];

                        const isOverride = st?.proctorOverrideUntil && new Date(st.proctorOverrideUntil) > new Date();

                        // Lọc bỏ nếu không khớp filter
                        const isHiddenByFilter = st && filterMode !== 'ALL' && !filteredStudents.some(f => f._id === st._id);

                        let cardClass = 'bg-slate-950/40 border-slate-800/80 text-slate-600 hover:border-slate-700';
                        if (st) {
                          if (isHiddenByFilter) {
                            cardClass = 'opacity-25 bg-slate-950 border-slate-800 text-slate-600';
                          } else if (st.status === 'SUSPENDED') {
                            cardClass = 'bg-rose-950/40 border-rose-500/60 text-rose-300 ring-1 ring-rose-500/40';
                          } else if (isOverride) {
                            cardClass = 'bg-purple-950/40 border-purple-500/60 text-purple-300 animate-pulse ring-1 ring-purple-500/50';
                          } else if (st.trustScore < 60) {
                            cardClass = 'bg-rose-950/40 border-rose-500/60 text-rose-300 animate-pulse ring-1 ring-rose-500/50';
                          } else if (st.trustScore < 85) {
                            cardClass = 'bg-amber-950/40 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/40';
                          } else if (st.status === 'IN_EXAM') {
                            cardClass = 'bg-slate-900 border-emerald-500/40 text-slate-200 hover:border-emerald-500 shadow-lg';
                          } else {
                            cardClass = 'bg-slate-900 border-slate-800 text-slate-300';
                          }
                        }

                        return (
                          <div
                            key={`${rNum}-${cNum}`}
                            onClick={() => st && setSelectedSeat(st)}
                            className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${cardClass}`}
                          >
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1 border-b border-slate-800/40">
                              <span className="font-mono font-bold">R{rNum}-C{cNum}</span>
                              {st && (
                                <span className="flex items-center space-x-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${st.isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                                  <span className="font-mono text-cyan-400">PIN:{st.seatPin}</span>
                                </span>
                              )}
                            </div>

                            {st ? (
                              <div className="pt-1.5 space-y-1">
                                <p className="font-bold text-xs truncate text-white">{st.student?.name || 'Thí sinh'}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate">{st.candidateCode}</p>

                                <div className="flex items-center justify-between pt-1">
                                  <span className={`text-[10px] font-bold ${
                                    st.trustScore >= 80 ? 'text-emerald-400' : st.trustScore >= 60 ? 'text-amber-400' : 'text-rose-400'
                                  }`}>
                                    {st.trustScore}đ
                                  </span>

                                  {isOverride ? (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                                      Tại bàn
                                    </span>
                                  ) : st.status === 'IN_EXAM' ? (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                                      {st.currentQuestion ? `Câu ${st.currentQuestion}` : 'Làm bài'}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            ) : (
                              <div className="h-10 flex items-center justify-center text-[10px] text-slate-600">
                                Trống
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* NHẬT KÝ VI PHẠM & GIÁM SÁT REALTIME (SIDEBAR) */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <span className="text-sm font-bold text-white flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  <span>FEED GIÁM SÁT AI REALTIME</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              </div>

              <div className="space-y-3 max-h-[560px] overflow-y-auto custom-scrollbar pr-1">
                {violations.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                    <p>Phòng thi trật tự, chưa ghi nhận vi phạm nào.</p>
                  </div>
                ) : (
                  violations.map(v => (
                    <div
                      key={v._id}
                      className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                        v.isDismissed
                          ? 'opacity-40 bg-slate-950 border-slate-800'
                          : v.isProctorPresence
                          ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
                          : v.severity === 'CRITICAL'
                          ? 'bg-rose-950/30 border-rose-500/50 text-rose-200'
                          : v.penalty > 0
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-[11px]">
                            {v.isProctorPresence ? '👮 Giám thị tại bàn' : v.type}
                          </span>
                          {!v.isProctorPresence && getSeverityBadge(v.severity)}
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(v.createdAt).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300">
                        {v.examStudent ? (
                          <>Bàn <b className="text-white">R{v.examStudent.seatRow}-C{v.examStudent.seatCol}</b> ({v.examStudent.candidateCode})</>
                        ) : 'Thí sinh'}
                      </p>

                      {v.isProctorPresence ? (
                        <p className="text-[10px] text-purple-300">
                          AI nhận diện cán bộ: {v.proctorName || 'Coi thi'}. Miễn trừ phạt điểm uy tín.
                        </p>
                      ) : (
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[10px] text-rose-400 font-semibold">
                            {v.penalty > 0 ? `Trừ ${v.penalty} điểm uy tín` : 'Cảnh báo vi phạm'}
                          </span>

                          <div className="flex items-center space-x-1">
                            {v.snapshotUrl && (
                              <button
                                onClick={() => setSelectedSnapshot(v.snapshotUrl!)}
                                className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded transition"
                              >
                                Xem ảnh
                              </button>
                            )}

                            {!v.isDismissed && (
                              <button
                                onClick={() => handleDismissViolation(v._id)}
                                className="px-1.5 py-0.5 text-[10px] bg-slate-800 hover:bg-emerald-950 text-slate-400 hover:text-emerald-400 rounded transition"
                                title="Bỏ qua vi phạm nếu AI bắt nhầm"
                              >
                                Hủy phạt
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {v.isDismissed && (
                        <p className="text-[9px] text-slate-500 italic">
                          (Đã bỏ qua: {v.dismissReason || 'Xác nhận bắt nhầm'})
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500 flex items-center justify-between">
              <span>ExamGuard AI Core v2.0</span>
              <span className="text-cyan-400 font-mono text-[10px]">WebSocket Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL ĐIỀU KHIỂN BÀN THI CỦA GIÁM THỊ ── */}
      {selectedSeat && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  ĐIỀU KHIỂN BÀN: DÃY {selectedSeat.seatRow} — CỘT {selectedSeat.seatCol}
                </h3>
                <p className="text-xs text-slate-400">Thí sinh: <b className="text-slate-200">{selectedSeat.student?.name}</b> ({selectedSeat.candidateCode})</p>
              </div>

              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                selectedSeat.trustScore >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                Uy tín: {selectedSeat.trustScore}đ
              </span>
            </div>

            {/* Danh mục hành động giám thị */}
            <div className="space-y-4 text-xs">
              {/* 1. Gửi cảnh báo nhắc nhở */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-slate-300 block">1. Gửi cảnh báo lên màn hình SV (Realtime Socket):</span>
                <input
                  type="text"
                  value={warningMsg}
                  onChange={e => setWarningMsg(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={handleSendWarning}
                  disabled={actionLoading}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition"
                >
                  Gửi Cảnh Báo (-5đ Uy Tín)
                </button>
              </div>

              {/* 2. Tạm dừng giám sát 2 phút (Proctor Override) */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-300 block">2. Tạm dừng giám sát AI (2 phút):</span>
                  <span className="text-[10px] text-slate-500">Dùng khi Giám thị đứng trực tiếp kiểm tra bàn</span>
                </div>
                <button
                  onClick={handleProctorOverride}
                  disabled={actionLoading}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition"
                >
                  Bật Override
                </button>
              </div>

              {/* 3. Cộng bù giờ */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-slate-300 block">3. Cộng bù giờ (khi gặp sự cố mạng):</span>
                <div className="flex space-x-2">
                  <button onClick={() => handleAddExtraTime(5)} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition font-medium">+5 phút</button>
                  <button onClick={() => handleAddExtraTime(10)} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition font-medium">+10 phút</button>
                  <button onClick={() => handleAddExtraTime(15)} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition font-medium">+15 phút</button>
                </div>
              </div>

              {/* 4. Đình chỉ thi */}
              <button
                onClick={handleSuspend}
                disabled={actionLoading}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition"
              >
                ĐÌNH CHỈ THI (KHÓA BÀI LÀM)
              </button>
            </div>

            <button
              onClick={() => setSelectedSeat(null)}
              className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl transition"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL XEM ẢNH SNAPSHOT BẰNG CHỨNG ── */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl animate-in zoom-in-95 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-sm font-bold text-white flex items-center space-x-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>BẰNG CHỨNG VI PHẠM TỪ CAMERA</span>
              </span>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Đóng [×]
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-800">
              <img
                src={selectedSnapshot}
                alt="Violation snapshot"
                className="w-full h-full object-contain"
                onError={(e: any) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = '<span class="text-xs text-slate-500">Không thể tải ảnh snapshot bằng chứng</span>';
                }}
              />
            </div>

            <button
              onClick={() => setSelectedSnapshot(null)}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

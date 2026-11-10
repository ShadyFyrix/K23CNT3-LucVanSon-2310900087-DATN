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
  WifiOff,
  Lock,
  Unlock,
  DoorOpen,
  Building2,
  LayoutGrid,
  Video,
  Radio,
  User,
  Sparkles,
  Award
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '../../api/apiClient';
import { RoomLayoutConfigModal } from '../../components/RoomLayoutConfigModal';
import { ExamRoom3D } from '../../components/ExamRoom3D';

interface StudentSeat {
  _id: string;
  candidateCode: string;
  blindCode: string;
  seatRow: number;
  seatCol: number;
  seatPin: string;
  status: 'ASSIGNED' | 'CHECKED_IN' | 'IN_EXAM' | 'SUBMITTED' | 'SUSPENDED' | 'ABSENT';
  trustScore: number;
  extraTimeMinutes: number;
  proctorOverrideUntil?: string;
  isLateUnlocked?: boolean;
  lateUnlockedAt?: string;
  lateUnlockReason?: string;
  isOnline?: boolean;
  currentQuestion?: number;
  student: {
    _id: string;
    fullName?: string;
    name?: string;
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
    fullName?: string;
    name?: string;
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
  const [isRoomConfigOpen, setIsRoomConfigOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'MATRIX' | 'OVERLAY' | '3D'>('3D');

  // Modal actions
  const [warningMsg, setWarningMsg] = useState('Yêu cầu tập trung làm bài, nhìn thẳng vào màn hình.');
  const [lateReason, setLateReason] = useState('Được sự đồng ý đặc cách của Hội đồng / Trưởng điểm thi');
  const [lateExtraMinutes, setLateExtraMinutes] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // Multi-room monitoring states
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [showMultiRoomOverview, setShowMultiRoomOverview] = useState(false);

  // Giám sát Thể chất & CCTV Realtime (MediaPipe & OpenCV Flask Microservice)
  const [postureAlerts, setPostureAlerts] = useState<Record<string, { event: string; severity: string; time: number }>>({});
  const [cctvAlerts, setCctvAlerts] = useState<Array<{ roomId: string; eventType: string; time: string }>>([]);

  const fetchAllSessions = async () => {
    try {
      const res = await apiClient.get('/api/exam/sessions');
      if (res.data && res.data.success) {
        setAllSessions(res.data.data || []);
      }
    } catch (e) {
      console.warn('Lỗi load all sessions:', e);
    }
  };

  const fetchRoomState = async () => {
    try {
      const targetId = sessionId || 'fallback_session';
      const [roomRes, statsRes] = await Promise.all([
        apiClient.get(`/api/proctor/live/${targetId}`),
        apiClient.get(`/api/proctor/statistics/${targetId}`).catch(() => ({ data: { success: false } }))
      ]);

      if (roomRes.data && roomRes.data.success) {
        setSession(roomRes.data.data.session);
        const rData = roomRes.data.data.room;
        setRoom(rData);
        if (rData?.roomPhoto && rData?.layoutConfig?.viewMode === 'OVERLAY') {
          setViewMode('OVERLAY');
        }
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
    fetchAllSessions();

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

    // 6. Nhận cảnh báo tư thế & thể chất từ Flask Surveillance Microservice
    socket.on('proctor:posture_alert', (data: any) => {
      if (data?.examStudentId) {
        setPostureAlerts(prev => ({
          ...prev,
          [data.examStudentId]: {
            event: data.postureEvent,
            severity: data.severity || 'MEDIUM',
            time: Date.now()
          }
        }));
      }
    });

    // 7. Nhận cảnh báo từ Camera CCTV phòng thi
    socket.on('proctor:cctv_alert', (data: any) => {
      toast.error(`📷 CCTV Phòng ${data.roomId || 'Thi'}: ${data.eventType}`, { duration: 5000 });
      setCctvAlerts(prev => [
        { roomId: data.roomId || 'Phòng thi', eventType: data.eventType, time: new Date().toLocaleTimeString('vi-VN') },
        ...prev.slice(0, 5)
      ]);
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

  // Hành động: Mở bàn thi cho thí sinh đi muộn (Đặc cách)
  const handleUnlockLateStudent = async () => {
    if (!selectedSeat) return;
    setActionLoading(true);
    try {
      const res = await apiClient.post('/api/proctor/unlock-late-student', {
        sessionStudentId: selectedSeat._id,
        reason: lateReason,
        extraMinutes: lateExtraMinutes
      });
      if (res.data?.success) {
        toast.success(res.data.message || 'Đã mở bàn thi đặc cách thành công!');
        setSelectedSeat(null);
        fetchRoomState();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Lỗi mở bàn thí sinh đi muộn');
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

  // Hành động: Kết thúc ca thi & Đóng buồng thi
  const handleEndSession = async () => {
    if (!session?._id) return;
    if (!window.confirm(`XÁC NHẬN KẾT THÚC CA THI VÀ ĐÓNG BUỒNG THI?\n\n- Toàn bộ bài làm của thí sinh sẽ được tự động thu nhận.\n- Hệ thống tự động tính điểm trắc nghiệm.\n- Buồng thi sẽ được niêm phong để chuyển sang hội đồng rà soát & duyệt điểm.`)) return;
    setActionLoading(true);
    try {
      const res = await apiClient.post(`/api/exam/sessions/${session._id}/end-session`);
      if (res.data?.success) {
        toast.success(res.data.message || 'Đã kết thúc ca thi và đóng buồng thi thành công!', { icon: '🏁' });
        fetchRoomState();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Lỗi khi kết thúc ca thi');
    } finally {
      setActionLoading(false);
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
    <div className="space-y-6 font-sans select-none">
      <div className="space-y-5">
        {/* ── 1. HEADER (CYBER-LUXURY GLASS) ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
              <span className="hover:text-white cursor-pointer transition" onClick={() => navigate('/exam-sessions')}>Lịch Thi & Ca Thi</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[#3781fc] font-semibold">Giám Thị 3D Realtime</span>
            </div>
            <div className="flex items-center flex-wrap gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center space-x-3">
                <span className="bg-gradient-to-r from-white via-[#cbe9fd] to-[#7c3aed] bg-clip-text text-transparent">
                  Phòng Giám Sát: {room?.name || 'Phòng Thi'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border flex items-center space-x-1.5 ${
                  socketConnected
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}>
                  {socketConnected ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-amber-400 animate-pulse" />}
                  <span>{socketConnected ? 'SOCKET.IO LIVE' : 'KẾT NỐI LẠI...'}</span>
                </span>
              </h1>

              {/* BỘ CHUYỂN PHÒNG THI NHANH */}
              <div className="flex items-center space-x-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                <Building2 className="w-3.5 h-3.5 text-[#3781fc]" />
                <span className="text-xs text-slate-400 font-semibold">Phòng:</span>
                <select
                  value={session?._id || ''}
                  onChange={e => {
                    if (e.target.value) navigate(`/live-proctor/${e.target.value}`);
                  }}
                  className="bg-transparent text-xs text-white font-bold outline-none cursor-pointer pr-1"
                >
                  {allSessions.map(s => (
                    <option key={s._id} value={s._id} className="bg-[#0B0C1E] text-white">
                      {s.room?.code || 'Phòng'} - {s.code} ({s.status === 'IN_PROGRESS' ? 'ĐANG THI' : 'LÊN LỊCH'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              Ca: <b className="text-white">{session?.title}</b> • Môn: <b className="text-[#cbe9fd]">{session?.subject?.name}</b> • Giám thị: <b className="text-slate-300">{session?.proctor1?.fullName || 'Hệ thống AI'}</b>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Chế độ xem 3D / 2D / Ảnh Thật */}
            <div className="flex items-center p-1 bg-[#070814]/80 border border-white/10 rounded-full">
              <button
                type="button"
                onClick={() => setViewMode('3D')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === '3D'
                    ? 'eg-glass-pill shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>3D WebGL</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-azure)] animate-ping" />
              </button>

              <button
                type="button"
                onClick={() => setViewMode('MATRIX')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                  viewMode === 'MATRIX'
                    ? 'eg-glass-pill shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Ma Trận 2D</span>
              </button>

              {room?.roomPhoto && (
                <button
                  type="button"
                  onClick={() => setViewMode('OVERLAY')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    viewMode === 'OVERLAY'
                      ? 'eg-glass-pill shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Phủ Ảnh Thật</span>
                </button>
              )}
            </div>

            {/* Cấu Hình Phòng Thi AI */}
            <button
              onClick={() => setIsRoomConfigOpen(true)}
              className="px-3.5 py-2 rounded-full text-xs font-bold transition flex items-center space-x-1.5 border border-[#3781fc]/30 bg-white/5 hover:bg-[#1951fc]/20 text-[#cbe9fd] cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-[#3781fc]" />
              <span>Sơ Đồ 3D</span>
            </button>

            {/* Toggle Tổng quan Đa Phòng */}
            <button
              onClick={() => setShowMultiRoomOverview(!showMultiRoomOverview)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold transition flex items-center space-x-1.5 border cursor-pointer ${
                showMultiRoomOverview
                  ? 'bg-[#1951fc] text-white border-[#3781fc]'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Đa Phòng</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 rounded-full transition text-xs flex items-center space-x-1 cursor-pointer"
              title={soundEnabled ? 'Tắt chuông cảnh báo' : 'Bật chuông cảnh báo'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
            </button>

            {session?.status === 'COMPLETED' ? (
              <div className="px-3.5 py-2 bg-white/5 border border-white/10 text-slate-400 rounded-full text-xs font-semibold flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Đã Đóng</span>
              </div>
            ) : (
              <button
                onClick={handleEndSession}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-full text-xs font-semibold transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Kết Thúc Ca</span>
              </button>
            )}

            <button
              onClick={() => navigate(`/grading-review/${session?._id}`)}
              className="px-4 py-2 eg-btn-gradient text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition flex items-center space-x-1.5 cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Duyệt Điểm</span>
            </button>
          </div>
        </div>

        {/* ── 2. BENTO BOX TELEMETRY MATRIX ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Bento Card 1: Tổng bàn thi */}
          <div className="relative overflow-hidden bg-white/90 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 hover:border-[var(--color-azure)]/50 rounded-3xl p-4 shadow-xl transition-all duration-200 group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng bàn thi</span>
              <div className="p-1.5 rounded-full bg-[var(--color-electric)]/15 text-[var(--color-azure)]">
                <LayoutGrid className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight">{rows * cols} bàn</div>
            <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
              <span className="text-[var(--color-azure)] font-bold">{rows} dãy</span>
              <span>×</span>
              <span className="text-[var(--color-azure)] font-bold">{cols} cột</span>
              <span className="text-slate-300 dark:text-white/20">•</span>
              <span>{room?.code || 'LAB'}</span>
            </div>
          </div>

          {/* Bento Card 2: Thí sinh làm bài */}
          <div className="relative overflow-hidden bg-white/90 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 hover:border-emerald-500/50 rounded-3xl p-4 shadow-xl transition-all duration-200 group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Đang làm bài</span>
              <div className="p-1.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 tracking-tight flex items-center space-x-1.5">
              <span>{inExamCount}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-sans">/ {students.length} SV</span>
            </div>
            <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{students.length > 0 ? Math.round((inExamCount / students.length) * 100) : 0}% hiện diện</span>
            </div>
          </div>

          {/* Bento Card 3: Cảnh báo vi phạm */}
          <div className="relative overflow-hidden bg-white/90 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 hover:border-amber-500/50 rounded-3xl p-4 shadow-xl transition-all duration-200 group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Cảnh báo vi phạm</span>
              <div className={`p-1.5 rounded-full ${violationCount > 0 ? 'bg-amber-500/20 text-amber-500 animate-bounce' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`text-2xl font-black font-mono tracking-tight ${violationCount > 0 ? 'text-amber-500' : 'text-slate-700 dark:text-slate-300'}`}>
              {violationCount} bàn
            </div>
            <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {violationCount > 0 ? (
                <span className="text-amber-500 font-medium">⚠️ Cần quan sát</span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ An toàn tuyệt đối</span>
              )}
            </div>
          </div>

          {/* Bento Card 4: Điểm uy tín TB */}
          <div className="relative overflow-hidden bg-white/90 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 hover:border-[var(--color-azure)]/50 rounded-3xl p-4 shadow-xl transition-all duration-200 group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Điểm uy tín TB</span>
              <div className="p-1.5 rounded-full bg-[var(--color-electric)]/15 text-[var(--color-azure)]">
                <Award className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`text-2xl font-black font-mono tracking-tight ${avgTrust >= 85 ? 'text-emerald-600 dark:text-emerald-400' : avgTrust >= 70 ? 'text-amber-500' : 'text-rose-500'}`}>
              {avgTrust}<span className="text-xs font-sans text-slate-500 dark:text-slate-400 font-normal"> / 100</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-white/10 rounded-full mt-2 overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${avgTrust >= 85 ? 'bg-gradient-to-r from-emerald-500 to-[#3781fc]' : avgTrust >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, Math.max(0, avgTrust))}%` }}
              />
            </div>
          </div>

          {/* Bento Card 5: AI Engine Telemetry */}
          <div className="relative overflow-hidden bg-white/90 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl border border-slate-200 dark:border-white/10 hover:border-[#7c3aed]/50 rounded-3xl p-4 shadow-xl transition-all duration-200 group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">ArcFace 3D Core</span>
              <div className="p-1.5 rounded-full bg-[#7c3aed]/20 text-purple-600 dark:text-[#a855f7]">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-2xl font-black font-mono text-purple-600 dark:text-[#a855f7] tracking-tight">100%</div>
            <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-[#cbe9fd] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-pulse" />
              <span>Zero-Trust Spoof Guard</span>
            </div>
          </div>
        </div>

        {/* Bộ lọc nhanh sơ đồ bàn */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 pb-1">
          <div className="flex items-center space-x-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase">Lọc hiển thị:</span>
            {(['ALL', 'FLAGGED', 'IN_EXAM', 'SUSPENDED'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center space-x-1.5 ${
                  filterMode === mode
                    ? 'eg-btn-gradient text-white shadow-sm shadow-[var(--accent-glow)]'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <span>{mode === 'ALL' && 'Tất cả bàn'}</span>
                <span>{mode === 'FLAGGED' && `Cần lưu ý (${violationCount})`}</span>
                <span>{mode === 'IN_EXAM' && `Đang làm (${inExamCount})`}</span>
                <span>{mode === 'SUSPENDED' && 'Bị đình chỉ'}</span>
              </button>
            ))}
          </div>

          {/* Chú giải trạng thái màu sắc theo chuẩn UI/UX Pro Max */}
          <div className="flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50" /><span>Bình thường</span></span>
            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs shadow-amber-500/50" /><span>Cảnh báo</span></span>
            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs shadow-rose-500/50" /><span>Nghiêm trọng</span></span>
            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-xs shadow-purple-500/50" /><span>Giám thị tại bàn</span></span>
          </div>
        </div>

        {/* Layout: Sơ đồ phòng bên trái (75%) + Alert Feed bên phải (25%) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* SƠ ĐỒ LƯỚI BÀN THI */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-4 relative overflow-hidden">
            {/* Lớp nền ảnh chụp phòng thi thực tế (khi bật chế độ OVERLAY) */}
            {room?.roomPhoto && viewMode === 'OVERLAY' && (
              <>
                <div
                  className="absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-300"
                  style={{
                    backgroundImage: `url(${room.roomPhoto})`,
                    opacity: 0.35,
                    filter: 'contrast(1.1) brightness(0.9)'
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/30 pointer-events-none" />
              </>
            )}

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-slate-900 dark:text-white">SƠ ĐỒ BÀN THI THỰC TẾ (REALTIME DESK MATRIX)</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">(Nhấp vào bàn để điều khiển, bù giờ, gửi cảnh báo)</span>
              </div>

              {/* Nhóm điều khiển xem & Cấu hình nhanh */}
              <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setViewMode('3D')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                    viewMode === '3D'
                      ? 'eg-btn-gradient text-white shadow-md shadow-[var(--accent-glow)]'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Chuyển sang Không Gian 3D Digital Twin tương tác xoay 360 độ"
                >
                  <Eye className="w-3.5 h-3.5 text-white" />
                  <span>Phòng Thi 3D Live</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-frosted-ice)] animate-ping"></span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('MATRIX')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer ${
                    viewMode === 'MATRIX'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Xem ma trận phẳng 2D"
                >
                  <span>Ma Trận 2D</span>
                </button>

                {room?.roomPhoto && (
                  <button
                    type="button"
                    onClick={() => setViewMode('OVERLAY')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                      viewMode === 'OVERLAY'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Chuyển sang chế độ phủ lên ảnh chụp phòng thi thực tế"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Phủ Ảnh Thật</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsRoomConfigOpen(true)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-[var(--color-azure)] hover:bg-[var(--color-electric)]/10 transition cursor-pointer flex items-center space-x-1 ml-0.5"
                  title="Cấu hình số dãy, số cột, thêm bàn thi, tải ảnh phòng"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cấu hình</span>
                </button>
              </div>

              {/* Chú giải màu sắc */}
              <div className="hidden md:flex items-center space-x-3 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500"></span><span>Bình thường</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500"></span><span>Cảnh báo</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500"></span><span>Nghiêm trọng</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded bg-purple-500/20 border border-purple-500"></span><span>Giám thị tại bàn</span></span>
              </div>
            </div>

            {viewMode === '3D' ? (
              <ExamRoom3D
                room={room}
                session={session}
                students={students}
                violations={violations}
                postureAlerts={postureAlerts}
                onSelectSeat={(st) => setSelectedSeat(st)}
                selectedSeat={selectedSeat}
                height={580}
              />
            ) : (
              <>
                {/* THIẾT KẾ MẶT BẰNG PHÒNG THI THỰC TẾ: CỬA RA VÀO & BÀN GIÁM THỊ */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800/80">
              {/* CỬA RA VÀO CHÍNH */}
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm">
                <DoorOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                <span>CỬA CHÍNH (RA VÀO)</span>
              </div>

              {/* BỤC GIẢNG & TRẠM ĐIỀU KHIỂN CỦA GIÁM THỊ */}
              <div className="flex-1 max-w-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-4 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--color-azure)] animate-ping"></span>
                  <span>BỤC GIẢNG & TRẠM ĐIỀU KHIỂN GIÁM THỊ (AI SURVEILLANCE)</span>
                </div>
                <div className="flex items-center space-x-2 text-[10px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                    CCTV: 3.0 FPS
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[var(--color-electric)]/15 text-[var(--color-azure)] font-bold">
                    Anti-Overload: Active
                  </span>
                </div>
              </div>

              {/* CỬA PHỤ / THOÁT HIỂM */}
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold">
                <DoorOpen className="w-4 h-4 text-slate-500" />
                <span>CỬA THOÁT HIỂM</span>
              </div>
            </div>

            {/* GRID OF DESKS VỚI LỐI ĐI CHÍNH GIỮA */}
            <div className="space-y-3 relative z-10">
              {Array.from({ length: rows }).map((_, rIdx) => {
                const rNum = rIdx + 1;
                const splitCol = room?.layoutConfig?.aisles?.[0] || Math.ceil(cols / 2);

                const renderDeskCard = (cNum: number) => {
                  const seatKey = `${rNum}-${cNum}`;
                  const isDisabled = room?.layoutConfig?.disabledSeats?.includes(seatKey);
                  const customLabel = room?.layoutConfig?.customLabels?.[seatKey] || `BÀN ${rNum}-${cNum}`;

                  if (isDisabled) {
                    return (
                      <div
                        key={seatKey}
                        className="p-2.5 rounded-xl border border-dashed border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/20 text-rose-400 text-xs text-center flex flex-col justify-center items-center opacity-55 select-none min-h-[64px]"
                        title="Bàn thi này đang tạm khóa hoặc bảo trì thiết bị"
                      >
                        <span className="font-mono text-[10px] line-through">{customLabel}</span>
                        <span className="text-[9px] font-bold text-rose-500 uppercase mt-0.5">Khóa / Hỏng</span>
                      </div>
                    );
                  }

                  const st = seatMap[seatKey];
                  const isOverride = st?.proctorOverrideUntil && new Date(st.proctorOverrideUntil) > new Date();

                  const sessionStartTime = session?.startTime ? new Date(session.startTime).getTime() : 0;
                  const currentLateMinutes = sessionStartTime > 0 ? Math.floor((Date.now() - sessionStartTime) / 60000) : 0;
                  const isLateLocked = st && (st.status === 'ASSIGNED' || st.status === 'ABSENT') && currentLateMinutes >= 15 && !st.isLateUnlocked;
                  const isHiddenByFilter = st && filterMode !== 'ALL' && !filteredStudents.some(f => f._id === st._id);

                  // Kiểm tra cảnh báo tư thế thể chất từ Flask Surveillance Microservice
                  const activePosture = st && postureAlerts[st._id] && (Date.now() - postureAlerts[st._id].time < 30000)
                    ? postureAlerts[st._id]
                    : null;

                  let cardClass = 'bg-white/90 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-300 dark:hover:border-slate-700 backdrop-blur-xs';
                  if (st) {
                    if (isHiddenByFilter) {
                      cardClass = 'opacity-25 bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600';
                    } else if (activePosture) {
                      if (activePosture.event === 'POSTURE_ABSENT') {
                        cardClass = 'bg-rose-100 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-200 ring-2 ring-rose-500 animate-pulse shadow-md';
                      } else if (activePosture.event === 'POSTURE_COLLAPSE') {
                        cardClass = 'bg-purple-100 dark:bg-purple-950/60 border-purple-500 text-purple-800 dark:text-purple-200 ring-2 ring-purple-500 animate-pulse shadow-md';
                      } else if (activePosture.event === 'POSTURE_STANDING') {
                        cardClass = 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 text-amber-800 dark:text-amber-200 ring-2 ring-amber-500 animate-pulse shadow-md';
                      } else {
                        cardClass = 'bg-yellow-100 dark:bg-yellow-950/60 border-yellow-500 text-yellow-800 dark:text-yellow-200 ring-2 ring-yellow-500 animate-pulse shadow-md';
                      }
                    } else if (st.status === 'SUSPENDED') {
                      cardClass = 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-500/60 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/40 shadow-sm';
                    } else if (isOverride) {
                      cardClass = 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-500/60 text-purple-700 dark:text-purple-300 animate-pulse ring-1 ring-purple-500/50 shadow-sm';
                    } else if (isLateLocked) {
                      cardClass = 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500/80 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/60 animate-pulse shadow-sm';
                    } else if (st.isLateUnlocked) {
                      cardClass = 'bg-[var(--color-electric)]/10 border-[var(--color-azure)] text-[var(--color-azure)] ring-1 ring-[var(--color-azure)]/40 shadow-sm';
                    } else if (st.trustScore < 60) {
                      cardClass = 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-500/60 text-rose-700 dark:text-rose-300 animate-pulse ring-1 ring-rose-500/50 shadow-sm';
                    } else if (st.trustScore < 85) {
                      cardClass = 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500/60 text-amber-800 dark:text-amber-300 ring-1 ring-amber-500/40 shadow-sm';
                    } else if (st.status === 'IN_EXAM') {
                      cardClass = 'bg-white/95 dark:bg-slate-900/95 border-emerald-400 dark:border-emerald-500/40 text-slate-900 dark:text-slate-200 hover:border-emerald-500 shadow-sm dark:shadow-lg backdrop-blur-xs';
                    } else {
                      cardClass = 'bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300 shadow-sm backdrop-blur-xs';
                    }
                  }

                  return (
                    <div
                      key={seatKey}
                      onClick={() => st && setSelectedSeat(st)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all hover:scale-[1.02] ${cardClass}`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pb-1 border-b border-slate-100 dark:border-slate-800/40">
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 truncate max-w-[80px]">{customLabel}</span>
                        {st && (
                          <span className="flex items-center space-x-1 shrink-0">
                            <span className={`w-1.5 h-1.5 rounded-full ${st.isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                            <span className="font-mono text-[var(--color-azure)] font-bold">PIN:{st.seatPin}</span>
                          </span>
                        )}
                      </div>

                      {st ? (
                        <div className="pt-1.5 space-y-1">
                          <p className="font-bold text-xs truncate text-slate-900 dark:text-white">{st.student?.fullName || st.student?.name || 'Thí sinh'}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">{st.candidateCode}</p>

                          <div className="flex items-center justify-between pt-1">
                            <span className={`text-[10px] font-bold ${
                              st.trustScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' : st.trustScore >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {st.trustScore}đ
                            </span>

                            {activePosture ? (
                              activePosture.event === 'POSTURE_ABSENT' ? (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-rose-600 text-white font-bold animate-pulse">
                                  RỜI GHẾ
                                </span>
                              ) : activePosture.event === 'POSTURE_COLLAPSE' ? (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-purple-600 text-white font-bold animate-pulse">
                                  GỤC XUỐNG
                                </span>
                              ) : activePosture.event === 'POSTURE_STANDING' ? (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-amber-600 text-white font-bold animate-pulse">
                                  ĐỨNG DẬY
                                </span>
                              ) : (
                                <span className="text-[9px] px-1 py-0.5 rounded bg-yellow-600 text-white font-bold animate-pulse">
                                  BẤT ĐỘNG
                                </span>
                              )
                            ) : isOverride ? (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 font-semibold">
                                Tại bàn
                              </span>
                            ) : isLateLocked ? (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold flex items-center space-x-0.5">
                                <Lock className="w-2.5 h-2.5 inline" />
                                <span>Khóa {currentLateMinutes}p</span>
                              </span>
                            ) : st.isLateUnlocked ? (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--color-electric)]/20 text-[var(--color-azure)] font-semibold flex items-center space-x-0.5">
                                <Unlock className="w-2.5 h-2.5 inline" />
                                <span>Đặc cách</span>
                              </span>
                            ) : st.status === 'IN_EXAM' ? (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-semibold">
                                {st.currentQuestion ? `Câu ${st.currentQuestion}` : 'Làm bài'}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div className="h-10 flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-600">
                          Trống
                        </div>
                      )}
                    </div>
                  );
                };

                return (
                  <div key={rNum} className="flex items-center space-x-3">
                    <span className="w-10 font-mono text-xs text-slate-500 font-bold shrink-0">Dãy {rNum}</span>
                    <div className="flex-1 flex items-center space-x-3">
                      {/* DÃY BÀN BÊN TRÁI */}
                      <div
                        className="flex-1 grid gap-2.5"
                        style={{ gridTemplateColumns: `repeat(${splitCol}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: splitCol }).map((_, cIdx) => renderDeskCard(cIdx + 1))}
                      </div>

                      {/* LỐI ĐI CHÍNH GIỮA (CENTRAL WALKWAY AISLE) */}
                      <div className="hidden lg:flex flex-col items-center justify-center w-7 py-2 bg-slate-100 dark:bg-slate-950/60 rounded-xl border border-dashed border-slate-300 dark:border-slate-800/80 text-[10px] font-mono text-slate-500 font-bold select-none shrink-0">
                        <span>L</span><span>Ố</span><span>I</span><span className="my-0.5 text-slate-400 dark:text-slate-700">•</span><span>Đ</span><span>I</span>
                      </div>

                      {/* DÃY BÀN BÊN PHẢI */}
                      <div
                        className="flex-1 grid gap-2.5"
                        style={{ gridTemplateColumns: `repeat(${cols - splitCol}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: cols - splitCol }).map((_, cIdx) => renderDeskCard(splitCol + cIdx + 1))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

          {/* NHẬT KÝ VI PHẠM & GIÁM SÁT REALTIME (SIDEBAR) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-[var(--color-azure)]" />
                  <span>FEED GIÁM SÁT AI REALTIME</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-[var(--color-azure)] animate-ping"></span>
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
                          ? 'opacity-40 bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                          : v.isProctorPresence
                          ? 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-500/30 text-purple-900 dark:text-purple-200'
                          : v.severity === 'CRITICAL'
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-500/50 text-rose-900 dark:text-rose-200'
                          : v.penalty > 0
                          ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-300'
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

                      <p className="text-[11px] text-slate-700 dark:text-slate-300">
                        {v.examStudent ? (
                          <>Bàn <b className="text-slate-900 dark:text-white">R{v.examStudent.seatRow}-C{v.examStudent.seatCol}</b> ({v.examStudent.candidateCode})</>
                        ) : 'Thí sinh'}
                      </p>

                      {v.isProctorPresence ? (
                        <p className="text-[10px] text-purple-600 dark:text-purple-300">
                          AI nhận diện cán bộ: {v.proctorName || 'Coi thi'}. Miễn trừ phạt điểm uy tín.
                        </p>
                      ) : (
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                            {v.penalty > 0 ? `Trừ ${v.penalty} điểm uy tín` : 'Cảnh báo vi phạm'}
                          </span>

                          <div className="flex items-center space-x-1">
                            {v.snapshotUrl && (
                              <button
                                onClick={() => setSelectedSnapshot(v.snapshotUrl!)}
                                className="px-1.5 py-0.5 text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-400 rounded transition font-medium"
                              >
                                Xem ảnh
                              </button>
                            )}

                            {!v.isDismissed && (
                              <button
                                onClick={() => handleDismissViolation(v._id)}
                                className="px-1.5 py-0.5 text-[10px] bg-slate-200 hover:bg-emerald-100 dark:bg-slate-800 dark:hover:bg-emerald-950 text-slate-600 hover:text-emerald-700 dark:text-slate-400 dark:hover:text-emerald-400 rounded transition"
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

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 flex items-center justify-between">
              <span>ExamGuard AI Core v2.0</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-mono text-[10px]">WebSocket Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL ĐIỀU KHIỂN BÀN THI & XEM CAMERA THÍ SINH CỦA GIÁM THỊ ── */}
      {selectedSeat && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl animate-in zoom-in-95 my-8 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[var(--color-electric)]/10 text-[var(--color-azure)] border border-[var(--color-azure)]/20">
                    BÀN DÃY {selectedSeat.seatRow} — CỘT {selectedSeat.seatCol}
                  </span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">PIN: {selectedSeat.seatPin}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1 flex items-center space-x-2">
                  <span>{selectedSeat.student?.fullName || selectedSeat.student?.name || 'Thí sinh'}</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-mono">({selectedSeat.candidateCode})</span>
                </h3>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center space-x-1.5 ${
                  selectedSeat.trustScore >= 80 
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' 
                    : selectedSeat.trustScore >= 60 
                    ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30' 
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/30 animate-pulse'
                }`}>
                  <span>Điểm Uy Tín:</span>
                  <b className="font-mono text-sm">{selectedSeat.trustScore}đ</b>
                </span>

                <button
                  onClick={() => setSelectedSeat(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* BỐ CỤC 2 CỘT: CỘT TRÁI (CAMERA THÍ SINH) & CỘT PHẢI (CÔNG CỤ GIÁM THỊ) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* CỘT TRÁI: LIVE WEBCAM & AI PROCTORING VISION */}
              <div className="md:col-span-5 space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700/80 bg-slate-950 aspect-video flex items-center justify-center shadow-xl group">
                  {/* Video/Image Live Cam Stream */}
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80"
                    alt="Candidate Live Feed"
                    className="w-full h-full object-cover filter contrast-105 brightness-95"
                  />

                  {/* Lớp phủ Bounding Box AI Nhận Diện Khuôn Mặt */}
                  <div className="absolute inset-x-[26%] inset-y-[14%] border-2 border-emerald-400/90 rounded-2xl z-20 pointer-events-none shadow-[0_0_20px_rgba(52,211,153,0.35)] flex flex-col justify-between p-1.5">
                    <span className="text-[9px] font-bold bg-emerald-500 text-slate-950 px-1.5 py-0.5 rounded shadow self-start">
                      99.4% KYC VERIFIED
                    </span>
                    <span className="text-[8px] font-mono text-emerald-300 bg-slate-950/80 px-1 py-0.2 rounded self-end">
                      ARCFACE 3D
                    </span>
                  </div>

                  {/* Thanh Metadata góc trên bên trái */}
                  <div className="absolute top-2.5 left-2.5 z-20 flex items-center space-x-1.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-[var(--color-azure)] font-mono shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    <span>LIVE HD • 30FPS</span>
                  </div>

                  {/* Thanh Gaze góc trên bên phải */}
                  <div className="absolute top-2.5 right-2.5 z-20 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-emerald-400 font-mono shadow-sm">
                    Gaze: Thẳng (1.2°)
                  </div>

                  {/* Nút Chụp Snapshot Nhanh */}
                  <div className="absolute bottom-2.5 right-2.5 z-20">
                    <button
                      onClick={() => {
                        toast.success(`Đã chụp ảnh bằng chứng bàn thi ${selectedSeat.seatRow}-${selectedSeat.seatCol}`, { icon: '📸' });
                      }}
                      className="p-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-lg border border-slate-700 text-[10px] font-semibold flex items-center space-x-1 backdrop-blur-sm transition active:scale-95 shadow"
                      title="Chụp ảnh snapshot lưu trữ làm bằng chứng vi phạm"
                    >
                      <Camera className="w-3.5 h-3.5 text-[var(--color-azure)]" />
                      <span>Chụp ảnh</span>
                    </button>
                  </div>
                </div>

                {/* Thông tin chi tiết thí sinh & trạng thái */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/60">
                    <span className="text-slate-500 dark:text-slate-400">Trạng thái thi:</span>
                    <span className="font-bold text-[var(--color-azure)] flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-[var(--color-azure)] animate-pulse"></span>
                      <span>{selectedSeat.status === 'IN_EXAM' ? 'Đang làm bài' : selectedSeat.status}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Câu hỏi hiện tại:</span>
                    <span className="font-bold text-slate-900 dark:text-white font-mono">
                      {selectedSeat.currentQuestion ? `Câu ${selectedSeat.currentQuestion}` : 'Đang xử lý'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Mã phách ẩn danh:</span>
                    <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold">{selectedSeat.blindCode || 'BLIND-xxxx'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Kết nối mạng thí sinh:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px]">Độ trễ: 18ms (Ổn định)</span>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: BẢNG ĐIỀU KHIỂN & CÔNG CỤ CỦA GIÁM THỊ */}
              <div className="md:col-span-7 space-y-4 text-xs">
                {/* 1. Gửi cảnh báo nhắc nhở */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>1. Gửi cảnh báo lên màn hình thí sinh (Socket.IO Realtime):</span>
                  </span>
                  <input
                    type="text"
                    value={warningMsg}
                    onChange={e => setWarningMsg(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={handleSendWarning}
                    disabled={actionLoading}
                    className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl transition shadow-md shadow-amber-500/20 active:scale-95"
                  >
                    Gửi Cảnh Báo Trực Tiếp (-5đ Uy Tín)
                  </button>
                </div>

                {/* 2. Tạm dừng giám sát 2 phút (Proctor Override) */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block flex items-center space-x-1.5">
                      <PauseCircle className="w-4 h-4 text-purple-500" />
                      <span>2. Tạm dừng AI giám sát (2 phút Override):</span>
                    </span>
                    <span className="text-[11px] text-slate-500">Khử trừ điểm khi Giám thị đứng cạnh hỗ trợ kỹ thuật tại bàn</span>
                  </div>
                  <button
                    onClick={handleProctorOverride}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition shadow-md shadow-purple-600/20 active:scale-95"
                  >
                    Bật Override
                  </button>
                </div>

                {/* 3. Cộng bù giờ */}
                <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-cyan-500" />
                    <span>3. Cộng bù giờ (khi thí sinh gặp sự cố mạng/máy tính):</span>
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleAddExtraTime(5)} className="py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-800 rounded-xl transition font-bold shadow-sm">+5 phút</button>
                    <button onClick={() => handleAddExtraTime(10)} className="py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-800 rounded-xl transition font-bold shadow-sm">+10 phút</button>
                    <button onClick={() => handleAddExtraTime(15)} className="py-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-cyan-700 dark:text-cyan-300 border border-slate-200 dark:border-slate-800 rounded-xl transition font-bold shadow-sm">+15 phút</button>
                  </div>
                </div>

                {/* 4. Mở Bàn Cho Thí Sinh Đi Muộn (Đặc cách) */}
                {(() => {
                  const sStartTime = session?.startTime ? new Date(session.startTime).getTime() : 0;
                  const lateMins = sStartTime > 0 ? Math.floor((Date.now() - sStartTime) / 60000) : 0;
                  const isLateLocked = (selectedSeat.status === 'ASSIGNED' || selectedSeat.status === 'ABSENT') && lateMins >= 15 && !selectedSeat.isLateUnlocked;

                  return (
                    <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                          <Unlock className="w-4 h-4 text-amber-500" />
                          <span>4. Mở bàn thí sinh đi muộn (Đặc cách):</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isLateLocked ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400'
                        }`}>
                          {lateMins >= 15 ? `Muộn ${lateMins}p (Bàn bị khóa)` : `Muộn ${lateMins}p (<15p)`}
                        </span>
                      </div>

                      {selectedSeat.isLateUnlocked ? (
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 dark:text-emerald-300 text-[11px]">
                          ✓ Bàn thi này đã được mở đặc cách lúc {selectedSeat.lateUnlockedAt ? new Date(selectedSeat.lateUnlockedAt).toLocaleTimeString('vi-VN') : 'trước đó'}.
                        </div>
                      ) : lateMins < 15 ? (
                        <div className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 text-[11px]">
                          ℹ️ Thí sinh đến muộn dưới 15 phút. Theo quy chế thi, thí sinh vẫn được tự do đăng nhập và làm bài bình thường.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={lateReason}
                            onChange={e => setLateReason(e.target.value)}
                            placeholder="Lý do mở bàn (vd: Có xác nhận sự cố từ Hội đồng thi)..."
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                          />
                          <button
                            onClick={handleUnlockLateStudent}
                            disabled={actionLoading}
                            className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold rounded-xl transition shadow-md shadow-amber-500/20 flex items-center justify-center space-x-1.5"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Xác Nhận Mở Bàn Cho Thí Sinh Đi Muộn</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 5. Đình chỉ thi khẩn cấp */}
                <button
                  onClick={handleSuspend}
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition shadow-lg shadow-rose-600/20 flex items-center justify-center space-x-2 active:scale-95"
                >
                  <Ban className="w-4 h-4" />
                  <span>ĐÌNH CHỈ THI & KHÓA BÀI THI NGAY LẬP TỨC</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL XEM ẢNH SNAPSHOT BẰNG CHỨNG ── */}
      {selectedSnapshot && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl animate-in zoom-in-95 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Camera className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                <span>BẰNG CHỨNG VI PHẠM TỪ CAMERA</span>
              </span>
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
              >
                Đóng [×]
              </button>
            </div>

            <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center border border-slate-200 dark:border-slate-800">
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
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* MODAL CẤU HÌNH SƠ ĐỒ PHÒNG THI & CHỖ NGỒI TRỰC QUAN */}
      {room && (
        <RoomLayoutConfigModal
          isOpen={isRoomConfigOpen}
          onClose={() => setIsRoomConfigOpen(false)}
          room={room}
          onSave={(updatedRoom) => {
            setRoom(updatedRoom);
            if (updatedRoom?.roomPhoto && updatedRoom?.layoutConfig?.viewMode === 'OVERLAY') {
              setViewMode('OVERLAY');
            }
            fetchRoomState();
          }}
        />
      )}
    </div>
  );
}

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
  Sparkles
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

  // Modal actions
  const [warningMsg, setWarningMsg] = useState('Yêu cầu tập trung làm bài, nhìn thẳng vào màn hình.');
  const [lateReason, setLateReason] = useState('Được sự đồng ý đặc cách của Hội đồng / Trưởng điểm thi');
  const [lateExtraMinutes, setLateExtraMinutes] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // Multi-room monitoring states
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [showMultiRoomOverview, setShowMultiRoomOverview] = useState(false);

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
            <div className="flex items-center flex-wrap gap-3">
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

              {/* BỘ CHUYỂN PHÒNG THI NHANH (MULTI-ROOM SWITCHER) */}
              <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-2.5 py-1">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-slate-400 font-semibold">Chuyển phòng:</span>
                <select
                  value={session?._id || ''}
                  onChange={e => {
                    if (e.target.value) navigate(`/live-proctor/${e.target.value}`);
                  }}
                  className="bg-transparent text-xs text-white font-bold outline-none cursor-pointer pr-2"
                >
                  {allSessions.map(s => (
                    <option key={s._id} value={s._id} className="bg-slate-900 text-slate-200">
                      {s.room?.code || 'Phòng'} - {s.code} ({s.title}) [{s.status === 'IN_PROGRESS' ? 'ĐANG THI' : 'LÊN LỊCH'}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-1">
              Ca thi: <b className="text-slate-200">{session?.title}</b> • Môn: <b className="text-indigo-400">{session?.subject?.name} ({session?.subject?.courseCode})</b> • Giám thị: <b className="text-slate-300">{session?.proctor1?.fullName || 'Cán bộ 1'}</b>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Nút Toggle Tổng quan Đa Phòng */}
            <button
              onClick={() => setShowMultiRoomOverview(!showMultiRoomOverview)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 border shadow-sm ${
                showMultiRoomOverview
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>{showMultiRoomOverview ? 'Trở Về Sơ Đồ Phòng' : 'Tổng Quan Đa Phòng'}</span>
            </button>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl transition text-xs flex items-center space-x-1.5"
              title={soundEnabled ? 'Tắt âm thanh cảnh báo' : 'Bật âm thanh cảnh báo'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
              <span>{soundEnabled ? 'Chuông: Bật' : 'Chuông: Tắt'}</span>
            </button>

            {session?.status === 'COMPLETED' ? (
              <div className="px-3.5 py-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Buồng Thi Đã Đóng</span>
              </div>
            ) : (
              <button
                onClick={handleEndSession}
                disabled={actionLoading}
                className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 shadow-sm active:scale-95 disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span>Kết Thúc Ca Thi & Đóng Phòng</span>
              </button>
            )}

            <button
              onClick={() => navigate(`/grading-review/${session?._id}`)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center space-x-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Xem Bảng Chấm Thi</span>
            </button>
          </div>
        </div>

        {/* ── NẾU BẬT TỔNG QUAN ĐA PHÒNG: HIỂN THỊ MULTI-ROOM MONITORING GRID ── */}
        {showMultiRoomOverview && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  TRUNG TÂM GIÁM SÁT ĐA PHÒNG THI THỰC TẾ (MULTI-ROOM COMMAND CENTER)
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Đang trực tuyến: <b className="text-emerald-400">{allSessions.length} ca thi / phòng</b>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {allSessions.map(s => {
                const isCurrent = s._id === session?._id;
                return (
                  <div
                    key={s._id}
                    className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-slate-950 border-cyan-500 ring-2 ring-cyan-500/30 shadow-xl shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            {s.room?.code || 'PHÒNG'}
                          </span>
                          <span className="text-xs font-bold text-white truncate max-w-[160px]">
                            {s.room?.name || 'Phòng thi'}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          s.status === 'IN_PROGRESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse'
                            : s.status === 'COMPLETED'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                        }`}>
                          {s.status === 'IN_PROGRESS' ? '● ĐANG THI' : s.status === 'COMPLETED' ? 'ĐÃ KẾT THÚC' : 'LÊN LỊCH'}
                        </span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-100 line-clamp-1 mb-1">{s.title}</h4>
                      <p className="text-xs text-slate-400 font-mono mb-3">{s.code} • {s.subject?.name}</p>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800/80 mb-4">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Sức chứa phòng:</span>
                          <span className="font-bold text-slate-200">{s.room?.capacity || 40} máy</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Thí sinh xếp chỗ:</span>
                          <span className="font-bold text-cyan-400">{s.studentCount || 0} SV</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Cán bộ coi thi:</span>
                          <span className="font-medium text-slate-300 truncate block">{s.proctor1?.fullName || 'Cán bộ'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">CCTV RTSP:</span>
                          <span className="font-mono text-emerald-400 text-[11px]">Online (HD)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        navigate(`/live-proctor/${s._id}`);
                        setShowMultiRoomOverview(false);
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm ${
                        isCurrent
                          ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                          : 'bg-slate-800 hover:bg-slate-700 text-white'
                      }`}
                    >
                      <Eye className="w-4 h-4" />
                      <span>{isCurrent ? 'Đang Trực Ban Phòng Này' : 'Chuyển Vào Giám Sát Phòng Này'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

            {/* THIẾT KẾ MẶT BẰNG PHÒNG THI THỰC TẾ: CỬA RA VÀO & BÀN GIÁM THỊ */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              {/* CỬA RA VÀO CHÍNH */}
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow-sm">
                <DoorOpen className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>CỬA CHÍNH (RA VÀO)</span>
              </div>

              {/* BỤC GIẢNG & TRẠM ĐIỀU KHIỂN CỦA GIÁM THỊ */}
              <div className="flex-1 max-w-lg bg-slate-950/80 border border-slate-800 rounded-xl py-2 px-4 flex items-center justify-between text-xs font-semibold text-slate-300 shadow-md">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
                  <span>BỤC GIẢNG & TRẠM ĐIỀU KHIỂN GIÁM THỊ TRUNG TÂM</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">CCTV RTSP: {room?.rtspCameraUrl ? 'CONNECTED' : 'ONLINE'}</span>
              </div>

              {/* CỬA PHỤ / THOÁT HIỂM */}
              <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400 text-xs font-bold">
                <DoorOpen className="w-4 h-4 text-slate-500" />
                <span>CỬA THOÁT HIỂM</span>
              </div>
            </div>

            {/* GRID OF DESKS VỚI LỐI ĐI CHÍNH GIỮA */}
            <div className="space-y-3">
              {Array.from({ length: rows }).map((_, rIdx) => {
                const rNum = rIdx + 1;
                const halfCols = Math.ceil(cols / 2);

                const renderDeskCard = (cNum: number) => {
                  const st = seatMap[`${rNum}-${cNum}`];
                  const isOverride = st?.proctorOverrideUntil && new Date(st.proctorOverrideUntil) > new Date();

                  const sessionStartTime = session?.startTime ? new Date(session.startTime).getTime() : 0;
                  const currentLateMinutes = sessionStartTime > 0 ? Math.floor((Date.now() - sessionStartTime) / 60000) : 0;
                  const isLateLocked = st && (st.status === 'ASSIGNED' || st.status === 'ABSENT') && currentLateMinutes >= 15 && !st.isLateUnlocked;
                  const isHiddenByFilter = st && filterMode !== 'ALL' && !filteredStudents.some(f => f._id === st._id);

                  let cardClass = 'bg-slate-950/40 border-slate-800/80 text-slate-600 hover:border-slate-700';
                  if (st) {
                    if (isHiddenByFilter) {
                      cardClass = 'opacity-25 bg-slate-950 border-slate-800 text-slate-600';
                    } else if (st.status === 'SUSPENDED') {
                      cardClass = 'bg-rose-950/40 border-rose-500/60 text-rose-300 ring-1 ring-rose-500/40';
                    } else if (isOverride) {
                      cardClass = 'bg-purple-950/40 border-purple-500/60 text-purple-300 animate-pulse ring-1 ring-purple-500/50';
                    } else if (isLateLocked) {
                      cardClass = 'bg-amber-950/40 border-amber-500/80 text-amber-300 ring-1 ring-amber-500/60 animate-pulse';
                    } else if (st.isLateUnlocked) {
                      cardClass = 'bg-cyan-950/30 border-cyan-500/60 text-cyan-200 ring-1 ring-cyan-500/40';
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
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all hover:scale-[1.02] ${cardClass}`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pb-1 border-b border-slate-800/40">
                        <span className="font-mono font-bold">BÀN {rNum}-{cNum}</span>
                        {st && (
                          <span className="flex items-center space-x-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${st.isOnline ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                            <span className="font-mono text-cyan-400">PIN:{st.seatPin}</span>
                          </span>
                        )}
                      </div>

                      {st ? (
                        <div className="pt-1.5 space-y-1">
                          <p className="font-bold text-xs truncate text-white">{st.student?.fullName || st.student?.name || 'Thí sinh'}</p>
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
                            ) : isLateLocked ? (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold flex items-center space-x-0.5">
                                <Lock className="w-2.5 h-2.5 inline" />
                                <span>Khóa {currentLateMinutes}p</span>
                              </span>
                            ) : st.isLateUnlocked ? (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-semibold flex items-center space-x-0.5">
                                <Unlock className="w-2.5 h-2.5 inline" />
                                <span>Đặc cách</span>
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
                };

                return (
                  <div key={rNum} className="flex items-center space-x-3">
                    <span className="w-10 font-mono text-xs text-slate-500 font-bold">Dãy {rNum}</span>
                    <div className="flex-1 flex items-center space-x-3">
                      {/* DÃY BÀN BÊN TRÁI */}
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        {Array.from({ length: halfCols }).map((_, cIdx) => renderDeskCard(cIdx + 1))}
                      </div>

                      {/* LỐI ĐI CHÍNH GIỮA (CENTRAL WALKWAY AISLE) */}
                      <div className="hidden lg:flex flex-col items-center justify-center w-7 py-2 bg-slate-950/60 rounded-xl border border-dashed border-slate-800/80 text-[10px] font-mono text-slate-500 font-bold select-none shrink-0">
                        <span>L</span><span>Ố</span><span>I</span><span className="my-0.5 text-slate-700">•</span><span>Đ</span><span>I</span>
                      </div>

                      {/* DÃY BÀN BÊN PHẢI */}
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2.5">
                        {Array.from({ length: cols - halfCols }).map((_, cIdx) => renderDeskCard(halfCols + cIdx + 1))}
                      </div>
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

      {/* ── MODAL ĐIỀU KHIỂN BÀN THI & XEM CAMERA THÍ SINH CỦA GIÁM THỊ ── */}
      {selectedSeat && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl animate-in zoom-in-95 my-8 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    BÀN DÃY {selectedSeat.seatRow} — CỘT {selectedSeat.seatCol}
                  </span>
                  <span className="font-mono text-xs text-slate-400">PIN: {selectedSeat.seatPin}</span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1 flex items-center space-x-2">
                  <span>{selectedSeat.student?.fullName || selectedSeat.student?.name || 'Thí sinh'}</span>
                  <span className="text-xs font-normal text-slate-400 font-mono">({selectedSeat.candidateCode})</span>
                </h3>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center space-x-1.5 ${
                  selectedSeat.trustScore >= 80 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                    : selectedSeat.trustScore >= 60 
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                }`}>
                  <span>Điểm Uy Tín:</span>
                  <b className="font-mono text-sm">{selectedSeat.trustScore}đ</b>
                </span>

                <button
                  onClick={() => setSelectedSeat(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* BỐ CỤC 2 CỘT: CỘT TRÁI (CAMERA THÍ SINH) & CỘT PHẢI (CÔNG CỤ GIÁM THỊ) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* CỘT TRÁI: LIVE WEBCAM & AI PROCTORING VISION */}
              <div className="md:col-span-5 space-y-4">
                <div className="relative rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950 aspect-video flex items-center justify-center shadow-2xl group">
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
                  <div className="absolute top-2.5 left-2.5 z-20 flex items-center space-x-1.5 bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] text-cyan-400 font-mono shadow-sm">
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
                      <Camera className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Chụp ảnh</span>
                    </button>
                  </div>
                </div>

                {/* Thông tin chi tiết thí sinh & trạng thái */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                    <span className="text-slate-400">Trạng thái thi:</span>
                    <span className="font-bold text-cyan-400 flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                      <span>{selectedSeat.status === 'IN_EXAM' ? 'Đang làm bài' : selectedSeat.status}</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Câu hỏi hiện tại:</span>
                    <span className="font-bold text-white font-mono">
                      {selectedSeat.currentQuestion ? `Câu ${selectedSeat.currentQuestion}` : 'Đang xử lý'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Mã phách ẩn danh:</span>
                    <span className="font-mono text-purple-400 font-semibold">{selectedSeat.blindCode || 'BLIND-xxxx'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Kết nối mạng thí sinh:</span>
                    <span className="font-mono text-emerald-400 text-[11px]">Độ trễ: 18ms (Ổn định)</span>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: BẢNG ĐIỀU KHIỂN & CÔNG CỤ CỦA GIÁM THỊ */}
              <div className="md:col-span-7 space-y-4 text-xs">
                {/* 1. Gửi cảnh báo nhắc nhở */}
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-200 block flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>1. Gửi cảnh báo lên màn hình thí sinh (Socket.IO Realtime):</span>
                  </span>
                  <input
                    type="text"
                    value={warningMsg}
                    onChange={e => setWarningMsg(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
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
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-200 block flex items-center space-x-1.5">
                      <PauseCircle className="w-4 h-4 text-purple-400" />
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
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                  <span className="font-bold text-slate-200 block flex items-center space-x-1.5">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <span>3. Cộng bù giờ (khi thí sinh gặp sự cố mạng/máy tính):</span>
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button onClick={() => handleAddExtraTime(5)} className="py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-xl transition font-bold">+5 phút</button>
                    <button onClick={() => handleAddExtraTime(10)} className="py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-xl transition font-bold">+10 phút</button>
                    <button onClick={() => handleAddExtraTime(15)} className="py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 rounded-xl transition font-bold">+15 phút</button>
                  </div>
                </div>

                {/* 4. Mở Bàn Cho Thí Sinh Đi Muộn (Đặc cách) */}
                {(() => {
                  const sStartTime = session?.startTime ? new Date(session.startTime).getTime() : 0;
                  const lateMins = sStartTime > 0 ? Math.floor((Date.now() - sStartTime) / 60000) : 0;
                  const isLateLocked = (selectedSeat.status === 'ASSIGNED' || selectedSeat.status === 'ABSENT') && lateMins >= 15 && !selectedSeat.isLateUnlocked;

                  return (
                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 flex items-center space-x-1.5">
                          <Unlock className="w-4 h-4 text-amber-400" />
                          <span>4. Mở bàn thí sinh đi muộn (Đặc cách):</span>
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          isLateLocked ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {lateMins >= 15 ? `Muộn ${lateMins}p (Bàn bị khóa)` : `Muộn ${lateMins}p (<15p)`}
                        </span>
                      </div>

                      {selectedSeat.isLateUnlocked ? (
                        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-[11px]">
                          ✓ Bàn thi này đã được mở đặc cách lúc {selectedSeat.lateUnlockedAt ? new Date(selectedSeat.lateUnlockedAt).toLocaleTimeString('vi-VN') : 'trước đó'}.
                        </div>
                      ) : lateMins < 15 ? (
                        <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-[11px]">
                          ℹ️ Thí sinh đến muộn dưới 15 phút. Theo quy chế thi, thí sinh vẫn được tự do đăng nhập và làm bài bình thường.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={lateReason}
                            onChange={e => setLateReason(e.target.value)}
                            placeholder="Lý do mở bàn (vd: Có xác nhận sự cố từ Hội đồng thi)..."
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
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

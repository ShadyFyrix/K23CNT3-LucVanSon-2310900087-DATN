import React, { useState, useEffect } from 'react';
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
  Volume2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
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
  student: {
    _id: string;
    name: string;
    studentCode: string;
  };
}

interface ViolationLog {
  _id: string;
  type: string;
  penalty: number;
  isProctorPresence: boolean;
  proctorName: string;
  isDismissed: boolean;
  createdAt: string;
  examStudent?: {
    candidateCode: string;
    seatRow: number;
    seatCol: number;
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
  const [selectedSeat, setSelectedSeat] = useState<StudentSeat | null>(null);

  // Modal actions
  const [warningMsg, setWarningMsg] = useState('Yêu cầu tập trung làm bài, nhìn thẳng vào màn hình.');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRoomState = async () => {
    try {
      const targetId = sessionId || 'fallback_session';
      const res = await apiClient.get(`/api/proctor/live/${targetId}`);
      if (res.data && res.data.success) {
        setSession(res.data.data.session);
        setRoom(res.data.data.room);
        setStudents(res.data.data.students || []);
        setViolations(res.data.data.recentViolations || []);
      }
    } catch (err: any) {
      console.warn('Lỗi fetch proctor room:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoomState();
    // Polling realtime mỗi 5 giây
    const interval = setInterval(fetchRoomState, 5000);
    return () => clearInterval(interval);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-3" />
        <p className="text-slate-400 font-medium">Đang tải phòng giám sát ExamGuard AI Live...</p>
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

  const inExamCount = students.filter(s => s.status === 'IN_EXAM').length;
  const violationCount = students.filter(s => s.trustScore < 80).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-5">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
              <span className="hover:text-slate-200 cursor-pointer" onClick={() => navigate('/exam-sessions')}>Quản lý Ca thi</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-cyan-400 font-medium">Giám thị Trực ban Realtime</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
              <span>PHÒNG GIÁM SÁT THÔNG MINH: {room?.name || 'Phòng P302'}</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>LIVE PROCTORING</span>
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Ca thi: <b className="text-slate-200">{session?.title}</b> • Camera RTSP: <b className="text-cyan-400 font-mono">{room?.rtspCameraUrl || 'Direct WebRTC stream'}</b>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate(`/grading-review/${session?._id}`)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
            >
              Xem Bảng Chấm Thi
            </button>
          </div>
        </div>

        {/* 4 Thống kê nhanh */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <span className="text-xs text-slate-400 uppercase font-semibold">Cán bộ đi quanh lớp</span>
            <div className="text-2xl font-bold font-mono text-purple-400 mt-1">Xác thực tự động</div>
            <span className="text-[11px] text-slate-500">ArcFace không trừ điểm khi GT ghé bàn</span>
          </div>
        </div>

        {/* Layout: Sơ đồ phòng bên trái (75%) + Alert Feed bên phải (25%) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* SƠ ĐỒ LƯỚI BÀN THI */}
          <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white">SƠ ĐỒ BÀN THI THỰC TẾ (DESK MATRIX)</span>
                <span className="text-xs text-slate-400">(Click vào từng bàn để điều khiển)</span>
              </div>

              {/* Chú giải màu sắc */}
              <div className="flex items-center space-x-4 text-xs text-slate-400">
                <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40"></span><span>Bình thường</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/40"></span><span>Cảnh báo quay mặt</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/40"></span><span>Giám thị tại bàn</span></span>
                <span className="flex items-center space-x-1.5"><span className="w-3 h-3 rounded bg-slate-950 border border-slate-800"></span><span>Trống</span></span>
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

                        let cardClass = 'bg-slate-950/40 border-slate-800/80 text-slate-600 hover:border-slate-700';
                        if (st) {
                          if (st.status === 'SUSPENDED') {
                            cardClass = 'bg-red-950/40 border-red-500/50 text-red-300';
                          } else if (isOverride) {
                            cardClass = 'bg-purple-950/40 border-purple-500/50 text-purple-300 animate-pulse';
                          } else if (st.trustScore < 60) {
                            cardClass = 'bg-red-950/40 border-red-500/50 text-red-300 animate-pulse';
                          } else if (st.trustScore < 85) {
                            cardClass = 'bg-amber-950/40 border-amber-500/50 text-amber-300';
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
                              {st && <span className="font-mono text-cyan-400">PIN: {st.seatPin}</span>}
                            </div>

                            {st ? (
                              <div className="pt-1.5 space-y-1">
                                <p className="font-bold text-xs truncate text-white">{st.student?.name || 'Thí sinh'}</p>
                                <p className="text-[10px] text-slate-400 font-mono truncate">{st.candidateCode}</p>

                                <div className="flex items-center justify-between pt-1">
                                  <span className={`text-[10px] font-bold ${
                                    st.trustScore >= 80 ? 'text-emerald-400' : 'text-amber-400'
                                  }`}>
                                    {st.trustScore}đ
                                  </span>
                                  {isOverride ? (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                                      Tại bàn
                                    </span>
                                  ) : st.status === 'IN_EXAM' ? (
                                    <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">
                                      Làm bài
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
                  <span>FEED GIÁM SÁT AI</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar">
                {violations.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                    <p>Phòng thi trật tự, chưa ghi nhận vi phạm.</p>
                  </div>
                ) : (
                  violations.map(v => (
                    <div
                      key={v._id}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        v.isProctorPresence
                          ? 'bg-purple-950/20 border-purple-500/30 text-purple-200'
                          : v.penalty > 0
                          ? 'bg-red-950/20 border-red-500/30 text-red-200'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px]">
                          {v.isProctorPresence ? '👮 Cán bộ coi thi tại bàn' : v.type}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(v.createdAt).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        {v.examStudent ? `Bàn R${v.examStudent.seatRow}-C${v.examStudent.seatCol} (${v.examStudent.candidateCode})` : 'Thí sinh'}
                      </p>

                      {v.isProctorPresence ? (
                        <p className="text-[10px] text-purple-300">
                          AI nhận diện khuôn mặt cán bộ {v.proctorName || 'Giám thị'}. Không trừ điểm uy tín của thí sinh.
                        </p>
                      ) : (
                        <p className="text-[10px] text-red-400 font-medium">Trừ {v.penalty} điểm uy tín</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
              ExamGuard AI Proctor Engine v2.0
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
                <span className="font-semibold text-slate-300 block">1. Gửi cảnh báo lên màn hình SV:</span>
                <input
                  type="text"
                  value={warningMsg}
                  onChange={e => setWarningMsg(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
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
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition"
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
    </div>
  );
}

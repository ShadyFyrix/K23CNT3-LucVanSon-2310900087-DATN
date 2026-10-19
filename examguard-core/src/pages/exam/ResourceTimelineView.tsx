import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldCheck,
  Users,
  Plus,
  Play,
  Lock,
  Building2,
  Monitor,
  Laptop,
  Globe,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ExamSessionItem {
  _id: string;
  code: string;
  title: string;
  subject?: { name: string; courseCode: string };
  room?: { _id?: string; code: string; name: string; capacity: number; campus?: any };
  startTime: string;
  endTime: string;
  durationMinutes: number;
  examType: string;
  status: string;
  gradingStatus: string;
  proctor1?: { fullName: string };
  studentCount?: number;
}

interface RoomItem {
  _id: string;
  code: string;
  name: string;
  capacity: number;
  rows?: number;
  cols?: number;
  roomType?: string;
  campus?: any;
}

interface ResourceTimelineViewProps {
  sessions: ExamSessionItem[];
  rooms: RoomItem[];
  onOpenCreateModal: (roomId?: string, defaultStartTime?: string) => void;
  onOpenCandidateManager: (session: ExamSessionItem) => void;
  onEndSession: (session: ExamSessionItem) => void;
}

// Khung giờ hiển thị chuẩn trên trục thời gian: 07:00 -> 19:00 (12 tiếng)
const START_HOUR = 7;
const END_HOUR = 19;
const TOTAL_HOURS = END_HOUR - START_HOUR; // 12 hours

export function ResourceTimelineView({
  sessions,
  rooms,
  onOpenCreateModal,
  onOpenCandidateManager,
  onEndSession
}: ResourceTimelineViewProps) {
  const navigate = useNavigate();

  // Ngày đang được chọn để quan sát timeline (mặc định hôm nay)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const [activeSessionDetail, setActiveSessionDetail] = useState<ExamSessionItem | null>(null);

  // Điều hướng ngày: Hôm trước, Hôm sau, Hôm nay
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    const d = new Date();
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  // Format ngày hiển thị tiếng Việt (VD: "Thứ Hai, ngày 19/10/2026")
  const formattedDateTitle = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, [selectedDate]);

  // Kiểm tra xem selectedDate có phải là ngày hôm nay hay không
  const isToday = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return selectedDate === todayStr;
  }, [selectedDate]);

  // Vị trí thanh chỉ báo thời gian thực hiện tại (Current Time Marker)
  const currentTimePercentage = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    if (currentHour < START_HOUR || currentHour > END_HOUR) return null;
    return ((currentHour - START_HOUR) / TOTAL_HOURS) * 100;
  }, [isToday]);

  // Lọc các ca thi diễn ra trong ngày được chọn
  const sessionsOnDate = useMemo(() => {
    return sessions.filter(s => {
      if (!s.startTime) return false;
      const sDateStr = new Date(s.startTime).toISOString().split('T')[0];
      return sDateStr === selectedDate;
    });
  }, [sessions, selectedDate]);

  // Đảm bảo luôn có ít nhất phòng P302 và LAB01
  const displayRooms = useMemo(() => {
    if (rooms && rooms.length > 0) return rooms;
    return [
      { _id: 'r_p302', code: 'P302', name: 'Phòng Lab Máy tính P302', capacity: 40, roomType: 'LAB_PC' },
      { _id: 'r_lab01', code: 'LAB01', name: 'Phòng Lab Công nghệ Cao LAB-01', capacity: 24, roomType: 'LAB_PC' }
    ];
  }, [rooms]);

  // Tính toán vị trí và chiều rộng của một khối ca thi trên trục timeline
  const getSessionPosition = (session: ExamSessionItem) => {
    const start = new Date(session.startTime);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const durationHours = (session.durationMinutes || 60) / 60;

    // Giới hạn trong khoảng START_HOUR -> END_HOUR
    const clampedStart = Math.max(START_HOUR, Math.min(END_HOUR, startHour));
    const clampedEnd = Math.max(START_HOUR, Math.min(END_HOUR, startHour + durationHours));

    const leftPercent = ((clampedStart - START_HOUR) / TOTAL_HOURS) * 100;
    const widthPercent = Math.max(4, ((clampedEnd - clampedStart) / TOTAL_HOURS) * 100);

    return { leftPercent, widthPercent, startHour, durationHours };
  };

  // Định kiểu màu sắc & trạng thái cho thẻ ca thi trên timeline
  const getSessionStyle = (session: ExamSessionItem) => {
    const now = Date.now();
    const start = session.startTime ? new Date(session.startTime).getTime() : now;
    const end = session.endTime ? new Date(session.endTime).getTime() : (start + (session.durationMinutes || 60) * 60000);

    if (session.gradingStatus === 'PUBLISHED') {
      return {
        bg: 'bg-emerald-950/70 hover:bg-emerald-900/80 border-emerald-500/60 text-emerald-200',
        badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        label: 'Đã công bố',
        glow: 'shadow-emerald-500/10'
      };
    }
    if (session.status === 'COMPLETED' || now > end) {
      return {
        bg: 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/70 text-slate-300',
        badge: 'bg-slate-800 text-slate-400 border-slate-700',
        label: 'Đã kết thúc',
        glow: 'shadow-none'
      };
    }
    if (now >= start && now <= end) {
      return {
        bg: 'bg-gradient-to-r from-cyan-950/90 to-indigo-950/90 hover:from-cyan-900/90 hover:to-indigo-900/90 border-cyan-400/80 text-cyan-100 ring-2 ring-cyan-500/40',
        badge: 'bg-cyan-500/30 text-cyan-200 border-cyan-400 animate-pulse',
        label: '● ĐANG THI',
        glow: 'shadow-lg shadow-cyan-500/20'
      };
    }
    return {
      bg: 'bg-indigo-950/70 hover:bg-indigo-900/80 border-indigo-500/60 text-indigo-200',
      badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      label: 'Sắp thi',
      glow: 'shadow-indigo-500/10'
    };
  };

  return (
    <div className="space-y-4">
      {/* ── THANH ĐIỀU HƯỚNG THỜI GIAN & CHỌN NGÀY (TIMELINE HEADER) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white capitalize">{formattedDateTitle}</h2>
              {isToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 animate-pulse">
                  HÔM NAY
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Có <b className="text-cyan-400">{sessionsOnDate.length} ca thi</b> được xếp lịch tại{' '}
              <b className="text-white">{displayRooms.length} phòng thi</b>.
            </p>
          </div>
        </div>

        {/* Nút lùi/tiến ngày */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={handlePrevDay}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
              title="Ngày trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                isToday ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
              title="Ngày sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
          />

          <button
            onClick={() => onOpenCreateModal()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-cyan-500/20 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Ca Thi</span>
          </button>
        </div>
      </div>

      {/* ── BẢNG GANTT / RESOURCE TIMELINE CHÍNH ── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
        {/* Header các cột giờ (07:00 -> 19:00) */}
        <div className="flex border-b border-slate-800 bg-slate-950/80 sticky top-0 z-20">
          {/* Cột trái: Tên phòng thi */}
          <div className="w-64 min-w-[240px] p-3 text-xs font-bold text-slate-400 uppercase tracking-wider border-r border-slate-800 flex items-center justify-between">
            <span>TÀI NGUYÊN PHÒNG THI</span>
            <span className="text-[10px] text-slate-500 font-normal">{displayRooms.length} phòng</span>
          </div>

          {/* Dải 12 tiếng */}
          <div className="flex-1 relative flex">
            {Array.from({ length: TOTAL_HOURS }).map((_, idx) => {
              const hour = START_HOUR + idx;
              const hourLabel = `${String(hour).padStart(2, '0')}:00`;
              return (
                <div
                  key={hour}
                  className="flex-1 text-center py-2.5 border-r border-slate-800/60 text-xs font-mono font-medium text-slate-400"
                >
                  {hourLabel}
                </div>
              );
            })}
          </div>
        </div>

        {/* Danh sách các Hàng Phòng Thi (Room Rows) */}
        <div className="divide-y divide-slate-800/60 relative">
          {displayRooms.map(room => {
            // Lọc các ca thi thuộc phòng này trong ngày được chọn
            const roomSessions = sessionsOnDate.filter(s => {
              if (s.room?._id && room._id && s.room._id.toString() === room._id.toString()) return true;
              if (s.room?.code && room.code && s.room.code.toUpperCase() === room.code.toUpperCase()) return true;
              return false;
            });

            return (
              <div key={room._id || room.code} className="flex min-h-[96px] group hover:bg-slate-800/20 transition">
                {/* CỘT TRÁI: THÔNG TIN PHÒNG THI */}
                <div className="w-64 min-w-[240px] p-3 border-r border-slate-800 bg-slate-950/40 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <h4 className="font-bold text-white text-sm group-hover:text-cyan-300 transition truncate">
                        {room.code}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 uppercase">
                        {room.roomType || 'LAB_PC'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{room.name}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/40">
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{room.capacity} máy</span>
                    </span>
                    <button
                      onClick={() => onOpenCreateModal(room._id, `${selectedDate}T08:00`)}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold opacity-0 group-hover:opacity-100 transition flex items-center space-x-1"
                      title="Lên lịch ca thi tại phòng này"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Xếp ca</span>
                    </button>
                  </div>
                </div>

                {/* CỘT PHẢI: TRỤC GANTT TIMELINE CHO PHÒNG NÀY */}
                <div className="flex-1 relative bg-slate-950/20 overflow-hidden">
                  {/* Đường kẻ vạch giờ nền */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {Array.from({ length: TOTAL_HOURS }).map((_, idx) => (
                      <div key={idx} className="flex-1 border-r border-slate-800/40 border-dashed"></div>
                    ))}
                  </div>

                  {/* Vạch thời gian hiện tại (Red vertical line) */}
                  {currentTimePercentage !== null && (
                    <div
                      className="absolute top-0 bottom-0 z-10 w-0.5 bg-rose-500 shadow-md shadow-rose-500/50 pointer-events-none"
                      style={{ left: `${currentTimePercentage}%` }}
                    >
                      <div className="w-2 h-2 rounded-full bg-rose-500 -ml-[3px] -mt-1 shadow-sm"></div>
                    </div>
                  )}

                  {/* CÁC KHỐI CA THI (SESSION BLOCKS) */}
                  {roomSessions.map(session => {
                    const pos = getSessionPosition(session);
                    const style = getSessionStyle(session);
                    const startTimeFormatted = new Date(session.startTime).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const endTimeFormatted = new Date(session.endTime || new Date(new Date(session.startTime).getTime() + (session.durationMinutes || 60) * 60000)).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={session._id}
                        onClick={() => setActiveSessionDetail(session)}
                        className={`absolute top-2 bottom-2 rounded-xl border p-2.5 cursor-pointer transition-all hover:scale-[1.01] hover:z-20 shadow-md flex flex-col justify-between ${style.bg} ${style.glow}`}
                        style={{
                          left: `${pos.leftPercent}%`,
                          width: `${pos.widthPercent}%`
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 overflow-hidden">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border truncate ${style.badge}`}>
                            {style.label}
                          </span>
                          <span className="font-mono text-[10px] text-slate-300 shrink-0">
                            {startTimeFormatted} - {endTimeFormatted}
                          </span>
                        </div>

                        <div className="my-0.5">
                          <h5 className="font-bold text-xs truncate text-white leading-tight">
                            {session.title}
                          </h5>
                          <p className="text-[10px] text-slate-300 font-mono truncate">
                            {session.code} • {session.subject?.name || 'Môn thi'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/10 text-slate-300">
                          <span className="flex items-center space-x-1">
                            <Users className="w-3 h-3" />
                            <span>{session.studentCount !== undefined ? session.studentCount : 0} SV</span>
                          </span>
                          <span className="truncate">{session.proctor1?.fullName || 'Cán bộ 1'}</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Nếu không có ca thi nào */}
                  {roomSessions.length === 0 && (
                    <div
                      onClick={() => onOpenCreateModal(room._id, `${selectedDate}T08:00`)}
                      className="absolute inset-0 flex items-center justify-center text-xs text-slate-600 hover:text-cyan-400 hover:bg-cyan-500/5 transition cursor-pointer select-none"
                    >
                      <span className="flex items-center space-x-1.5 opacity-60 hover:opacity-100">
                        <Plus className="w-3.5 h-3.5" />
                        <span>Phòng trống cả ngày • Nhấp để lên lịch thi</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Chú thích Màu sắc (Legend) */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-3">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-slate-300">CHÚ THÍCH TRẠNG THÁI:</span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-cyan-500 border border-cyan-400 animate-pulse"></span>
              <span className="text-cyan-300">Đang thi trực tuyến</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-indigo-600 border border-indigo-400"></span>
              <span>Lên lịch / Sắp thi</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-slate-700 border border-slate-600"></span>
              <span>Đã kết thúc</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-400"></span>
              <span>Đã công bố điểm</span>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Vạch đỏ: Thời gian hiện tại ({new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})</span>
          </div>
        </div>
      </div>

      {/* ── MODAL / DRAWER XEM NHANH CHI TIẾT CA THI KHI NHẤP VÀO KHỐI TIMELINE ── */}
      {activeSessionDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                  {activeSessionDetail.code}
                </span>
                <h3 className="text-base font-bold text-white mt-1">{activeSessionDetail.title}</h3>
                <p className="text-xs text-indigo-400 font-semibold">{activeSessionDetail.subject?.name}</p>
              </div>
              <button
                onClick={() => setActiveSessionDetail(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block">Phòng thi:</span>
                  <span className="font-bold text-white">{activeSessionDetail.room?.code} - {activeSessionDetail.room?.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Thời gian:</span>
                  <span className="font-bold text-cyan-400">
                    {new Date(activeSessionDetail.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {activeSessionDetail.durationMinutes} phút
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Thí sinh đã xếp:</span>
                  <span className="font-bold text-emerald-400">{activeSessionDetail.studentCount || 0} thí sinh</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Giám thị coi thi:</span>
                  <span className="font-bold text-slate-200">{activeSessionDetail.proctor1?.fullName || 'ThS. Nguyễn Văn Giảng'}</span>
                </div>
              </div>
            </div>

            {/* Các nút hành động */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    navigate(`/live-proctor/${activeSessionDetail._id}`);
                    setActiveSessionDetail(null);
                  }}
                  className="py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md shadow-cyan-600/20"
                >
                  <Eye className="w-4 h-4" />
                  <span>Giám Thị 3D Live</span>
                </button>

                <button
                  onClick={() => {
                    navigate(`/grading-review/${activeSessionDetail._id}`);
                    setActiveSessionDetail(null);
                  }}
                  className="py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 border border-slate-700"
                >
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span>Rà Soát Điểm</span>
                </button>
              </div>

              <button
                onClick={() => {
                  onOpenCandidateManager(activeSessionDetail);
                  setActiveSessionDetail(null);
                }}
                className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5"
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Quản Lý Thí Sinh & Số Báo Danh</span>
              </button>

              {activeSessionDetail.status !== 'COMPLETED' && (
                <button
                  onClick={() => {
                    onEndSession(activeSessionDetail);
                    setActiveSessionDetail(null);
                  }}
                  className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition flex items-center justify-center space-x-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-400" />
                  <span>Kết Thúc Ca Thi Ngay</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

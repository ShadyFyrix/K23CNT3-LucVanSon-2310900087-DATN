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
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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
  status?: string;
}

interface ResourceTimelineViewProps {
  sessions: ExamSessionItem[];
  rooms: RoomItem[];
  onOpenCreateModal: (roomId?: string, defaultStartTime?: string) => void;
  onOpenCandidateManager: (session: ExamSessionItem) => void;
  onEndSession: (session: ExamSessionItem) => void;
}

export function ResourceTimelineView({
  sessions,
  rooms,
  onOpenCreateModal,
  onOpenCandidateManager,
  onEndSession
}: ResourceTimelineViewProps) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  // Chế độ trục thời gian (24h matching Image 2 vs 12h học thuật)
  const [timeRangeMode, setTimeRangeMode] = useState<'24H' | '12H'>('24H');

  const startHour = timeRangeMode === '24H' ? 0 : 7;
  const endHour = timeRangeMode === '24H' ? 24 : 19;
  const totalHours = endHour - startHour;

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

  // Format ngày hiển thị tiếng Việt
  const formattedDateTitle = useMemo(() => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, [selectedDate]);

  const isToday = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return selectedDate === todayStr;
  }, [selectedDate]);

  // Vị trí thanh chỉ báo thời gian thực hiện tại (Current Time Marker)
  const currentTimePercentage = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;
    if (currentHour < startHour || currentHour > endHour) return null;
    return ((currentHour - startHour) / totalHours) * 100;
  }, [isToday, startHour, endHour, totalHours]);

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
      { _id: 'r_lab01', code: 'LAB01', name: 'Phòng Lab Công nghệ Cao LAB-01', capacity: 24, roomType: 'LAB_PC' },
      { _id: 'r_lab02', code: 'LAB02', name: 'Phòng Thi Sinh Trắc Học LAB-02', capacity: 36, roomType: 'BIOMETRIC_PC' }
    ];
  }, [rooms]);

  // Tính toán vị trí và chiều rộng của một khối ca thi trên trục timeline
  const getSessionPosition = (session: ExamSessionItem) => {
    const start = new Date(session.startTime);
    const sHour = start.getHours() + start.getMinutes() / 60;
    const durationHours = (session.durationMinutes || 60) / 60;

    const clampedStart = Math.max(startHour, Math.min(endHour, sHour));
    const clampedEnd = Math.max(startHour, Math.min(endHour, sHour + durationHours));

    const leftPercent = ((clampedStart - startHour) / totalHours) * 100;
    const widthPercent = Math.max(5, ((clampedEnd - clampedStart) / totalHours) * 100);

    return { leftPercent, widthPercent, sHour, durationHours };
  };

  // Định kiểu màu sắc & trạng thái cho thẻ ca thi trên timeline theo EXAMGUARD_COLORS
  const getSessionStyle = (session: ExamSessionItem) => {
    const now = Date.now();
    const start = session.startTime ? new Date(session.startTime).getTime() : now;
    const end = session.endTime ? new Date(session.endTime).getTime() : (start + (session.durationMinutes || 60) * 60000);

    if (session.gradingStatus === 'PUBLISHED') {
      return {
        bg: isDark ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200' : 'bg-emerald-50 border-emerald-400 text-emerald-900',
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        label: 'Đã công bố',
        glow: 'shadow-xs'
      };
    }
    if (session.status === 'COMPLETED' || now > end) {
      return {
        bg: isDark ? 'bg-slate-900 border-slate-700/80 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700',
        badge: 'bg-slate-700/50 text-slate-400 border-slate-600',
        label: 'Đã kết thúc',
        glow: 'shadow-none'
      };
    }
    if (now >= start && now <= end) {
      return {
        bg: isDark
          ? 'bg-gradient-to-r from-teal-950/90 to-blue-950/90 border-teal-400/80 text-teal-100 ring-2 ring-teal-500/40'
          : 'bg-gradient-to-r from-teal-50 to-blue-50 border-teal-500 text-teal-950 ring-2 ring-teal-500/30',
        badge: 'bg-teal-500/30 text-teal-600 dark:text-teal-300 border-teal-400 animate-pulse',
        label: '● ĐANG THI',
        glow: 'shadow-md shadow-teal-500/20'
      };
    }
    return {
      bg: isDark ? 'bg-blue-950/60 border-blue-500/50 text-blue-200' : 'bg-blue-50 border-blue-300 text-blue-900',
      badge: 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30',
      label: 'Sắp thi',
      glow: 'shadow-xs'
    };
  };

  // Major time ticks
  const hourTicks = useMemo(() => {
    if (timeRangeMode === '24H') {
      return [0, 4, 8, 12, 16, 20, 24];
    }
    return [7, 9, 11, 13, 15, 17, 19];
  }, [timeRangeMode]);

  return (
    <div className="space-y-4 font-sans">
      {/* ── THANH ĐIỀU HƯỚNG THỜI GIAN & CHỌN NGÀY (TIMELINE HEADER) ── */}
      <div
        className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border rounded-2xl p-4 shadow-sm backdrop-blur-md transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className={`text-base font-bold capitalize ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {formattedDateTitle}
              </h2>
              {isToday && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/30">
                  HÔM NAY
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Có <b className="text-teal-600 dark:text-teal-400">{sessionsOnDate.length} ca thi</b> tại{' '}
              <b className={isDark ? 'text-white' : 'text-slate-900'}>{displayRooms.length} phòng thi</b>.
            </p>
          </div>
        </div>

        {/* Nút lùi/tiến ngày & Range switch */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Switch 24H vs 12H (Image 2 style) */}
          <div
            className={`flex items-center p-1 rounded-xl border text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => setTimeRangeMode('24H')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                timeRangeMode === '24H'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              24 Giờ (00-24h)
            </button>
            <button
              type="button"
              onClick={() => setTimeRangeMode('12H')}
              className={`px-2.5 py-1 rounded-lg font-bold transition ${
                timeRangeMode === '12H'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Học Thuật (07-19h)
            </button>
          </div>

          <div
            className={`flex items-center space-x-1 p-1 rounded-xl border ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition"
              title="Ngày trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                isToday
                  ? 'bg-blue-600 text-white font-bold'
                  : isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition"
              title="Ngày sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className={`rounded-xl px-3 py-1.5 text-xs font-mono border cursor-pointer focus:outline-none ${
              isDark
                ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-teal-500'
                : 'bg-white border-slate-200 text-slate-800 focus:border-blue-600'
            }`}
          />

          <button
            onClick={() => onOpenCreateModal()}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Ca Thi</span>
          </button>
        </div>
      </div>

      {/* ── BẢNG GANTT / RESOURCE TIMELINE CHÍNH (THEO MẪU HÌNH 2) ── */}
      <div
        className={`border rounded-2xl shadow-xl overflow-hidden backdrop-blur-md transition-colors ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Header các cột giờ (00:00 -> 24:00 Image 2) */}
        <div
          className={`flex border-b sticky top-0 z-20 ${
            isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}
        >
          {/* Cột trái: Tên phòng thi (Vessel / Room panel) */}
          <div className="w-64 min-w-[240px] p-3 text-xs font-bold text-slate-400 uppercase tracking-wider border-r border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span>TÀI NGUYÊN PHÒNG THI</span>
            <span className="text-[10px] text-slate-500 font-normal">{displayRooms.length} phòng</span>
          </div>

          {/* Dải thời gian 24h */}
          <div className="flex-1 relative flex">
            {hourTicks.map((hour, idx) => {
              const hourLabel = `${String(hour).padStart(2, '0')}:00`;
              return (
                <div
                  key={hour}
                  className="flex-1 text-center py-2.5 border-r border-slate-200/80 dark:border-slate-800/60 text-xs font-mono font-medium text-slate-500 dark:text-slate-400"
                >
                  {hourLabel}
                </div>
              );
            })}
          </div>
        </div>

        {/* Danh sách các Hàng Phòng Thi (Room Rows) */}
        <div className="divide-y divide-slate-200 dark:divide-slate-800/60 relative">
          {displayRooms.map(room => {
            const roomSessions = sessionsOnDate.filter(s => {
              if (s.room?._id && room._id && s.room._id.toString() === room._id.toString()) return true;
              if (s.room?.code && room.code && s.room.code.toUpperCase() === room.code.toUpperCase()) return true;
              return false;
            });

            return (
              <div
                key={room._id || room.code}
                className="flex min-h-[105px] group hover:bg-slate-50 dark:hover:bg-slate-800/20 transition"
              >
                {/* CỘT TRÁI: THÔNG TIN PHÒNG THI (IMAGE 2 STYLE) */}
                <div
                  className={`w-64 min-w-[240px] p-3 border-r flex flex-col justify-between ${
                    isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                      <h4 className="font-bold text-sm truncate text-slate-900 dark:text-white">
                        {room.code}
                      </h4>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase">
                        {room.roomType || 'LAB_PC'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{room.name}</p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200 dark:border-slate-800/40">
                    <span className="flex items-center space-x-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>{room.capacity} máy thi</span>
                    </span>
                    <button
                      onClick={() => onOpenCreateModal(room._id, `${selectedDate}T08:00`)}
                      className="text-teal-600 dark:text-teal-400 font-semibold opacity-0 group-hover:opacity-100 transition flex items-center space-x-1"
                      title="Lên lịch ca thi tại phòng này"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Xếp ca</span>
                    </button>
                  </div>
                </div>

                {/* CỘT PHẢI: TRỤC GANTT TIMELINE CHO PHÒNG NÀY */}
                <div className="flex-1 relative overflow-hidden">
                  {/* Đường kẻ vạch giờ nền */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {hourTicks.map((_, idx) => (
                      <div key={idx} className="flex-1 border-r border-slate-200 dark:border-slate-800/40 border-dashed"></div>
                    ))}
                  </div>

                  {/* Vạch thời gian hiện tại (Live Time Cursor) */}
                  {currentTimePercentage !== null && (
                    <div
                      className="absolute top-0 bottom-0 z-10 w-0.5 bg-rose-500 shadow-md shadow-rose-500/50 pointer-events-none"
                      style={{ left: `${currentTimePercentage}%` }}
                    >
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-[4px] -mt-1 shadow-sm"></div>
                    </div>
                  )}

                  {/* CÁC KHỐI CA THI (SESSION BLOCKS - IMAGE 2) */}
                  {roomSessions.map(session => {
                    const pos = getSessionPosition(session);
                    const style = getSessionStyle(session);
                    const startTimeFormatted = new Date(session.startTime).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });
                    const endTimeFormatted = new Date(
                      session.endTime || new Date(new Date(session.startTime).getTime() + (session.durationMinutes || 60) * 60000)
                    ).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    // Initials for avatar
                    const proctorName = session.proctor1?.fullName || 'Giám thị 1';
                    const initials = proctorName.split(' ').map(n => n[0]).join('').slice(-2).toUpperCase();

                    return (
                      <div
                        key={session._id}
                        onClick={() => setActiveSessionDetail(session)}
                        className={`absolute top-2 bottom-2 rounded-2xl border p-2.5 cursor-pointer transition-all hover:scale-[1.01] hover:z-20 shadow-sm flex flex-col justify-between ${style.bg} ${style.glow}`}
                        style={{
                          left: `${pos.leftPercent}%`,
                          width: `${pos.widthPercent}%`
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 overflow-hidden">
                          {/* Proctor Avatar chip (Image 2 style) */}
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                              {initials}
                            </span>
                            <span className="text-[10px] font-semibold truncate">
                              {proctorName}
                            </span>
                          </div>

                          <span className="font-mono text-[10px] text-slate-400 shrink-0">
                            {startTimeFormatted} - {endTimeFormatted}
                          </span>
                        </div>

                        <div className="my-0.5">
                          <h5 className="font-bold text-xs truncate leading-tight">
                            {session.title}
                          </h5>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {session.code} • {session.subject?.name || 'Môn thi'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-black/10 dark:border-white/10 text-slate-400">
                          <span className="flex items-center space-x-1 font-semibold text-teal-600 dark:text-teal-400">
                            <Users className="w-3 h-3" />
                            <span>{session.studentCount !== undefined ? session.studentCount : 0} Thí sinh</span>
                          </span>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${style.badge}`}>
                            {style.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Open Slot Placeholder (+ Open - assign Image 2) */}
                  {roomSessions.length === 0 ? (
                    <div
                      onClick={() => onOpenCreateModal(room._id, `${selectedDate}T08:00`)}
                      className="absolute inset-2 border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex items-center justify-center text-xs text-slate-400 hover:text-teal-600 hover:border-teal-500/50 transition cursor-pointer select-none"
                    >
                      <span className="flex items-center space-x-1.5 font-semibold">
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Open - assign (Phòng trống • Nhấp để xếp ca)</span>
                      </span>
                    </div>
                  ) : (
                    /* Dành thêm khe trống nếu phòng thi còn thời gian rảnh */
                    <button
                      type="button"
                      onClick={() => onOpenCreateModal(room._id, `${selectedDate}T14:00`)}
                      className="absolute right-2 top-2 bottom-2 w-28 border border-dashed border-slate-300 dark:border-slate-800 hover:border-teal-500/60 rounded-xl text-[10px] text-slate-400 hover:text-teal-500 flex items-center justify-center transition"
                      title="Lên lịch ca tiếp theo"
                    >
                      <span>+ Open - assign</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Chú thích Màu sắc (Legend) */}
        <div
          className={`p-3 border-t flex flex-wrap items-center justify-between text-xs gap-3 ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-slate-400">TRẠNG THÁI CA THI:</span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse"></span>
              <span className="text-teal-600 dark:text-teal-400 font-medium">Đang thi trực tuyến</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span>Lên lịch / Sắp thi</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              <span>Đã kết thúc</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <span>Đã công bố điểm</span>
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Vạch đỏ: Thời gian hiện tại ({new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})</span>
          </div>
        </div>
      </div>

      {/* Drawer xem chi tiết ca thi khi click vào khối timeline */}
      {activeSessionDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className={`border rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">{activeSessionDetail.title}</h4>
                  <span className="text-[10px] font-mono text-slate-400">{activeSessionDetail.code}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveSessionDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between">
                <span className="text-slate-400">Thời gian thi:</span>
                <span className="font-mono font-bold">
                  {new Date(activeSessionDetail.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {activeSessionDetail.durationMinutes} phút
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Phòng thi:</span>
                <span className="font-bold text-teal-600 dark:text-teal-400">
                  {activeSessionDetail.room?.code} ({activeSessionDetail.room?.capacity || 40} máy)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cán bộ coi thi:</span>
                <span className="font-semibold">{activeSessionDetail.proctor1?.fullName || 'Chưa phân công'}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveSessionDetail(null);
                  onOpenCandidateManager(activeSessionDetail);
                }}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-sm"
              >
                Quản lý Thí sinh
              </button>
              <button
                type="button"
                onClick={() => setActiveSessionDetail(null)}
                className={`px-4 py-2.5 rounded-xl border font-semibold text-xs transition ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function XIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

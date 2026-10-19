import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Calendar,
  Clock,
  Building2,
  FileText,
  UserCheck,
  Laptop,
  Monitor,
  Globe,
  Sparkles,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../api/apiClient';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialRoomId?: string;
  initialStartTime?: string;
}

export function CreateSessionModal({
  isOpen,
  onClose,
  onCreated,
  initialRoomId,
  initialStartTime
}: CreateSessionModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  // Danh mục dữ liệu cho select dropdowns
  const [courses, setCourses] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  // Form State
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedPaper, setSelectedPaper] = useState('');
  const [selectedRoom, setSelectedRoom] = useState(initialRoomId || '');
  const [startTime, setStartTime] = useState(initialStartTime || '');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [examType, setExamType] = useState<'LAB_PC' | 'BYOD_LAPTOP' | 'ONLINE_QUIZ'>('LAB_PC');
  const [proctor1, setProctor1] = useState('');
  const [proctor2, setProctor2] = useState('');

  // Tự động sinh mã ca thi
  const generateSessionCode = (roomCode?: string) => {
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(100 + Math.random() * 900);
    return `CA-${dateStr}-${roomCode || 'P302'}-${rand}`;
  };

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setCode(generateSessionCode());
      
      // Mặc định thời gian bắt đầu là giờ hiện tại làm tròn lên 30p
      if (!initialStartTime) {
        const now = new Date();
        now.setMinutes(Math.ceil(now.getMinutes() / 30) * 30, 0, 0);
        const tzOffset = now.getTimezoneOffset() * 60000;
        const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
        setStartTime(localISOTime);
      } else {
        setStartTime(initialStartTime);
      }

      if (initialRoomId) {
        setSelectedRoom(initialRoomId);
      }
    }
  }, [isOpen, initialRoomId, initialStartTime]);

  const loadInitialData = async () => {
    try {
      setFetchingData(true);
      const [resCourses, resPapers, resRooms, resUsers] = await Promise.all([
        apiClient.get('/api/courses').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/exam/papers').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/exam/rooms').catch(() => ({ data: { data: [] } })),
        apiClient.get('/api/users').catch(() => ({ data: { data: [] } }))
      ]);

      const courseList = resCourses.data.data || [];
      const paperList = resPapers.data.data || [];
      const roomList = resRooms.data.data || [];
      const userList = resUsers.data.data || [];

      setCourses(courseList);
      setPapers(paperList);
      setRooms(roomList);
      setTeachers(userList.filter((u: any) => u.role?.name?.toLowerCase().includes('giảng') || u.role?.name?.toLowerCase().includes('teacher') || u.role?.name?.toLowerCase().includes('admin') || true));

      // Pre-select defaults
      if (courseList.length > 0 && !selectedSubject) {
        setSelectedSubject(courseList[0]._id);
        setTitle(`Thi Kết Thúc Học Phần: ${courseList[0].name}`);
      }
      if (paperList.length > 0 && !selectedPaper) {
        setSelectedPaper(paperList[0]._id);
        if (paperList[0].durationMinutes) {
          setDurationMinutes(paperList[0].durationMinutes);
        }
      }
      if (roomList.length > 0 && !selectedRoom && !initialRoomId) {
        setSelectedRoom(roomList[0]._id);
      }
      if (userList.length > 0 && !proctor1) {
        setProctor1(userList[0]._id);
      }
    } catch (e) {
      console.error('Lỗi load danh mục:', e);
    } finally {
      setFetchingData(false);
    }
  };

  // Khi chọn đề thi -> tự động cập nhật thời lượng và môn
  const handlePaperChange = (paperId: string) => {
    setSelectedPaper(paperId);
    const p = papers.find(x => x._id === paperId);
    if (p) {
      if (p.durationMinutes) setDurationMinutes(p.durationMinutes);
      if (p.subject) {
        const subId = p.subject._id || p.subject;
        setSelectedSubject(subId);
        const c = courses.find(x => x._id === subId);
        if (c) setTitle(`Thi Kết Thúc Học Phần: ${c.name}`);
      }
    }
  };

  // Khi đổi phòng -> cập nhật mã ca gợi ý
  const handleRoomChange = (roomId: string) => {
    setSelectedRoom(roomId);
    const r = rooms.find(x => x._id === roomId);
    if (r) {
      setCode(generateSessionCode(r.code));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !title || !selectedSubject || !selectedPaper || !selectedRoom || !startTime) {
      toast.error('Vui lòng điền đầy đủ các thông tin bắt buộc (*)');
      return;
    }

    try {
      setLoading(true);
      const start = new Date(startTime);
      const end = new Date(start.getTime() + durationMinutes * 60000);

      const payload = {
        code: code.trim().toUpperCase(),
        title: title.trim(),
        subject: selectedSubject,
        examPaper: selectedPaper,
        room: selectedRoom,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        durationMinutes: Number(durationMinutes),
        examType,
        proctor1: proctor1 || undefined,
        proctor2: proctor2 || undefined
      };

      const res = await apiClient.post('/api/exam/sessions', payload);
      if (res.data && res.data.success) {
        toast.success(`Đã thêm thành công ca thi "${code}"!`, { icon: '🎉' });
        onCreated();
        onClose();
      } else {
        toast.error(res.data?.message || 'Không thể tạo ca thi');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Lỗi khi tạo ca thi');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl relative my-8 animate-in fade-in zoom-in-95">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Tiêu đề Modal */}
        <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <span>LÊN LỊCH & THÊM CA THI MỚI</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                PROCTOR SCHEDULER
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tạo ca thi trắc nghiệm trực tuyến, gán phòng máy và thiết lập giám thị coi thi.
            </p>
          </div>
        </div>

        {fetchingData ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-xs text-slate-400">Đang tải danh mục môn học, đề thi & phòng thi...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Hàng 1: Mã ca thi & Tên ca thi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Mã ca thi *</span>
                  <button
                    type="button"
                    onClick={() => setCode(generateSessionCode())}
                    className="text-[10px] text-cyan-400 hover:underline flex items-center space-x-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Tạo lại</span>
                  </button>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                  placeholder="VD: CA-20261019-P302"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Tên ca thi *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  placeholder="VD: Thi Kết thúc Học phần Kỹ thuật Lập trình - Ca 2"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Hàng 2: Chọn Môn học & Chọn Đề thi */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Học phần / Môn học *</span>
                </label>
                <select
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Chọn môn thi --</option>
                  {courses.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.courseCode || c.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Bộ Đề thi Quiz gắn vào *</span>
                </label>
                <select
                  value={selectedPaper}
                  onChange={e => handlePaperChange(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Chọn đề thi --</option>
                  {papers.map(p => (
                    <option key={p._id} value={p._id}>
                      [{p.code}] {p.title} ({p.totalQuestions || p.questions?.length || 40} câu - {p.durationMinutes || 60}p)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Hàng 3: Chọn Phòng thi & Thời gian thi */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Phòng thi / Lab *</span>
                </label>
                <select
                  value={selectedRoom}
                  onChange={e => handleRoomChange(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Chọn phòng thi --</option>
                  {rooms.map(r => (
                    <option key={r._id} value={r._id}>
                      {r.code} - {r.name} ({r.capacity} máy)
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Bắt đầu thi *</span>
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Thời lượng (phút) *</span>
                </label>
                <input
                  type="number"
                  min="5"
                  max="300"
                  value={durationMinutes}
                  onChange={e => setDurationMinutes(Number(e.target.value))}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Hàng 4: Hình thức thi (LAB_PC, BYOD, ONLINE_QUIZ) */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Hình thức thi & Môi trường thiết bị:
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    key: 'LAB_PC',
                    title: 'Máy Lab Trường',
                    desc: 'Cố định IP & camera phòng thi',
                    icon: Monitor,
                    color: 'cyan'
                  },
                  {
                    key: 'BYOD_LAPTOP',
                    title: 'Laptop Cá Nhân',
                    desc: 'Sinh viên mang laptop vào phòng',
                    icon: Laptop,
                    color: 'indigo'
                  },
                  {
                    key: 'ONLINE_QUIZ',
                    title: 'Quiz Trực Tuyến',
                    desc: 'Giám sát webcam & AI Face từ xa',
                    icon: Globe,
                    color: 'emerald'
                  }
                ].map(item => {
                  const Icon = item.icon;
                  const isSelected = examType === item.key;
                  return (
                    <div
                      key={item.key}
                      onClick={() => setExamType(item.key as any)}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-slate-800 border-cyan-500 shadow-md ring-1 ring-cyan-500/50'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                          {item.title}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hàng 5: Cán bộ coi thi (Giám thị 1 & Giám thị 2) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cán bộ coi thi 1 (Chính)</span>
                </label>
                <select
                  value={proctor1}
                  onChange={e => setProctor1(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Chọn Giám thị 1 --</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.fullName || t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cán bộ coi thi 2 (Phụ / Giám sát)</span>
                </label>
                <select
                  value={proctor2}
                  onChange={e => setProctor2(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Không có hoặc chọn Giám thị 2 --</option>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>
                      {t.fullName || t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Buttons Action */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 text-xs font-semibold transition"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 transition flex items-center space-x-2 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang lưu ca thi...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lưu & Kích Hoạt Ca Thi</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

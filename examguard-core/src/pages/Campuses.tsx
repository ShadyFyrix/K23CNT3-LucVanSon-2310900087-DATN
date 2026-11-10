import React, { useState, useEffect } from 'react';
import {
  Building2, MapPin, Phone, Plus, Edit2, Trash2,
  DoorOpen, Users, Settings, Search, Loader2, ChevronRight,
  Info,
  Shield,
  Sliders,
  Camera
} from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { Modal } from '../components/Modal';
import { RoomLayoutConfigModal } from '../components/RoomLayoutConfigModal';
import { toast } from 'react-hot-toast';

export default function Campuses() {
  const [campuses, setCampuses] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCampus, setActiveCampus] = useState<any>(null); // Cơ sở đang được chọn để xem phòng
  const [isCampusModalOpen, setIsCampusModalOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [configuringRoom, setConfiguringRoom] = useState<any>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resC, resR] = await Promise.all([
        apiClient.get('/campuses'),
        apiClient.get('/rooms')
      ]);
      setCampuses(resC.data.data || []);
      setRooms(resR.data.data || []);
      if (resC.data.data?.length > 0 && !activeCampus) {
        setActiveCampus(resC.data.data[0]);
      }
    } catch (error) {
      toast.error("Lỗi tải dữ liệu cơ sở");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);




  // 1. Hàm xử lý Lưu Cơ sở (Campus)
  const handleSaveCampus = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await apiClient.post('/campuses', data);
      if (res.data.success) {
        toast.success("Thêm cơ sở mới thành công");
        setIsCampusModalOpen(false);
        fetchData(); // Tải lại danh sách
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi lưu cơ sở");
    }
  };

  // 2. Hàm xử lý Lưu Phòng học (Room)
  const handleSaveRoom = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const rawData = Object.fromEntries(formData);

    const rows = Number(rawData.rows) || 5;
    const cols = Number(rawData.cols) || 8;
    const capacity = Number(rawData.capacity) || (rows * cols);
    const code = (rawData.code as string || (rawData.name as string).replace(/\s+/g, '')).toUpperCase();

    const payload = {
      ...rawData,
      code,
      campus: activeCampus._id, // Gán ID cơ sở hiện tại
      rows,
      cols,
      capacity
    };

    try {
      const res = await apiClient.post('/rooms', payload);
      if (res.data.success) {
        toast.success(`Đã thêm phòng "${code}" vào ${activeCampus.name}`);
        setIsRoomModalOpen(false);
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi lưu phòng học");
    }
  };

  // 3. Load danh sách nhân viên để chọn Manager (Bổ sung thêm state users)
  const [staff, setStaff] = useState<any[]>([]);
  useEffect(() => {
    apiClient.get('/users').then(res => setStaff(res.data.data || []));
  }, []);

  const campusRooms = rooms.filter(r => {
    if (!activeCampus) return false;
    const campusId = (activeCampus._id || activeCampus.id)?.toString();
    const roomCampusId = (r.campus?._id || r.campus)?.toString();
    return roomCampusId === campusId;
  });

  return (
    <div className="space-y-6 w-full max-w-[1600px] mx-auto pb-12 font-sans">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1.5">
            <span className="text-[var(--color-azure)] font-bold font-mono">ExamGuard AI Infrastructure</span>
            <span>•</span>
            <span className="text-slate-300">Quản lý Tài nguyên & Hội trường thi</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            <span className="eg-text-gradient">
              Hệ Thống Cơ Sở & Phòng Thi 3D
            </span>
          </h1>
          <p className="text-slate-400 text-xs font-medium mt-1">Phân bổ tài nguyên máy thi, giám sát vị trí ngồi và cấu hình bản sao WebGL phòng thi.</p>
        </div>
        <button
          onClick={() => setIsCampusModalOpen(true)}
          className="eg-btn-gradient text-white px-6 py-2.5 rounded-full font-bold flex items-center justify-center gap-2 transition-all shadow-md text-xs uppercase tracking-wider cursor-pointer active:scale-95"
        >
          <Building2 className="w-4 h-4 stroke-[2.5]" /> Thêm cơ sở
        </button>
      </header>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-teal-500 w-10 h-10" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* CỘT TRÁI: DANH SÁCH CƠ SỞ (CYBER GLASS BENTO) */}
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest px-2">Danh sách chi nhánh</h3>
            <div className="space-y-3">
              {campuses.map((campus) => (
                <div
                  key={campus._id}
                  onClick={() => setActiveCampus(campus)}
                  className={cn(
                    "p-5 rounded-3xl border transition-all cursor-pointer group relative backdrop-blur-xl",
                    activeCampus?._id === campus._id
                      ? "bg-[var(--color-electric)]/10 border-[var(--color-azure)]/60 shadow-[0_0_20px_rgba(var(--color-electric-rgb),0.2)] ring-1 ring-[var(--color-azure)]/40"
                      : "bg-white/80 dark:bg-[#0B0C1E]/60 border-slate-200 dark:border-white/10 hover:border-[var(--color-azure)]/40 shadow-sm"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors shadow-md border",
                      activeCampus?._id === campus._id
                        ? "bg-gradient-to-tr from-[var(--color-royal)] to-[var(--color-electric)] text-white border-[var(--color-azure)]/40 shadow-md"
                        : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 group-hover:text-[var(--color-azure)]"
                    )}>
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 dark:text-white truncate text-base">{campus.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[var(--color-azure)] shrink-0" /> {campus.address}
                      </p>
                    </div>
                    <ChevronRight className={cn("w-5 h-5 self-center transition-transform", activeCampus?._id === campus._id ? "text-[var(--color-azure)] translate-x-1" : "text-slate-400 dark:text-slate-600")} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CỘT PHẢI: CHI TIẾT PHÒNG HỌC (CYBER GLASS BENTO) */}
          <div className="lg:col-span-8">
            {activeCampus ? (
              <div className="bg-white/95 dark:bg-[#0B0C1E]/75 rounded-3xl border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-2xl overflow-hidden min-h-[500px]">
                <div className="p-7 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50/80 dark:bg-[#070814]/60">
                  <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white">{activeCampus.name}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">{activeCampus.address}</p>
                  </div>
                  <button
                    onClick={() => setIsRoomModalOpen(true)}
                    className="flex items-center gap-2 eg-btn-gradient text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95 uppercase tracking-wider"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" /> Thêm phòng học
                  </button>
                </div>

                <div className="p-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {campusRooms.map((room) => (
                    <div key={room._id} className="p-6 rounded-3xl border border-white/10 bg-[#070814]/70 hover:border-[var(--color-azure)]/50 hover:shadow-[0_0_25px_rgba(var(--color-electric-rgb),0.25)] transition-all group border-l-4 border-l-[var(--color-electric)] flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3.5">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[var(--color-royal)]/40 to-[var(--color-electric)]/40 border border-[var(--color-azure)]/40 text-[var(--color-azure)] flex items-center justify-center font-mono font-black text-xs shadow-md">
                              {room.code || 'LAB'}
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-[var(--color-electric)]/15 text-[var(--color-azure)] border border-[var(--color-azure)]/30">
                              {room.code}
                            </span>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => setConfiguringRoom(room)}
                              className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full cursor-pointer transition"
                              title="Cấu hình sơ đồ phòng thi 3D WebGL"
                            >
                              <Sliders className="w-4 h-4 text-[var(--color-azure)]" />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full cursor-pointer transition"><Edit2 className="w-4 h-4" /></button>
                            <button className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full cursor-pointer transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <h5 className="font-bold text-white text-base">{room.name}</h5>
                      </div>

                      <div className="pt-4 border-t border-white/10 mt-4 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-bold text-white">
                            <Users className="w-3.5 h-3.5 text-[var(--color-azure)]" /> {room.capacity} chỗ ngồi
                          </span>
                          <span className="text-[11px] font-mono font-semibold text-slate-400">
                            {room.rows || 5} dãy × {room.cols || 8} máy
                          </span>
                        </div>

                        <div className="flex items-center flex-wrap gap-2 pt-1">
                          <span className="text-[10px] font-bold text-[var(--color-azure)] bg-[var(--color-electric)]/15 border border-[var(--color-azure)]/30 px-3 py-1 rounded-full uppercase">
                            {room.type || 'LAB_PC'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                            Lối đi trung tâm
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                            Cửa trước
                          </span>
                          {room.roomPhoto && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1">
                              <Camera className="w-3 h-3" /> Có ảnh phòng
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {campusRooms.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                      <DoorOpen className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-400 dark:text-slate-500 font-medium">Chưa có phòng học nào được thiết lập tại cơ sở này.</p>
                      <button
                        onClick={() => setIsRoomModalOpen(true)}
                        className="mt-3 text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                      >
                        + Bấm vào đây để thêm phòng học đầu tiên
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 italic">
                Chọn một cơ sở bên trái để xem chi tiết phòng học
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL THÊM CƠ SỞ --- */}
      <Modal isOpen={isCampusModalOpen} onClose={() => setIsCampusModalOpen(false)} title="Thêm cơ sở đào tạo mới">
        <form onSubmit={handleSaveCampus} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[var(--color-azure)]" /> Tên cơ sở <span className="text-rose-500">*</span>
            </label>
            <input name="name" required placeholder="Ví dụ: Cơ sở chính - Tòa nhà A" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm font-semibold focus:ring-2 focus:ring-[var(--color-electric)]/20 focus:border-[var(--color-azure)] transition-all" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[var(--color-azure)]" /> Địa chỉ chi tiết <span className="text-rose-500">*</span>
            </label>
            <input name="address" required placeholder="Số 123, đường ABC, phường X..." className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm font-semibold focus:ring-2 focus:ring-[var(--color-electric)]/20 focus:border-[var(--color-azure)] transition-all" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[var(--color-azure)]" /> Số điện thoại
              </label>
              <input name="phone" placeholder="028.xxxx.xxxx" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-900 dark:text-slate-100 text-sm font-semibold transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-[var(--color-azure)]" /> Quản lý cơ sở
              </label>
              <select name="manager" className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-900 dark:text-slate-100 text-sm font-semibold transition-all">
                <option value="">-- Chọn nhân sự --</option>
                {staff.map(u => <option key={u._id} value={u._id}>{u.fullName}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsCampusModalOpen(false)} className="flex-1 py-3 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer text-xs uppercase tracking-wider">Hủy</button>
            <button type="submit" className="flex-[2] py-3 eg-btn-gradient text-white rounded-xl font-bold shadow-md transition-all cursor-pointer text-xs uppercase tracking-wider active:scale-95">Kích hoạt cơ sở</button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL THÊM PHÒNG HỌC & PHÒNG THI --- */}
      <Modal isOpen={isRoomModalOpen} onClose={() => setIsRoomModalOpen(false)} title={`Thêm phòng vào ${activeCampus?.name}`}>
        <form onSubmit={handleSaveRoom} className="space-y-4">
          <div className="bg-[var(--color-electric)]/10 p-3.5 rounded-2xl border border-[var(--color-azure)]/30 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[var(--color-azure)] uppercase">Cơ sở trực thuộc</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">{activeCampus?.name}</p>
            </div>
            <Building2 className="w-5 h-5 text-[var(--color-azure)]" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mã phòng thi *</label>
              <input name="code" required placeholder="VD: P302, LAB02" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none font-mono uppercase text-xs font-semibold text-slate-900 dark:text-slate-100" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên phòng học *</label>
              <input name="name" required placeholder="VD: Phòng Lab Máy tính 02" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold text-slate-900 dark:text-slate-100" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Số dãy bàn (Rows)</label>
              <input name="rows" type="number" defaultValue="5" min="2" max="10" required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold text-slate-900 dark:text-slate-100" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Số cột bàn (Cols)</label>
              <input name="cols" type="number" defaultValue="8" min="2" max="12" required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold text-slate-900 dark:text-slate-100" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Sức chứa (Máy/Học viên)</label>
              <input name="capacity" type="number" defaultValue="40" required className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold text-slate-900 dark:text-slate-100" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Loại phòng</label>
              <select name="type" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-semibold text-slate-900 dark:text-slate-100">
                <option value="Lab">Phòng Lab Máy tính (LAB_PC)</option>
                <option value="Theory">Phòng Thi Laptop (BYOD)</option>
                <option value="Meeting">Hội trường / Trắc nghiệm chung</option>
              </select>
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ghi chú thiết bị & camera</label>
              <textarea name="note" rows={2} placeholder="VD: 40 máy Core i7, 2 camera CCTV góc trước và góc sau..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-medium text-slate-900 dark:text-slate-100 resize-none" />
            </div>
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIsRoomModalOpen(false)} className="flex-1 py-2.5 text-slate-500 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer uppercase tracking-wider">Hủy</button>
            <button type="submit" className="flex-[2] py-2.5 eg-btn-gradient text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer uppercase tracking-wider active:scale-95">Lưu & Khởi tạo Phòng thi</button>
          </div>
        </form>
      </Modal>

      {/* MODAL CẤU HÌNH SƠ ĐỒ BÀN THI & NẠP ẢNH CHỤP PHÒNG THI */}
      {configuringRoom && (
        <RoomLayoutConfigModal
          isOpen={!!configuringRoom}
          onClose={() => setConfiguringRoom(null)}
          room={configuringRoom}
          onSave={() => {
            fetchData();
            setConfiguringRoom(null);
          }}
        />
      )}

    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
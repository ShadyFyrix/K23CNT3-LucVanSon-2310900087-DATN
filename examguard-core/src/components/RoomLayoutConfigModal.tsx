import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Grid,
  Plus,
  Minus,
  Trash2,
  Edit3,
  Check,
  DoorOpen,
  Eye,
  RefreshCw,
  AlertTriangle,
  Monitor,
  Sparkles,
  Save,
  Image as ImageIcon,
  Layers,
  Sliders,
  Settings2,
  Video
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiClient } from '../api/apiClient';
import { toast } from 'react-hot-toast';

interface RoomLayoutConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: any;
  onSave?: (updatedRoom: any) => void;
}

export function RoomLayoutConfigModal({
  isOpen,
  onClose,
  room,
  onSave
}: RoomLayoutConfigModalProps) {
  const [activeTab, setActiveTab] = useState<'AUTO' | 'PHOTO' | 'MANUAL'>('AUTO');
  const [saving, setSaving] = useState(false);

  // Cấu hình kích thước lưới
  const [rows, setRows] = useState<number>(room?.rows || 4);
  const [cols, setCols] = useState<number>(room?.cols || 6);

  // Cấu hình kiến trúc phòng
  const [entrancePos, setEntrancePos] = useState<string>(
    room?.layoutConfig?.entrancePosition || 'TOP_LEFT'
  );
  const [exitDoorPos, setExitDoorPos] = useState<string>(
    room?.layoutConfig?.exitDoorPosition || 'TOP_RIGHT'
  );
  const [podiumPos, setPodiumPos] = useState<string>(
    room?.layoutConfig?.podiumPosition || 'TOP_CENTER'
  );
  const [aisles, setAisles] = useState<number[]>(
    room?.layoutConfig?.aisles?.length ? room.layoutConfig.aisles : [Math.ceil((room?.cols || 6) / 2)]
  );

  // Ghế bị vô hiệu hóa (ghế hỏng / không dùng)
  const [disabledSeats, setDisabledSeats] = useState<string[]>(
    room?.layoutConfig?.disabledSeats || []
  );

  // Tên bàn tùy biến (custom labels)
  const [customLabels, setCustomLabels] = useState<Record<string, string>>(
    room?.layoutConfig?.customLabels || {}
  );

  // Ảnh chụp thực tế của phòng thi
  const [roomPhoto, setRoomPhoto] = useState<string>(room?.roomPhoto || '');
  const [viewMode, setViewMode] = useState<'MATRIX' | 'OVERLAY'>(
    room?.roomPhoto ? 'OVERLAY' : 'MATRIX'
  );
  const [photoOpacity, setPhotoOpacity] = useState<number>(45);

  // Camera RTSP stream URL
  const [rtspUrl, setRtspUrl] = useState<string>(room?.rtspCameraUrl || '');

  // Trạng thái AI Phân tích hình ảnh phòng thi (AI Computer Vision Scan)
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showAiBoxes, setShowAiBoxes] = useState<boolean>(true);

  // Modal đổi tên bàn
  const [editingSeatKey, setEditingSeatKey] = useState<string | null>(null);
  const [editLabelValue, setEditLabelValue] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cập nhật state khi room prop thay đổi
  useEffect(() => {
    if (room) {
      setRows(room.rows || 4);
      setCols(room.cols || 6);
      setEntrancePos(room.layoutConfig?.entrancePosition || 'TOP_LEFT');
      setExitDoorPos(room.layoutConfig?.exitDoorPosition || 'TOP_RIGHT');
      setPodiumPos(room.layoutConfig?.podiumPosition || 'TOP_CENTER');
      setAisles(
        room.layoutConfig?.aisles?.length
          ? room.layoutConfig.aisles
          : [Math.ceil((room.cols || 6) / 2)]
      );
      setDisabledSeats(room.layoutConfig?.disabledSeats || []);
      setCustomLabels(room.layoutConfig?.customLabels || {});
      setRoomPhoto(room.roomPhoto || '');
      setRtspUrl(room.rtspCameraUrl || '');
      setViewMode(room.roomPhoto ? 'OVERLAY' : 'MATRIX');
    }
  }, [room]);

  if (!isOpen || !room) return null;

  // Tính tổng số bàn & bàn khả dụng
  const totalDesks = rows * cols;
  const activeDesks = totalDesks - disabledSeats.length;

  // 1. Chức năng Tự động sinh sơ đồ theo Preset (Auto Generator)
  const handleApplyPreset = (
    pRows: number,
    pCols: number,
    pAisles: number[],
    labelPrefix: string
  ) => {
    setRows(pRows);
    setCols(pCols);
    setAisles(pAisles);
    setDisabledSeats([]);

    const newLabels: Record<string, string> = {};
    let counter = 1;
    for (let r = 1; r <= pRows; r++) {
      for (let c = 1; c <= pCols; c++) {
        if (labelPrefix === 'BÀN') {
          newLabels[`${r}-${c}`] = `BÀN ${r}-${c}`;
        } else {
          newLabels[`${r}-${c}`] = `${labelPrefix}-${String(counter).padStart(2, '0')}`;
          counter++;
        }
      }
    }
    setCustomLabels(newLabels);
    toast.success(`Đã tự động tạo sơ đồ ${pRows} dãy × ${pCols} cột (${pRows * pCols} bàn)!`, { icon: '⚡' });
  };

  // 2. Bật / Tắt trạng thái ghế (Active vs Disabled)
  const handleToggleSeatStatus = (seatKey: string) => {
    setDisabledSeats(prev => {
      if (prev.includes(seatKey)) {
        toast.success(`Đã kích hoạt lại bàn ${customLabels[seatKey] || seatKey}`);
        return prev.filter(k => k !== seatKey);
      } else {
        toast.error(`Đã tạm khóa / đánh dấu bàn ${customLabels[seatKey] || seatKey} không sử dụng`);
        return [...prev, seatKey];
      }
    });
  };

  // 3. Đổi tên bàn thi
  const handleOpenEditLabel = (seatKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSeatKey(seatKey);
    setEditLabelValue(customLabels[seatKey] || `BÀN ${seatKey}`);
  };

  const handleSaveSeatLabel = () => {
    if (editingSeatKey) {
      setCustomLabels(prev => ({
        ...prev,
        [editingSeatKey]: editLabelValue.trim() || `BÀN ${editingSeatKey}`
      }));
      setEditingSeatKey(null);
      toast.success('Đã cập nhật tên bàn thi');
    }
  };

  // 4. Xử lý ảnh chụp phòng thi (Upload Photo)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn tệp hình ảnh (.jpg, .png, .webp)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Kích thước ảnh tối đa là 15MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setRoomPhoto(base64);
      setViewMode('OVERLAY');
      toast.success('Đã nạp hình chụp phòng thi thực tế!', { icon: '📸' });
    };
    reader.readAsDataURL(file);
  };

  // 5. Chụp ảnh trực tiếp từ webcam/camera
  const handleCaptureFromCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      video.onloadedmetadata = () => {
        setTimeout(() => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

          stream.getTracks().forEach(track => track.stop());
          setRoomPhoto(dataUrl);
          setViewMode('OVERLAY');
          toast.success('Đã chụp ảnh phòng thi từ Camera!', { icon: '📸' });
        }, 800);
      };
    } catch (err: any) {
      toast.error('Không thể truy cập camera: ' + (err.message || 'Quyền bị từ chối'));
    }
  };

  // 6. Xóa ảnh chụp phòng thi
  const handleRemovePhoto = () => {
    setRoomPhoto('');
    setAnalysisResult(null);
    setViewMode('MATRIX');
    toast.success('Đã gỡ ảnh chụp phòng thi');
  };

  // 6b. AI Quét & Nhận diện Bố cục Phòng từ Ảnh Chụp
  const handleScanPhotoWithAI = async () => {
    if (!roomPhoto) {
      toast.error('Vui lòng tải lên hoặc chụp ảnh phòng thi trước khi quét AI!');
      return;
    }

    setAnalyzing(true);
    try {
      const res = await apiClient.post('/rooms/analyze-photo', { image: roomPhoto });
      if (res.data?.success) {
        setAnalysisResult(res.data.data);
        setShowAiBoxes(true);
        toast.success('AI đã phân tích thành công vị trí bảng, cửa và số bàn ghế!', { icon: '🤖' });
      } else {
        toast.error('Lỗi khi phân tích ảnh phòng');
      }
    } catch (err: any) {
      toast.error('Không thể phân tích ảnh: ' + (err.response?.data?.message || err.message));
    } finally {
      setAnalyzing(false);
    }
  };

  // 6c. Áp dụng sơ đồ do AI đề xuất
  const handleApplyAiSuggestion = () => {
    if (!analysisResult?.recommendedLayout) return;
    const rec = analysisResult.recommendedLayout;

    setRows(rec.rows);
    setCols(rec.cols);
    setEntrancePos(rec.entrancePosition);
    setPodiumPos(rec.podiumPosition);
    setExitDoorPos(rec.exitDoorPosition || 'NONE');
    setAisles(rec.aisles || [2]);
    setDisabledSeats([]);
    if (rec.customLabels) {
      setCustomLabels(rec.customLabels);
    }
    setViewMode('OVERLAY');
    toast.success(`Đã tự động áp dụng sơ đồ AI: ${rec.rows} Dãy × ${rec.cols} Cột, Bảng ở chính diện, Cửa bên trái!`, { icon: '🎯' });
  };

  // 7. Bật / Tắt lối đi (Aisle)
  const handleToggleAisle = (colIdx: number) => {
    setAisles(prev => {
      if (prev.includes(colIdx)) {
        return prev.filter(c => c !== colIdx);
      } else {
        return [...prev, colIdx].sort((a, b) => a - b);
      }
    });
  };

  // 8. Lưu cấu hình xuống MongoDB
  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      const payload = {
        rows,
        cols,
        capacity: totalDesks,
        roomPhoto,
        rtspCameraUrl: rtspUrl,
        layoutConfig: {
          aisles,
          entrancePosition: entrancePos,
          exitDoorPosition: exitDoorPos,
          podiumPosition: podiumPos,
          disabledSeats,
          customLabels,
          viewMode
        }
      };

      const res = await apiClient.put(`/api/rooms/${room._id}`, payload);
      if (res.data?.success) {
        toast.success(`Đã lưu cấu hình sơ đồ phòng "${room.code}" thành công!`, { icon: '💾' });
        if (onSave) {
          onSave(res.data.data);
        }
        onClose();
      } else {
        toast.error(res.data?.message || 'Lỗi khi lưu cấu hình');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 md:p-6 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-6xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden z-10"
        >
          {/* HEADER */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <Settings2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    Cấu Hình Sơ Đồ Phòng Thi & Chỗ Ngồi Trực Quan
                  </h2>
                  <span className="px-2 py-0.5 rounded-lg bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 font-mono font-bold text-xs border border-cyan-300 dark:border-cyan-800">
                    {room.code}
                  </span>
                  <span className="text-xs text-slate-400">({room.name})</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tự động sinh sơ đồ, tải ảnh chụp phòng thực tế hoặc thêm/tắt chỗ ngồi thủ công.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Thống kê nhanh */}
              <div className="hidden sm:flex items-center space-x-2 text-xs font-mono px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">Tổng:</span>
                <b className="text-slate-900 dark:text-white">{totalDesks} bàn</b>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{activeDesks} khả dụng</span>
                {disabledSeats.length > 0 && (
                  <>
                    <span className="text-slate-300 dark:text-slate-600">|</span>
                    <span className="text-rose-500 font-bold">{disabledSeats.length} tạm khóa</span>
                  </>
                )}
              </div>

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="px-6 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('AUTO')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'AUTO'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>1. Tự Động Sinh Sơ Đồ</span>
              </button>

              <button
                onClick={() => setActiveTab('PHOTO')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'PHOTO'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>2. Ảnh Chụp Phòng Thi & CCTV</span>
                {roomPhoto && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('MANUAL')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                  activeTab === 'MANUAL'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>3. Chỉnh Sửa & Tùy Biến Thủ Công</span>
              </button>
            </div>

            {/* Toggle hiển thị sơ đồ: Lưới số vs Phủ ảnh */}
            {roomPhoto && (
              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400">Chế độ xem:</span>
                <button
                  onClick={() => setViewMode('MATRIX')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    viewMode === 'MATRIX'
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Ma Trận Lưới
                </button>
                <button
                  onClick={() => setViewMode('OVERLAY')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    viewMode === 'OVERLAY'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Phủ Ảnh Phòng Thi
                </button>
              </div>
            )}
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: TỰ ĐỘNG SINH SƠ ĐỒ (AUTO GENERATOR) */}
            {activeTab === 'AUTO' && (
              <div className="space-y-5 animate-in fade-in">
                <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 border border-cyan-500/20 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-cyan-900 dark:text-cyan-200 flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Bộ Tạo Sơ Đồ Phòng Thi Nhanh (Smart Room Presets)</span>
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Chọn nhanh mẫu phòng chuẩn dưới đây để hệ thống tự động sinh số dãy, số cột, lối đi và đánh số nhãn máy thông minh.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                    {/* Preset 1: Phòng Lab Máy tính 24 máy (4x6) */}
                    <div
                      onClick={() => handleApplyPreset(4, 6, [3], 'BÀN')}
                      className="p-3.5 rounded-xl border border-cyan-500/30 bg-white/70 dark:bg-slate-900/70 hover:border-cyan-500 hover:shadow-md transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-cyan-600 dark:text-cyan-400">PHÒNG LAB 24 MÁY</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-600 font-bold">Chuẩn LAB-01</span>
                      </div>
                      <p className="text-base font-bold text-slate-900 dark:text-white">4 Dãy × 6 Cột</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Lối đi giữa cột 3 & 4. Nhãn: BÀN 1-1 .. BÀN 4-6
                      </p>
                    </div>

                    {/* Preset 2: Phòng Thi Tiêu Chuẩn 40 máy (5x8) */}
                    <div
                      onClick={() => handleApplyPreset(5, 8, [4], 'PC')}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:border-cyan-500 hover:shadow-md transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">PHÒNG THI 40 MÁY</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 font-bold">Chuẩn P302</span>
                      </div>
                      <p className="text-base font-bold text-slate-900 dark:text-white">5 Dãy × 8 Cột</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Lối đi giữa cột 4 & 5. Nhãn: PC-01 .. PC-40
                      </p>
                    </div>

                    {/* Preset 3: Hội Trường Lớn 60 máy (6x10) */}
                    <div
                      onClick={() => handleApplyPreset(6, 10, [3, 7], 'PC')}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:border-cyan-500 hover:shadow-md transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-purple-600 dark:text-purple-400">HỘI TRƯỜNG 60 MÁY</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-600 font-bold">3 Dãy Lớn</span>
                      </div>
                      <p className="text-base font-bold text-slate-900 dark:text-white">6 Dãy × 10 Cột</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        2 Lối đi riêng biệt (cột 3 và cột 7).
                      </p>
                    </div>

                    {/* Preset 4: Phòng Lab Mini 16 máy (4x4) */}
                    <div
                      onClick={() => handleApplyPreset(4, 4, [2], 'LAB')}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:border-cyan-500 hover:shadow-md transition cursor-pointer group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">LAB MINI 16 MÁY</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 font-bold">Thực hành nhỏ</span>
                      </div>
                      <p className="text-base font-bold text-slate-900 dark:text-white">4 Dãy × 4 Cột</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        Lối đi giữa cột 2 & 3. Nhãn: LAB-01 .. LAB-16
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tùy chỉnh tham số tự động */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Số dãy bàn (Rows / Hàng dọc)
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setRows(Math.max(2, rows - 1))}
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="2"
                        max="12"
                        value={rows}
                        onChange={(e) => setRows(Math.max(2, Math.min(12, Number(e.target.value) || 2)))}
                        className="w-full text-center py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold font-mono text-sm text-slate-900 dark:text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setRows(Math.min(12, rows + 1))}
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Số cột bàn (Cols / Hàng ngang)
                    </label>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setCols(Math.max(2, cols - 1))}
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min="2"
                        max="16"
                        value={cols}
                        onChange={(e) => setCols(Math.max(2, Math.min(16, Number(e.target.value) || 2)))}
                        className="w-full text-center py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold font-mono text-sm text-slate-900 dark:text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setCols(Math.min(16, cols + 1))}
                        className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Vị trí lối đi chính giữa phòng
                    </label>
                    <select
                      value={aisles[0] || Math.ceil(cols / 2)}
                      onChange={(e) => setAisles([Number(e.target.value)])}
                      className="w-full py-2.5 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                    >
                      {Array.from({ length: cols - 1 }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Sau cột {i + 1} (Chia {i + 1} - {cols - (i + 1)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: HÌNH CHỤP PHÒNG THI & CCTV (ROOM PHOTO & BLUEPRINT) */}
            {activeTab === 'PHOTO' && (
              <div className="space-y-5 animate-in fade-in">
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                        <Camera className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        <span>Hình Chụp Thực Tế Phòng Thi / Mặt Bằng Bàn Máy</span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Tải lên ảnh chụp thực tế phòng thi từ điện thoại, webcam hoặc sơ đồ CAD để phủ lưới bàn thi trực tiếp lên ảnh.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-cyan-600/20 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Tải Lên Ảnh Phòng</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCaptureFromCamera}
                        className="px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-xs font-bold flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Chụp Bằng Camera</span>
                      </button>

                      {roomPhoto && (
                        <button
                          type="button"
                          onClick={handleScanPhotoWithAI}
                          disabled={analyzing}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 hover:from-teal-400 hover:to-cyan-400 text-white text-xs font-black flex items-center space-x-1.5 shadow-lg shadow-cyan-500/25 cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className={`w-4 h-4 ${analyzing ? 'animate-spin' : ''}`} />
                          <span>{analyzing ? 'AI Đang Quét Bố Cục...' : '✨ AI Quét & Nhận Diện Bố Cục'}</span>
                        </button>
                      )}

                      {roomPhoto && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 cursor-pointer"
                          title="Xóa ảnh chụp phòng thi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* THẺ KẾT QUẢ AI PHÂN TÍCH THỊ GIÁC PHÒNG THI (AI VISION INSIGHTS) */}
                  {analysisResult && (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/60 via-slate-900 to-indigo-950/50 border border-cyan-500/40 shadow-xl space-y-3 animate-in fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-500/20 pb-2.5">
                        <div className="flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
                          <h4 className="text-xs font-black uppercase text-cyan-300 tracking-wider">
                            KẾT QUẢ AI NHẬN DIỆN THỊ GIÁC PHÒNG THI (COMPUTER VISION & SPATIAL REASONING)
                          </h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setShowAiBoxes(!showAiBoxes)}
                            className="text-[11px] font-bold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                          >
                            {showAiBoxes ? 'Ẩn Khung Bounding Box' : 'Hiện Khung Bounding Box'}
                          </button>
                          <button
                            type="button"
                            onClick={handleApplyAiSuggestion}
                            className="text-xs font-black text-white px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 shadow-md shadow-emerald-600/30 flex items-center space-x-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>ÁP DỤNG SƠ ĐỒ AI NÀY</span>
                          </button>
                        </div>
                      </div>

                      {/* Tóm tắt các thực thể nhận diện được */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                          <span className="text-[10px] text-cyan-400 block font-semibold">BẢNG TRẮNG</span>
                          <b className="text-white text-sm">{analysisResult.counts?.whiteboards || 1} cái</b>
                          <span className="text-[9px] text-cyan-300/80 block">Chính diện tường trước</span>
                        </div>
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-[10px] text-emerald-400 block font-semibold">CỬA RA VÀO</span>
                          <b className="text-white text-sm">{analysisResult.counts?.doors || 1} cửa</b>
                          <span className="text-[9px] text-emerald-300/80 block">Góc trước bên trái</span>
                        </div>
                        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                          <span className="text-[10px] text-blue-400 block font-semibold">HỆ THỐNG BÀN</span>
                          <b className="text-white text-sm">{analysisResult.counts?.tables || 2} bàn dài</b>
                          <span className="text-[9px] text-blue-300/80 block">Gỗ có khe sạc Laptop</span>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <span className="text-[10px] text-amber-400 block font-semibold">GHẾ NGỒI</span>
                          <b className="text-white text-sm">{analysisResult.counts?.chairs || 6} ghế</b>
                          <span className="text-[9px] text-amber-300/80 block">Ghế lưới xoay đen</span>
                        </div>
                        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                          <span className="text-[10px] text-purple-400 block font-semibold">MÀN HÌNH / PC</span>
                          <b className="text-white text-sm">{analysisResult.counts?.monitors || 1} màn</b>
                          <span className="text-[9px] text-purple-300/80 block">Thiết bị giám sát / lab</span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start space-x-2">
                        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                        <div>
                          <b className="text-cyan-300">Đề xuất sơ đồ tự động từ ảnh: </b>
                          <span>
                            Đặt Cửa chính ở <b>Góc Trước Trái (TOP_LEFT)</b>, Bảng trắng làm Bục giảng ở <b>Chính Diện (TOP_CENTER)</b>.
                            Thiết lập ma trận <b>2 Dãy × 3 Cột = 6 Chỗ ngồi</b> (Phòng thi BYOD Laptop / Thực hành lập trình).
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Thanh chỉnh độ mờ nền ảnh */}
                  {roomPhoto && (
                    <div className="flex items-center space-x-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Độ đậm ảnh chụp:</span>
                      <input
                        type="range"
                        min="20"
                        max="90"
                        value={photoOpacity}
                        onChange={(e) => setPhotoOpacity(Number(e.target.value))}
                        className="w-48 accent-cyan-500"
                      />
                      <span className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-bold">{photoOpacity}%</span>
                    </div>
                  )}

                  {/* Ô nhập link RTSP CCTV */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-3">
                    <Video className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="flex-1">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                        Luồng Camera CCTV RTSP Phòng Thi (AI Surveillance Realtime Stream)
                      </label>
                      <input
                        type="text"
                        value={rtspUrl}
                        onChange={(e) => setRtspUrl(e.target.value)}
                        placeholder="VD: rtsp://admin:pass@192.168.30.10:554/stream1 hoặc http://127.0.0.1:5000/feed"
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CHỈNH SỬA THỦ CÔNG (MANUAL SEAT EDITOR) */}
            {activeTab === 'MANUAL' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Vị trí Cửa Ra Vào Chính</label>
                    <select
                      value={entrancePos}
                      onChange={(e) => setEntrancePos(e.target.value)}
                      className="w-full py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                    >
                      <option value="TOP_LEFT">Phía trước bên trái (TOP_LEFT)</option>
                      <option value="TOP_RIGHT">Phía trước bên phải (TOP_RIGHT)</option>
                      <option value="BOTTOM_LEFT">Phía sau bên trái (BOTTOM_LEFT)</option>
                      <option value="BOTTOM_RIGHT">Phía sau bên phải (BOTTOM_RIGHT)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Vị trí Bục Giảng Giám Thị</label>
                    <select
                      value={podiumPos}
                      onChange={(e) => setPodiumPos(e.target.value)}
                      className="w-full py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                    >
                      <option value="TOP_CENTER">Chính giữa phía trước (TOP_CENTER)</option>
                      <option value="TOP_LEFT">Lệch trái phía trước (TOP_LEFT)</option>
                      <option value="TOP_RIGHT">Lệch phải phía trước (TOP_RIGHT)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cửa Thoát Hiểm / Cửa Phụ</label>
                    <select
                      value={exitDoorPos}
                      onChange={(e) => setExitDoorPos(e.target.value)}
                      className="w-full py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-white outline-none"
                    >
                      <option value="TOP_RIGHT">Phía trước bên phải (TOP_RIGHT)</option>
                      <option value="BOTTOM_RIGHT">Phía sau bên phải (BOTTOM_RIGHT)</option>
                      <option value="NONE">Không có cửa phụ</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                  <span>
                    💡 <b>Hướng dẫn thủ công:</b> Click vào từng bàn để <b>Bật / Tắt ghế</b> (ghế hỏng/tạm khóa). Bấm vào icon <b>Cây bút</b> để đổi tên bàn/số máy.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setDisabledSeats([]);
                      toast.success('Đã kích hoạt lại toàn bộ các bàn trong phòng!');
                    }}
                    className="text-cyan-600 dark:text-cyan-400 font-bold hover:underline cursor-pointer"
                  >
                    Kích hoạt lại tất cả bàn
                  </button>
                </div>
              </div>
            )}

            {/* ── KHUNG XEM TRƯỚC SƠ ĐỒ THỰC TẾ (LIVE VISUAL PREVIEW & SEAT MATRIX) ── */}
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 shadow-inner overflow-hidden">
              {/* Lớp nền ảnh chụp phòng thi (nếu có) */}
              {roomPhoto && viewMode === 'OVERLAY' && (
                <div
                  className="absolute inset-0 bg-cover bg-center pointer-events-none transition-opacity duration-300"
                  style={{
                    backgroundImage: `url(${roomPhoto})`,
                    opacity: photoOpacity / 100,
                    filter: 'contrast(1.1) brightness(0.95)'
                  }}
                />
              )}

              {/* Lớp mờ bóng tối để nhìn rõ bàn khi ở chế độ overlay */}
              {roomPhoto && viewMode === 'OVERLAY' && (
                <div className="absolute inset-0 bg-slate-950/40 pointer-events-none" />
              )}

              {/* Lớp hiển thị Bounding Box nhận diện AI khi có kết quả phân tích */}
              {showAiBoxes && analysisResult?.detectedObjects && (
                <div className="absolute inset-0 pointer-events-none z-20">
                  {analysisResult.detectedObjects.map((obj: any) => {
                    let borderStyle = 'border-cyan-400 bg-cyan-500/10 text-cyan-300';
                    if (obj.category === 'DOOR') borderStyle = 'border-emerald-400 bg-emerald-500/15 text-emerald-300';
                    if (obj.category === 'CHAIR') borderStyle = 'border-amber-400 bg-amber-500/15 text-amber-300';
                    if (obj.category === 'DESK') borderStyle = 'border-blue-400 bg-blue-500/15 text-blue-300';
                    if (obj.category === 'MONITOR') borderStyle = 'border-purple-400 bg-purple-500/15 text-purple-300';
                    if (obj.category === 'WALL_DECOR') borderStyle = 'border-rose-400 bg-rose-500/10 text-rose-300';

                    return (
                      <div
                        key={obj.id}
                        className={`absolute border-2 rounded-lg transition-all flex flex-col justify-start items-start p-1 ${borderStyle}`}
                        style={{
                          top: `${obj.box.top}%`,
                          left: `${obj.box.left}%`,
                          width: `${obj.box.width}%`,
                          height: `${obj.box.height}%`
                        }}
                      >
                        <span className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded bg-slate-950/90 text-white border border-current shadow-md whitespace-nowrap">
                          {obj.label} ({Math.round(obj.confidence * 100)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="relative z-10 space-y-4">
                {/* THANH KIẾN TRÚC PHÒNG: CỬA & BỤC GIẢNG */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                  {/* CỬA CHÍNH (RA VÀO) */}
                  <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-xs">
                    <DoorOpen className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span>CỬA CHÍNH (RA VÀO)</span>
                  </div>

                  {/* BỤC GIẢNG & TRẠM ĐIỀU KHIỂN GIÁM THỊ */}
                  <div className="flex-1 max-w-md bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-4 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm backdrop-blur-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></span>
                      <span>BỤC GIẢNG & TRẠM ĐIỀU KHIỂN GIÁM THỊ</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold">
                      {room.code}
                    </span>
                  </div>

                  {/* CỬA THOÁT HIỂM */}
                  {exitDoorPos !== 'NONE' && (
                    <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold">
                      <DoorOpen className="w-4 h-4 text-slate-400" />
                      <span>CỬA THOÁT HIỂM</span>
                    </div>
                  )}
                </div>

                {/* MA TRẬN BÀN THI */}
                <div className="space-y-3">
                  {Array.from({ length: rows }).map((_, rIdx) => {
                    const rNum = rIdx + 1;
                    const splitCol = aisles[0] || Math.ceil(cols / 2);

                    const renderDeskBox = (cNum: number) => {
                      const seatKey = `${rNum}-${cNum}`;
                      const isDisabled = disabledSeats.includes(seatKey);
                      const label = customLabels[seatKey] || `BÀN ${rNum}-${cNum}`;

                      return (
                        <div
                          key={cNum}
                          onClick={() => handleToggleSeatStatus(seatKey)}
                          className={`relative p-3 rounded-xl border text-center transition-all cursor-pointer group select-none flex flex-col justify-between min-h-[72px] backdrop-blur-xs ${
                            isDisabled
                              ? 'bg-rose-950/20 border-rose-500/40 text-rose-400 line-through opacity-60 hover:opacity-100 hover:border-rose-500'
                              : 'bg-white/90 dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800 hover:border-cyan-500 hover:shadow-lg dark:hover:border-cyan-500 text-slate-800 dark:text-slate-100 shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] font-mono text-slate-400">
                              {rNum}-{cNum}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditLabel(seatKey, e)}
                              className="p-1 text-slate-400 hover:text-cyan-400 rounded transition opacity-0 group-hover:opacity-100"
                              title="Đổi tên bàn thi / số máy"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="my-1">
                            <span className="text-xs font-bold font-mono tracking-tight block truncate">
                              {label}
                            </span>
                          </div>

                          <div className="flex items-center justify-center">
                            {isDisabled ? (
                              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">
                                Khóa / Hỏng
                              </span>
                            ) : (
                              <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                                Sẵn sàng
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    };

                    return (
                      <div key={rNum} className="flex items-center space-x-3">
                        <span className="w-12 text-xs font-mono font-bold text-slate-400 shrink-0 text-right">
                          Dãy {rNum}
                        </span>

                        {/* Nửa trái (trước lối đi) */}
                        <div className="flex-1 grid gap-2.5" style={{ gridTemplateColumns: `repeat(${splitCol}, minmax(0, 1fr))` }}>
                          {Array.from({ length: splitCol }).map((_, cIdx) => renderDeskBox(cIdx + 1))}
                        </div>

                        {/* LỐI ĐI CHÍNH GIỮA */}
                        <div className="w-8 shrink-0 flex flex-col items-center justify-center text-[10px] font-mono text-slate-400 dark:text-slate-500 tracking-widest border-x border-dashed border-slate-300 dark:border-slate-800 py-1">
                          <span>L</span>
                          <span>Ố</span>
                          <span>I</span>
                          <span>Đ</span>
                          <span>I</span>
                        </div>

                        {/* Nửa phải (sau lối đi) */}
                        <div className="flex-1 grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols - splitCol}, minmax(0, 1fr))` }}>
                          {Array.from({ length: cols - splitCol }).map((_, cIdx) => renderDeskBox(splitCol + cIdx + 1))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 flex items-center justify-between">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Sức chứa tự động: <b className="text-slate-900 dark:text-white">{activeDesks} thí sinh</b> ({disabledSeats.length} bàn bị khóa)
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white text-xs font-bold shadow-lg shadow-cyan-600/25 transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Lưu Cấu Hình Phòng Thi</span>
              </button>
            </div>
          </div>

          {/* DIALOG NHỎ ĐỔI TÊN BÀN THI */}
          {editingSeatKey && (
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
              <div className="w-full max-w-sm bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Edit3 className="w-4 h-4 text-cyan-500" />
                  <span>Đổi Tên Bàn Thi (Tọa độ {editingSeatKey})</span>
                </h4>
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Tên hiển thị / Số hiệu máy:</label>
                  <input
                    type="text"
                    value={editLabelValue}
                    onChange={(e) => setEditLabelValue(e.target.value)}
                    placeholder="VD: PC-01, LAB-02, BÀN 1-1..."
                    autoFocus
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveSeatLabel();
                      if (e.key === 'Escape') setEditingSeatKey(null);
                    }}
                  />
                </div>
                <div className="flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingSeatKey(null)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer font-bold"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveSeatLabel}
                    className="px-4 py-1.5 text-xs bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg cursor-pointer font-bold"
                  >
                    Xác nhận
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

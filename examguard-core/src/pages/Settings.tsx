import React, { useState } from 'react';
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Save,
  Bell,
  Lock,
  Palette,
  Languages,
  Clock,
  Database,
  Check,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  ShieldCheck,
  Sliders,
  Eye,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme, ACCENT_THEMES, AccentTheme } from '../context/ThemeContext';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('appearance');
  const { theme, isDark, accentTheme, setTheme, setAccentTheme } = useTheme();

  const [savedSuccess, setSavedSuccess] = useState(false);

  const tabs = [
    { id: 'appearance', name: 'Giao diện & Màu sắc', icon: Palette },
    { id: 'general', name: 'Thông tin chung', icon: Building2 },
    { id: 'notifications', name: 'Thông báo', icon: Bell },
    { id: 'security', name: 'Bảo mật & KYC', icon: Lock },
    { id: 'system', name: 'Hệ thống Telemetry', icon: Database },
  ];

  const handleSaveAppearance = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* ── HEADER BENTO ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full eg-glass-pill mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              ExamGuard Control Center 2026
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Cấu hình Hệ thống <span className="eg-text-gradient">& Giao diện Khảo thí</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-1">
            Tùy biến phong cách thị giác, bảng màu chủ đạo dynamic và các thông số vận hành an ninh.
          </p>
        </div>

        {savedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300 text-xs font-bold shadow-md"
          >
            <Check className="w-4 h-4" />
            <span>Đã lưu cấu hình thành công!</span>
          </motion.div>
        )}
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── SIDEBAR TABS (Bento Glass Card) ── */}
        <aside className="lg:w-72 flex-shrink-0">
          <div className="eg-cyber-card p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Danh mục cấu hình
            </div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'eg-nav-active'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1 text-left">{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* Quick System Telemetry Card */}
          <div className="mt-4 eg-cyber-card p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Theme Engine
              </span>
              <span className="font-mono text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                Dynamic v2.5
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Mọi thay đổi về chế độ sáng/tối và bộ màu chủ đạo sẽ được áp dụng tức thì trên toàn bộ các trang và buồng giám thị 3D.
            </p>
          </div>
        </aside>

        {/* ── CONTENT AREA ── */}
        <div className="flex-1">
          {activeTab === 'appearance' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              {/* 1. CHỌN CHẾ ĐỘ SÁNG / TỐI / TỰ ĐỘNG */}
              <div className="eg-cyber-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3">
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                      Chế độ Hiển thị (Display Mode)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Chọn giao diện tối để giảm chói mắt trong ca giám sát đêm hoặc giao diện sáng làm việc văn phòng.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-3 py-1 rounded-full eg-glass-pill text-slate-700 dark:text-slate-200">
                    Hiện tại: {theme === 'dark' ? 'Chế độ Tối' : theme === 'light' ? 'Chế độ Sáng' : 'Tự động'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Tối */}
                  <div
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-32 ${
                      theme === 'dark'
                        ? 'border-[var(--color-electric)] bg-slate-900/90 text-white shadow-xl shadow-[var(--color-electric)]/20'
                        : 'border-slate-200 dark:border-white/10 bg-slate-900/40 text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-slate-800 text-amber-400">
                        <Moon className="w-5 h-5" />
                      </div>
                      {theme === 'dark' && (
                        <div className="w-5 h-5 rounded-full bg-[var(--color-electric)] text-white flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-white">Chế độ Tối (Dark Space)</div>
                      <div className="text-[11px] text-slate-400">Deep Obsidian & Kính phát quang</div>
                    </div>
                  </div>

                  {/* Sáng */}
                  <div
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-32 ${
                      theme === 'light'
                        ? 'border-[var(--color-electric)] bg-white text-slate-900 shadow-xl shadow-[var(--color-electric)]/20'
                        : 'border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-800/20 text-slate-500 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/50">
                        <Sun className="w-5 h-5" />
                      </div>
                      {theme === 'light' && (
                        <div className="w-5 h-5 rounded-full bg-[var(--color-electric)] text-white flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm text-slate-900">Chế độ Sáng (Clean Light)</div>
                      <div className="text-[11px] text-slate-500">Tương phản cao, chữ sắc nét</div>
                    </div>
                  </div>

                  {/* Theo hệ thống */}
                  <div
                    onClick={() => setTheme('system')}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-32 ${
                      theme === 'system'
                        ? 'border-[var(--color-electric)] bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-xl shadow-[var(--color-electric)]/20'
                        : 'border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/20 text-slate-500 hover:border-slate-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <Monitor className="w-5 h-5" />
                      </div>
                      {theme === 'system' && (
                        <div className="w-5 h-5 rounded-full bg-[var(--color-electric)] text-white flex items-center justify-center shadow-md">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-extrabold text-sm">Tự động (System)</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Đồng bộ theo hệ điều hành</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. CHỌN MÀU CHỦ ĐẠO TOÀN HỆ THỐNG (5 DYNAMIC ACCENT PALETTES) */}
              <div className="eg-cyber-card p-6 space-y-4">
                <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--color-electric)]" />
                    <h2 className="text-base font-black text-slate-900 dark:text-white">
                      Màu Sắc Chủ Đạo Toàn Hệ Thống (Dynamic Accent Palette)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Toàn bộ thanh điều hướng, nút bấm, viên nhộng kính capsule, thẻ bento và hiệu ứng ánh sáng sẽ đổi màu theo bảng màu bạn chọn bên dưới.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ACCENT_THEMES.map((item) => {
                    const isSelected = accentTheme === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setAccentTheme(item.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group ${
                          isSelected
                            ? 'border-[var(--color-electric)] bg-white/90 dark:bg-slate-900/80 shadow-xl'
                            : 'border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/30 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                        style={{
                          boxShadow: isSelected ? `0 10px 30px -5px ${item.primary}33` : undefined
                        }}
                      >
                        {isSelected && (
                          <div
                            className="absolute top-0 right-0 w-12 h-12 rounded-bl-full flex items-start justify-end p-2 text-white shadow-sm"
                            style={{ backgroundColor: item.primary }}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}

                        <div className="flex items-center gap-3 mb-3">
                          <span
                            className="w-6 h-6 rounded-full shadow-md flex items-center justify-center shrink-0 border border-white/40"
                            style={{ backgroundColor: item.primary }}
                          />
                          <span className="font-black text-sm text-slate-900 dark:text-white tracking-tight">
                            {item.name}
                          </span>
                        </div>

                        {/* Tri-color Swatch Bar */}
                        <div className="h-3 rounded-full flex overflow-hidden shadow-inner border border-black/5 dark:border-white/10">
                          <div className="h-full flex-1" style={{ backgroundColor: item.royal }} />
                          <div className="h-full flex-1" style={{ backgroundColor: item.primary }} />
                          <div className="h-full flex-1" style={{ backgroundColor: item.azure }} />
                        </div>

                        {/* Live mini sample pill */}
                        <div className="mt-3 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-mono">{item.primary}</span>
                          <span
                            className="px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase shadow-sm"
                            style={{
                              backgroundColor: `${item.primary}20`,
                              color: item.primary,
                              border: `1px solid ${item.primary}40`
                            }}
                          >
                            Mẫu hiển thị
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. BẢNG XEM TRƯỚC THỊ GIÁC THỜI GIAN THỰC (LIVE PREVIEW SHOWCASE) */}
              <div className="eg-cyber-card p-6 space-y-4">
                <div className="border-b border-slate-100 dark:border-white/10 pb-3">
                  <h2 className="text-base font-black text-slate-900 dark:text-white">
                    Xem Trước Giao Diện Thực Tế (Live Interactive Preview)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Kiểm tra cách các phần tử giao diện phản ứng với màu sắc và chế độ hiển thị bạn vừa chọn.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Sample Bento Card */}
                  <div className="p-5 rounded-2xl eg-hero-card space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="eg-glass-pill px-3 py-1 text-xs font-bold">
                        Viên nhộng Capsule Pill
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">Live Test</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">
                      Tiêu đề <span className="eg-text-gradient">Phát Sáng Dynamic</span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Chữ đổi gradient theo màu chủ đạo bạn vừa chọn mà không bị mất độ sắc nét và tương phản.
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <button className="eg-btn-gradient px-4 py-2 text-xs font-bold rounded-xl shadow-md cursor-pointer">
                        Nút Chính Dynamic
                      </button>
                      <button className="eg-btn-proctor px-4 py-2 text-xs font-bold rounded-xl shadow-md cursor-pointer">
                        Nút Giám Thị Online
                      </button>
                    </div>
                  </div>

                  {/* Sample Navigation Item & Telemetry */}
                  <div className="p-5 rounded-2xl eg-cyber-card space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Mục Menu Sidebar Đang Được Chọn:
                      </span>
                      <div className="eg-nav-active px-4 py-3 rounded-2xl flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-2">
                          <Palette className="w-4 h-4" />
                          Giao diện & Màu sắc
                        </span>
                        <span className="text-[10px] font-mono uppercase bg-white/20 px-2 py-0.5 rounded-full">Active</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                      <button
                        onClick={handleSaveAppearance}
                        className="eg-btn-gradient px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-lg cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Lưu Cấu Hình Giao Diện</span>
                      </button>
                      <span className="text-[11px] text-slate-500 font-mono">Tự động lưu vào bộ nhớ</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'general' && (
            <div className="eg-cyber-card p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Thông tin trung tâm khảo thí</h2>
                <button className="eg-btn-gradient flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-xl cursor-pointer shadow-md">
                  <Save className="w-4 h-4" />
                  Lưu thông tin
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tên đơn vị đào tạo</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      defaultValue="Học viện Công nghệ ExamGuard"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[var(--color-electric)]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Mã định danh đơn vị</label>
                  <input
                    type="text"
                    defaultValue="EXAMGUARD-AI"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[var(--color-electric)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email hệ thống</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      defaultValue="contact@examguard.edu.vn"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[var(--color-electric)]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Số điện thoại hỗ trợ</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      defaultValue="0987 654 321"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[var(--color-electric)]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Địa chỉ trung tâm</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      defaultValue="Tòa nhà Công nghệ, Hà Nội"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:border-[var(--color-electric)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="eg-cyber-card p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-[var(--color-azure)]" />
                      Cấu hình Cảnh báo & Thông báo Giám sát
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Thiết lập kênh cảnh báo thời gian thực và thông báo cho Giám thị coi thi khi AI phát hiện vi phạm.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveAppearance}
                    className="eg-btn-gradient px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu Cấu Hình</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">Cảnh báo âm thanh vi phạm</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Phát âm thanh bíp cảnh báo khi phát hiện quay cóp</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--color-electric)] cursor-pointer" />
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">Thông báo đẩy Web Push</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Gửi thông báo màn hình khi thí sinh rời tab thi</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--color-electric)] cursor-pointer" />
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">Email biên bản kết thúc ca thi</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Tự động gửi báo cáo vi phạm về email Hội đồng</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--color-electric)] cursor-pointer" />
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">Popup SOS Thí sinh gặp sự cố</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Hiển thị thẻ khẩn cấp nổi bật trên buồng 3D</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--color-electric)] cursor-pointer" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="eg-cyber-card p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[var(--color-azure)]" />
                      An Ninh Zero-Trust & Sinh Trắc Học ArcFace
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Cấu hình tham số ngưỡng cosine vector 512-D và chính sách khóa màn hình an toàn.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveAppearance}
                    className="eg-btn-gradient px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu An Ninh</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Ngưỡng nhận diện ArcFace (Cosine Similarity Threshold)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="50"
                        max="90"
                        defaultValue="68"
                        className="w-full accent-[var(--color-electric)]"
                      />
                      <span className="font-mono text-xs font-bold text-[var(--color-azure)] bg-[var(--color-electric)]/10 px-2.5 py-1 rounded-full">
                        0.68
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Khuyến nghị 0.68 theo chuẩn NIST để cân bằng độ chính xác và tốc độ nhận diện phòng Lab.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Giới hạn cảnh báo rời tab thi
                    </label>
                    <select
                      defaultValue="3"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-[var(--color-electric)]"
                    >
                      <option value="1">1 lần (Khóa ngay - Siêu nghiêm ngặt)</option>
                      <option value="3">3 lần (Cảnh báo 2 lần, lần 3 thu bài)</option>
                      <option value="5">5 lần (Chế độ linh hoạt phòng máy trường)</option>
                    </select>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center justify-between md:col-span-2">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-xs">Kích hoạt Chế độ Kiosk Toàn Màn Hình (Fullscreen Lock)</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Chặn phím Alt+Tab, Windows, F12 DevTools và bẫy sự kiện popstate thoát trình duyệt</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-[var(--color-electric)] cursor-pointer" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'system' && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="eg-cyber-card p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-4">
                  <div>
                    <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-[var(--color-azure)]" />
                      Hạ Tầng Dịch Vụ & Telemetry AI Microservices
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Giám sát trạng thái cụm dịch vụ FastAPI ArcFace, Flask CCTV Stream và Node.js Core Server.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveAppearance}
                    className="eg-glass-pill px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Kiểm Tra Dịch Vụ</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">FastAPI ArcFace AI</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="text-lg font-black font-mono text-[var(--color-azure)]">Port 8000</div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">✓ Vector 512-D Sẵn Sàng</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Flask CCTV Stream</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="text-lg font-black font-mono text-[var(--color-azure)]">Port 5000</div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">✓ YOLOv8 Pose Active</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">ExamGuard Core Server</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="text-lg font-black font-mono text-[var(--color-azure)]">Port 3011</div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">✓ Socket.IO & Multi-DB OK</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

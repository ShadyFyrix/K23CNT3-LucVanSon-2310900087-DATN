import { ReactNode, useMemo, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  UserSquare2,
  Calendar,
  BookOpen,
  ClipboardCheck,
  Building2,
  Presentation,
  Award,
  Newspaper,
  ScanFace,
  FileCheck2,
  Eye,
  Monitor,
  Bell,
  Search,
  Moon,
  Sun,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Shield,
  ShieldCheck,
  Settings,
  Layers,
  Menu,
  X,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Modal } from './Modal';
import { EXAMGUARD_COLORS } from '../constants/theme.constants';

interface NavItem {
  name: string;
  path: string;
  icon: any;
  permission?: string;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    title: 'Tổng quan',
    items: [
      { name: 'Dashboard Khảo thí', path: '/', icon: LayoutDashboard },
      { name: 'Bản tin & Quy chế', path: '/newsfeed', icon: Newspaper },
    ]
  },
  {
    title: 'Khảo thí & Giám sát AI',
    items: [
      { name: 'Lịch thi & Ca thi', path: '/exam-sessions', icon: Calendar, badge: 'GANTT' },
      { name: 'Ngân hàng Đề thi', path: '/exam-papers', icon: BookOpen },
      { name: 'Giám thị Phòng 3D', path: '/live-proctor', icon: Eye, badge: 'LIVE' },
      { name: 'Rà soát & Duyệt điểm', path: '/grading-review', icon: FileCheck2 },
      { name: 'Phòng thi Sinh viên', path: '/exam/take', icon: Monitor, badge: 'WORKSPACE' },
      { name: 'Bảng điểm & Đáp án GV', path: '/exam/result?view=lecturer', icon: Award },
      { name: 'Tra cứu Điểm & Bài thi SV', path: '/exam/result?view=student', icon: ClipboardCheck },
    ]
  },
  {
    title: 'Quản lý Đào tạo',
    items: [
      { name: 'Sinh viên', path: '/students', icon: GraduationCap },
      { name: 'Giảng viên & Giám thị', path: '/teachers', icon: UserSquare2 },
      { name: 'Lớp học', path: '/classes', icon: Presentation },
      { name: 'Học phần & Môn học', path: '/courses', icon: Layers },
      { name: 'Phòng thi & Cơ sở', path: '/campuses', icon: Building2 },
    ]
  },
  {
    title: 'Hệ thống & An ninh',
    items: [
      { name: 'Đăng ký Face ID (KYC)', path: '/face-kyc', icon: ScanFace, badge: 'KYC' },
      { name: 'Phân quyền & Vai trò', path: '/permissions', icon: ShieldCheck },
      { name: 'Cấu hình Hệ thống', path: '/settings', icon: Settings },
    ]
  }
];

const getRoleDisplayName = (user: any): string => {
  if (!user) return 'Chưa đăng nhập';
  const roleNames: string[] = [];

  if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
    user.roles.forEach((r: any) => {
      const name = typeof r === 'object' ? r?.name : r;
      if (name && !roleNames.includes(String(name))) roleNames.push(String(name));
    });
  } else if (user.roleNames && Array.isArray(user.roleNames) && user.roleNames.length > 0) {
    user.roleNames.forEach((name: string) => {
      if (name && !roleNames.includes(String(name))) roleNames.push(String(name));
    });
  } else if (user.role) {
    const name = typeof user.role === 'object' ? user.role?.name : user.role;
    if (name) roleNames.push(String(name));
  }

  if (roleNames.length === 0) return 'Thành viên Khảo thí';

  const displayList = roleNames.map(rawRole => {
    const roleLower = String(rawRole).toLowerCase().trim();
    switch (roleLower) {
      case 'admin':
      case 'superadmin':
        return 'Quản trị viên Khảo thí';
      case 'teacher':
      case 'giảng viên':
        return 'Giảng viên / Giám thị';
      case 'student':
      case 'sinh viên':
        return 'Sinh viên Dự thi';
      case 'academic':
      case 'giáo vụ':
        return 'Giáo vụ Đào tạo';
      default:
        return rawRole;
    }
  });

  return displayList.join(' · ');
};

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout, can, loading } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('examguard_sidebar_collapsed');
    return saved === 'true';
  });
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(navGroups.map(g => g.title));
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Lưu trạng thái thu gọn sidebar
  useEffect(() => {
    localStorage.setItem('examguard_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Phím tắt Ctrl+K / Cmd+K để focus tìm kiếm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('global-search-input');
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredNavGroups = useMemo(() => {
    if (loading || !user) return [];

    return navGroups
      .map(group => {
        const allowedItems = group.items.filter(item => {
          if (!item.permission) return true;
          return can(item.permission);
        });
        return {
          ...group,
          items: allowedItems
        };
      })
      .filter(group => group.items.length > 0);
  }, [user, loading, can]);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans select-none transition-colors duration-200 ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* ── LOGOUT MODAL ── */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Xác nhận Đăng xuất"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Bạn có chắc chắn muốn đăng xuất khỏi phiên làm việc ExamGuard AI không?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsLogoutModalOpen(false)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Hủy
            </button>
            <button
              onClick={confirmLogout}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 transition"
            >
              Đăng xuất ngay
            </button>
          </div>
        </div>
      </Modal>

      {/* ── DESKTOP SIDEBAR (Phong cách Dual-Theme Reference Image 5) ── */}
      <aside
        className={`hidden md:flex flex-col relative shrink-0 transition-all duration-300 ease-in-out border-r z-30 ${
          isCollapsed ? 'w-[72px]' : 'w-[260px]'
        } ${
          isDark
            ? 'bg-[#0B0F19] border-slate-800/80 text-slate-200'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Sidebar Header: Logo & Collapse Button */}
        <div className={`h-16 flex items-center justify-between border-b px-4 transition-all ${
          isDark ? 'border-slate-800/80' : 'border-slate-200/80'
        }`}>
          <div className="flex items-center space-x-3 overflow-hidden">
            <img
              src="/logo.png"
              alt="ExamGuard AI"
              className="w-9 h-9 object-contain rounded-xl shrink-0 p-0.5 bg-white/10 dark:bg-white/5 border border-slate-200/20 shadow-sm"
              onError={(e) => {
                // Fallback nếu ảnh logo đang nạp
                e.currentTarget.style.display = 'none';
              }}
            />
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white block truncate">
                  ExamGuard <span className="text-blue-600 dark:text-blue-400">AI</span>
                </span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-teal-600 dark:text-teal-400 block truncate">
                  Khảo Thí Bảo Mật
                </span>
              </div>
            )}
          </div>

          {/* Nút thu gọn / mở rộng Sidebar */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            className={`p-1.5 rounded-lg border transition ${
              isDark
                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Search Shortcut Bar */}
        <div className="px-3 pt-3 pb-1">
          <div
            onClick={() => {
              if (isCollapsed) setIsCollapsed(false);
              document.getElementById('global-search-input')?.focus();
            }}
            className={`flex items-center rounded-xl px-2.5 py-1.5 text-xs transition cursor-pointer border ${
              isDark
                ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                : 'bg-slate-100/80 border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="ml-2 flex-1 text-[11px] truncate">Tìm nhanh...</span>
                <kbd className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-semibold ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-300 text-slate-500'
                }`}>
                  ⌘K
                </kbd>
              </>
            )}
          </div>
        </div>

        {/* Navigation Menu Links */}
        <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto overflow-x-hidden sidebar-scrollbar">
          {filteredNavGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              {!isCollapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(group.title)}
                  className="flex items-center justify-between w-full px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition"
                >
                  <span className="truncate">{group.title}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform ${
                      expandedGroups.includes(group.title) ? '' : '-rotate-90'
                    }`}
                  />
                </button>
              )}

              {(isCollapsed || expandedGroups.includes(group.title)) && (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      location.pathname === item.path ||
                      (item.path !== '/' && location.pathname.startsWith(item.path.split('?')[0]));

                    return (
                      <div
                        key={item.path}
                        className="relative"
                        onMouseEnter={() => setHoveredItem(item.name)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <Link
                          to={item.path}
                          className={`flex items-center text-xs font-semibold rounded-xl transition-all duration-200 group relative ${
                            isCollapsed ? 'px-0 justify-center h-10' : 'px-3 py-2'
                          } ${
                            isActive
                              ? isDark
                                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-bold shadow-sm'
                                : 'bg-blue-50 text-blue-700 border border-blue-200 font-bold shadow-sm'
                              : isDark
                              ? 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <Icon
                            className={`w-4 h-4 shrink-0 transition-transform ${
                              isCollapsed ? '' : 'mr-2.5'
                            } ${
                              isActive
                                ? isDark ? 'text-blue-400' : 'text-blue-600'
                                : 'text-slate-400 group-hover:scale-110'
                            }`}
                          />
                          {!isCollapsed && (
                            <>
                              <span className="truncate flex-1">{item.name}</span>
                              {item.badge && (
                                <span
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md shrink-0 uppercase tracking-wider ${
                                    item.badge === 'LIVE'
                                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30 animate-pulse'
                                      : item.badge === 'WORKSPACE'
                                      ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                                      : isDark
                                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                      : 'bg-blue-100 text-blue-700'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>

                        {/* Floating Tooltip khi Sidebar bị thu gọn (Reference Image 5) */}
                        {isCollapsed && hoveredItem === item.name && (
                          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-xl border animate-in fade-in zoom-in-95 duration-150 flex items-center space-x-2 ${
                              isDark
                                ? 'bg-slate-900 text-white border-slate-700'
                                : 'bg-slate-900 text-white border-slate-800'
                            }`}>
                              <span>{item.name}</span>
                              {item.badge && (
                                <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-blue-500/20 text-blue-300">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* AI Biometric Promo Card (Reference Image 5 Bottom Card) */}
        {!isCollapsed && (
          <div className="px-3 pb-2">
            <div className={`p-3 rounded-2xl border transition-all ${
              isDark
                ? 'bg-gradient-to-br from-blue-950/40 via-slate-900/60 to-teal-950/30 border-blue-500/20'
                : 'bg-gradient-to-br from-blue-50/80 via-slate-50 to-teal-50/60 border-blue-200'
            }`}>
              <div className="flex items-center space-x-2 mb-1.5">
                <div className="w-6 h-6 rounded-lg bg-teal-500/20 text-teal-500 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  Biometric AI 2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Xác thực khuôn mặt & Giám sát tư thế 3D theo thời gian thực.
              </p>
            </div>
          </div>
        )}

        {/* Sidebar Footer: User Profile Card & Theme Toggle */}
        <div className={`p-3 border-t flex items-center justify-between ${
          isDark ? 'border-slate-800/80 bg-slate-950/40' : 'border-slate-200/80 bg-slate-50/60'
        }`}>
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                  {user?.fullName || 'Người dùng'}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {getRoleDisplayName(user)}
                </p>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center space-x-1 shrink-0">
              <button
                type="button"
                onClick={toggleTheme}
                title={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
                className={`p-1.5 rounded-lg border transition ${
                  isDark
                    ? 'border-slate-800 text-amber-400 hover:bg-slate-800'
                    : 'border-slate-200 text-blue-600 hover:bg-slate-100'
                }`}
              >
                {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(true)}
                title="Đăng xuất"
                className="p-1.5 rounded-lg border border-transparent text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── MOBILE HEADER BAR ── */}
      <div className={`md:hidden fixed top-0 left-0 right-0 h-14 border-b z-40 flex items-center justify-between px-4 ${
        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center space-x-2">
          <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
          <span className="font-extrabold text-sm">ExamGuard AI</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-slate-700/40 text-slate-300"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-800/40"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -260 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -260 }}
            className={`md:hidden fixed inset-y-0 left-0 w-72 z-50 p-4 overflow-y-auto ${
              isDark ? 'bg-slate-950 text-white' : 'bg-white text-slate-900 shadow-2xl'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-800">
              <span className="font-bold text-sm">Danh Mục Khảo Thí</span>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="space-y-4">
              {filteredNavGroups.map((group) => (
                <div key={group.title} className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-2">
                    {group.title}
                  </span>
                  {group.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center px-3 py-2 text-xs font-semibold rounded-xl hover:bg-blue-600/10"
                    >
                      <item.icon className="w-4 h-4 mr-2.5 text-blue-500" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Bar for Desktop */}
        <header className={`h-14 border-b hidden md:flex items-center justify-between px-6 shrink-0 transition-colors ${
          isDark
            ? 'bg-slate-950/80 border-slate-800/80 text-white'
            : 'bg-white/90 border-slate-200/80 text-slate-900'
        }`}>
          {/* Left: Search input */}
          <div className="flex items-center space-x-3 w-80">
            <div className={`flex items-center w-full px-3 py-1.5 rounded-xl border text-xs transition ${
              isDark
                ? 'bg-slate-900/80 border-slate-800 focus-within:border-blue-500'
                : 'bg-slate-100 border-slate-200 focus-within:border-blue-600'
            }`}>
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
              <input
                id="global-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm ca thi, đề thi, sinh viên... (⌘K)"
                className="bg-transparent border-none outline-none w-full text-xs placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Right: Theme Toggle, Quick Actions & Profile */}
          <div className="flex items-center space-x-3">
            {/* Status indicator */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1 rounded-full text-[11px] font-mono border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Cụm Khảo Thí: ONLINE</span>
            </div>

            {/* Chuyển đổi Sáng / Tối */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
              className={`p-2 rounded-xl border transition ${
                isDark
                  ? 'border-slate-800 text-amber-400 hover:bg-slate-900'
                  : 'border-slate-200 text-blue-600 hover:bg-slate-100'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Chuông thông báo */}
            <button
              title="Thông báo"
              className={`p-2 rounded-xl border transition relative ${
                isDark
                  ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                  : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className={`flex-1 overflow-y-auto pt-14 md:pt-0 transition-colors duration-200 ${
          isDark ? 'bg-[#0B0F19]' : 'bg-slate-50'
        }`}>
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-200">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

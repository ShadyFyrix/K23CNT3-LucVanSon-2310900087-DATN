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
  ExternalLink,
  Command,
  CheckCircle2,
  Radio,
  Activity,
  ArrowRight,
  CheckCheck,
  Sliders,
  Zap,
  Globe,
  Palette,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTheme, ACCENT_THEMES } from '../context/ThemeContext';
import { Modal } from './Modal';
import { EXAMGUARD_COLORS } from '../constants/theme.constants';

interface NavItem {
  name: string;
  path: string;
  icon: any;
  permission?: string;
  badge?: string;
  category?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const defaultNavGroups: NavGroup[] = [
  {
    title: 'Tổng quan Khảo thí',
    items: [
      { name: 'Dashboard Khảo thí', path: '/', icon: LayoutDashboard, category: 'Tổng quan' },
      { name: 'Bản tin & Quy chế', path: '/newsfeed', icon: Newspaper, category: 'Tổng quan' },
    ]
  },
  {
    title: 'Khảo thí & Giám sát AI',
    items: [
      { name: 'Lịch thi & Ca thi', path: '/exam-sessions', icon: Calendar, badge: 'GANTT', category: 'Khảo thí' },
      { name: 'Ngân hàng Đề thi', path: '/exam-papers', icon: BookOpen, category: 'Khảo thí' },
      { name: 'Giám thị Phòng 3D', path: '/live-proctor', icon: Eye, badge: 'LIVE', category: 'Giám sát 3D' },
      { name: 'Rà soát & Duyệt điểm', path: '/grading-review', icon: FileCheck2, category: 'Khảo thí' },
      { name: 'Phòng thi Thí sinh', path: '/exam/take', icon: Monitor, badge: 'WORKSPACE', category: 'Thí sinh' },
      { name: 'Bảng điểm & Phổ điểm Ca thi', path: '/exam/result?view=lecturer', icon: Award, category: 'Kết quả' },
      { name: 'Thanh tra & Bài thi Thí sinh', path: '/exam/result?view=student', icon: ClipboardCheck, category: 'Kết quả' },
    ]
  },
  {
    title: 'Quản lý Đào tạo',
    items: [
      { name: 'Sinh viên & Hồ sơ', path: '/students', icon: GraduationCap, category: 'Đào tạo' },
      { name: 'Giảng viên & Giám thị', path: '/teachers', icon: UserSquare2, category: 'Đào tạo' },
      { name: 'Lớp học phần', path: '/classes', icon: Presentation, category: 'Đào tạo' },
      { name: 'Học phần & Môn học', path: '/courses', icon: Layers, category: 'Đào tạo' },
      { name: 'Phòng thi & Cơ sở', path: '/campuses', icon: Building2, category: 'Cơ sở' },
    ]
  },
  {
    title: 'Hệ thống & An ninh',
    items: [
      { name: 'Đăng ký Face ID (KYC)', path: '/face-kyc', icon: ScanFace, badge: 'KYC', category: 'Sinh trắc học' },
      { name: 'Phân quyền & Vai trò', path: '/permissions', icon: ShieldCheck, category: 'Bảo mật' },
      { name: 'Cấu hình Hệ thống', path: '/settings', icon: Settings, category: 'Hệ thống' },
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
  const { user, logout, can, hasRole, loading } = useAuth();
  const { isDark, toggleTheme, accentTheme, setAccentTheme } = useTheme();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('examguard_sidebar_collapsed');
    return saved === 'true';
  });
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // ── Bento Command Palette (Ctrl+K) & Notifications ──
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [paletteSearch, setPaletteSearch] = useState('');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Lưu trạng thái thu gọn sidebar
  useEffect(() => {
    localStorage.setItem('examguard_sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  // Phím tắt Ctrl+K / Cmd+K để mở Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsNotificationsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Xác định danh sách menu theo vai trò người dùng (Student, Teacher, Admin/Academic)
  const roleNavGroups = useMemo<NavGroup[]>(() => {
    if (loading || !user) return [];

    const isStudent = hasRole('student') && !hasRole('admin');
    const isTeacher = hasRole('teacher') && !hasRole('admin');

    if (isStudent) {
      return [
        {
          title: 'Cổng Thí Sinh',
          items: [
            { name: 'Sảnh Sinh viên', path: '/', icon: LayoutDashboard, category: 'Thí sinh' },
            { name: 'Hồ sơ & Lịch thi cá nhân', path: '/student', icon: GraduationCap, category: 'Thí sinh' },
            { name: 'Vào Buồng thi AI', path: '/exam/take', icon: Monitor, badge: 'WORKSPACE', category: 'Làm bài' },
            { name: 'Kết quả & Bảng điểm', path: '/exam/result?view=student', icon: ClipboardCheck, category: 'Kết quả' },
          ]
        },
        {
          title: 'Thông Tin & Quy Chế',
          items: [
            { name: 'Bản tin & Quy chế thi', path: '/newsfeed', icon: Newspaper, category: 'Thông tin' },
          ]
        }
      ];
    }

    if (isTeacher) {
      return [
        {
          title: 'Bàn làm việc Giảng viên',
          items: [
            { name: 'Trạm làm việc GV', path: '/', icon: LayoutDashboard, category: 'Giảng viên' },
            { name: 'Hồ sơ & Nhiệm vụ Coi thi', path: '/teacher', icon: UserSquare2, category: 'Giảng viên' },
            { name: 'Bản tin & Quy chế', path: '/newsfeed', icon: Newspaper, category: 'Thông tin' },
          ]
        },
        {
          title: 'Coi thi & Khảo thí',
          items: [
            { name: 'Giám thị Phòng 3D', path: '/live-proctor', icon: Eye, badge: 'LIVE', category: 'Giám sát 3D' },
            { name: 'Rà soát & Duyệt điểm', path: '/grading-review', icon: FileCheck2, category: 'Khảo thí' },
            { name: 'Ngân hàng Đề thi', path: '/exam-papers', icon: BookOpen, category: 'Khảo thí' },
            { name: 'Lịch thi & Ca thi', path: '/exam-sessions', icon: Calendar, badge: 'GANTT', category: 'Khảo thí' },
            { name: 'Bảng điểm & Phổ điểm GV', path: '/exam/result?view=lecturer', icon: Award, category: 'Kết quả' },
            { name: 'Thanh tra Bài thi Thí sinh', path: '/exam/result?view=student', icon: ClipboardCheck, category: 'Kết quả' },
          ]
        },
        {
          title: 'Học thuật & Đào tạo',
          items: [
            { name: 'Lớp học phần', path: '/classes', icon: Presentation, category: 'Đào tạo' },
            { name: 'Danh sách Sinh viên', path: '/students', icon: GraduationCap, category: 'Đào tạo' },
          ]
        }
      ];
    }

    // Admin / Academic / Khảo thí toàn trường
    return defaultNavGroups;
  }, [user, loading, hasRole]);

  // Khởi tạo mở rộng tất cả các group khi roleNavGroups thay đổi
  useEffect(() => {
    if (roleNavGroups.length > 0) {
      setExpandedGroups(roleNavGroups.map(g => g.title));
    }
  }, [roleNavGroups]);

  const filteredNavGroups = useMemo(() => {
    if (!searchQuery.trim()) return roleNavGroups;

    const q = searchQuery.toLowerCase().trim();
    return roleNavGroups
      .map(group => ({
        ...group,
        items: group.items.filter(
          item => item.name.toLowerCase().includes(q) || item.path.toLowerCase().includes(q)
        )
      }))
      .filter(group => group.items.length > 0);
  }, [roleNavGroups, searchQuery]);

  // Tất cả các action cho Command Palette
  const allPaletteActions = useMemo(() => {
    const actions: Array<{ name: string; path: string; icon: any; category: string; badge?: string }> = [];
    roleNavGroups.forEach(g => {
      g.items.forEach(it => {
        actions.push({
          name: it.name,
          path: it.path,
          icon: it.icon,
          category: it.category || g.title,
          badge: it.badge
        });
      });
    });

    // Thêm các lệnh nhanh
    actions.push(
      { name: 'Chuyển Chế độ Giao diện (Sáng / Tối)', path: '#toggle-theme', icon: isDark ? Sun : Moon, category: 'Tùy chỉnh' },
      { name: 'Đăng xuất khỏi ExamGuard AI', path: '#logout', icon: LogOut, category: 'Tài khoản' }
    );

    if (!paletteSearch.trim()) return actions;
    const q = paletteSearch.toLowerCase().trim();
    return actions.filter(a => a.name.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
  }, [roleNavGroups, paletteSearch, isDark]);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePaletteSelect = (path: string) => {
    setIsCommandPaletteOpen(false);
    setPaletteSearch('');
    if (path === '#toggle-theme') {
      toggleTheme();
    } else if (path === '#logout') {
      setIsLogoutModalOpen(true);
    } else {
      navigate(path);
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans select-none transition-colors duration-300 relative ${
      isDark ? 'bg-[#070814] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* ── ATMOSPHERIC AMBIENT GLOWS (CYBER ELECTRIC LUXURY TỪ ẢNH 2 & ẢNH 1) ── */}
      {isDark && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {/* Top-Right Dynamic Accent Ambient Aura */}
          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[var(--color-electric)]/15 via-[var(--color-royal)]/10 to-transparent blur-[120px] eg-aurora-glow" />
          {/* Bottom-Left Dynamic Accent Ambient Aura */}
          <div className="absolute -bottom-40 -left-40 w-[650px] h-[650px] rounded-full bg-gradient-to-tr from-[var(--color-azure)]/15 via-[var(--color-electric)]/10 to-transparent blur-[130px] eg-aurora-glow" style={{ animationDelay: '4s' }} />
          {/* Center Subtle Specular Highlight */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[var(--color-electric)]/5 blur-[160px]" />
        </div>
      )}

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
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={confirmLogout}
              className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer"
            >
              Đăng xuất ngay
            </button>
          </div>
        </div>
      </Modal>

      {/* ── BENTO COMMAND PALETTE MODAL (Ctrl + K) ── */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCommandPaletteOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -10 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10"
            >
              {/* Search Bar Input */}
              <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-800">
                <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={paletteSearch}
                  onChange={(e) => setPaletteSearch(e.target.value)}
                  placeholder="Gõ lệnh tìm kiếm nhanh ca thi, phòng 3D, báo cáo... (Esc để đóng)"
                  className="w-full bg-transparent text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                />
                <kbd className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700">
                  ESC
                </kbd>
              </div>

              {/* Action List */}
              <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                {allPaletteActions.length > 0 ? (
                  allPaletteActions.map((act) => {
                    const Icon = act.icon;
                    return (
                      <button
                        key={act.name}
                        onClick={() => handlePaletteSelect(act.path)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[var(--color-electric)]/10 hover:text-[var(--color-azure)] transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3 truncate">
                          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-[var(--color-electric)]/20 group-hover:text-[var(--color-azure)] transition-colors">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="truncate">{act.name}</span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          {act.badge && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-electric)]/15 text-[var(--color-azure)] border border-[var(--color-azure)]/30 font-bold">
                              {act.badge}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                            {act.category}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-[var(--color-azure)]" />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Không tìm thấy mục nào khớp với "{paletteSearch}"
                  </div>
                )}
              </div>

              {/* Footer Quick Tip */}
              <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-400">
                <span>Nhấn <strong>Enter</strong> để chọn, <strong>Esc</strong> để thoát</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">ExamGuard Pro Max</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DESKTOP SIDEBAR (Bento Box + Modern Glassmorphism) ── */}
      <aside
        className={`hidden md:flex flex-col relative shrink-0 transition-all duration-300 ease-in-out border-r z-30 ${
          isCollapsed ? 'w-[72px]' : 'w-[264px]'
        } ${
          isDark
            ? 'bg-[#0B0C1E]/85 backdrop-blur-2xl border-white/[0.08] text-slate-200 shadow-[4px_0_30px_rgba(0,0,0,0.5)]'
            : 'bg-white/95 backdrop-blur-xl border-slate-200/90 text-slate-800'
        }`}
      >
        {/* Sidebar Header: Logo & Collapse Button */}
        <div className={`h-16 flex items-center justify-between border-b px-4 transition-all ${
          isDark ? 'border-white/[0.08]' : 'border-slate-200/80'
        }`}>
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 rounded-xl eg-btn-gradient flex items-center justify-center shrink-0 p-0.5 border border-white/20">
              <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white block truncate">
                  ExamGuard <span className="eg-text-gradient">AI</span>
                </span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[var(--color-azure)] block truncate">
                  {hasRole('student') && !hasRole('admin')
                    ? 'Cổng Thí Sinh AI'
                    : hasRole('teacher') && !hasRole('admin')
                    ? 'Bàn Giám Thị AI'
                    : 'Trung Tâm Khảo Thí'}
                </span>
              </div>
            )}
          </div>

          {/* Nút thu gọn / mở rộng Sidebar */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isDark
                ? 'border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/80'
                : 'border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
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
                          className={`flex items-center text-xs font-semibold rounded-2xl transition-all duration-300 group relative ${
                            isCollapsed ? 'px-0 justify-center h-10' : 'px-3 py-2.5'
                          } ${
                            isActive
                              ? 'eg-nav-active'
                              : isDark
                              ? 'text-slate-400 hover:bg-white/[0.06] hover:text-white hover:translate-x-0.5'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className={`p-1.5 rounded-xl transition-all duration-300 ${
                            isActive
                              ? 'bg-[var(--color-electric)]/20 text-white shadow-xs'
                              : 'text-slate-400 group-hover:scale-105 group-hover:text-white'
                          } ${isCollapsed ? '' : 'mr-2.5'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {!isCollapsed && (
                            <>
                              <span className="truncate flex-1 tracking-tight">{item.name}</span>
                              {item.badge && (
                                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider bg-[var(--color-electric)]/15 text-[var(--color-azure)] border border-[var(--color-azure)]/30">
                                  {item.badge}
                                </span>
                              )}
                            </>
                          )}
                        </Link>

                        {/* Floating Tooltip khi Sidebar bị thu gọn */}
                        {isCollapsed && hoveredItem === item.name && (
                          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none">
                            <div className="px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap shadow-xl border bg-slate-900 text-white border-slate-700 flex items-center space-x-2">
                              <span>{item.name}</span>
                              {item.badge && (
                                <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-electric)]/20 text-[var(--color-azure)] font-bold">
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

        {/* Sidebar Footer: User Profile Card & Theme Toggle */}
        <div className={`p-3 border-t flex items-center justify-between ${
          isDark ? 'border-white/10 bg-[#070814]/40' : 'border-slate-200/80 bg-slate-50/60'
        }`}>
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full eg-btn-gradient text-white font-bold text-xs flex items-center justify-center shadow-md shrink-0 border border-white/20">
              {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                  {user?.fullName || 'Quản trị viên'}
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
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
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
                className="p-1.5 rounded-lg border border-transparent text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── MOBILE HEADER BAR ── */}
      <div className={`md:hidden fixed top-0 left-0 right-0 h-14 border-b z-40 flex items-center justify-between px-4 ${
        isDark ? 'bg-slate-950/95 backdrop-blur-md border-slate-800 text-white' : 'bg-white/95 backdrop-blur-md border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm">ExamGuard AI</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="p-1.5 rounded-lg border border-slate-700/40 text-slate-300"
          >
            <Search className="w-4 h-4" />
          </button>
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
                      className={`flex items-center px-3 py-2 text-xs font-semibold rounded-xl ${
                        location.pathname === item.path
                          ? 'eg-nav-active'
                          : 'hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      <item.icon className="w-4 h-4 mr-2.5" />
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
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        {/* Top Header Bar for Desktop (Bento Glassmorphism) */}
        <header className={`h-16 border-b hidden md:flex items-center justify-between px-6 lg:px-8 shrink-0 transition-colors z-20 sticky top-0 ${
          isDark
            ? 'bg-[#070814]/80 backdrop-blur-2xl border-white/[0.08] text-white'
            : 'bg-white/90 backdrop-blur-xl border-slate-200/90 text-slate-900'
        }`}>
          {/* Left: Quick Command Search Trigger */}
          <div className="flex items-center space-x-3 w-96">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className={`flex items-center w-full px-3.5 py-2 rounded-full border text-xs transition cursor-pointer ${
                isDark
                  ? 'bg-[#0B0C1E]/80 border-white/10 text-slate-400 hover:border-[#1951fc]/50 hover:text-white shadow-inner'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:border-cyan-400 hover:text-slate-800 shadow-inner'
              }`}
            >
              <Search className="w-4 h-4 text-[#3781fc] mr-2.5 shrink-0" />
              <span className="text-xs truncate flex-1 text-left font-medium">Tìm ca thi, đề thi, sinh viên...</span>
              <kbd className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-white/10 text-slate-300 border border-white/10">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right: Cluster Status, Theme Switcher, Notifications & Profile */}
          <div className="flex items-center space-x-3.5">
            {/* Status indicator capsule pill */}
            <div className="hidden lg:flex items-center space-x-2.5 px-4 py-1.5 rounded-full text-xs font-mono font-bold eg-glass-pill text-[#0b2cb1] dark:text-[#cbe9fd] shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              </span>
              <span className="tracking-wide">
                {hasRole('student') && !hasRole('admin')
                  ? 'CỔNG THÍ SINH: SẴN SÀNG'
                  : hasRole('teacher') && !hasRole('admin')
                  ? 'BUỒNG GIÁM THỊ 3D: ONLINE'
                  : 'CỤM KHẢO THÍ: ONLINE'}
              </span>
            </div>

            {/* 🎨 Bộ chọn màu toàn hệ thống (Dynamic Accent Palette Switcher) */}
            <div className="relative">
              <button
                onClick={() => setIsPaletteOpen(!isPaletteOpen)}
                title="Đổi màu chủ đạo toàn hệ thống"
                className={`p-2 rounded-full border transition cursor-pointer flex items-center gap-1.5 ${
                  isDark
                    ? 'border-white/10 text-[#cbe9fd] hover:bg-white/5 hover:border-white/20'
                    : 'border-slate-200 text-[#0b2cb1] hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: ACCENT_THEMES.find(t => t.id === accentTheme)?.primary || '#1951fc' }}
                />
              </button>

              <AnimatePresence>
                {isPaletteOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 rounded-2xl bg-white/95 dark:bg-[#0B0C1E]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl p-3 z-50 text-slate-900 dark:text-white"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10 mb-2">
                      <span className="text-xs font-bold">Màu Chủ Đạo Hệ Thống</span>
                      <span className="text-[10px] font-mono text-slate-400">5 chủ đề</span>
                    </div>
                    <div className="space-y-1">
                      {ACCENT_THEMES.map((themeOpt) => {
                        const isSelected = accentTheme === themeOpt.id;
                        return (
                          <button
                            key={themeOpt.id}
                            onClick={() => {
                              setAccentTheme(themeOpt.id);
                              setIsPaletteOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                              isSelected
                                ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white border border-slate-300 dark:border-white/20 shadow-sm'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-3.5 h-3.5 rounded-full shadow-md shrink-0"
                                style={{ backgroundColor: themeOpt.primary }}
                              />
                              <span className="text-xs">{themeOpt.name}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Chuyển đổi Sáng / Tối */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Chuyển sang chế độ Sáng' : 'Chuyển sang chế độ Tối'}
              className={`p-2 rounded-full border transition cursor-pointer ${
                isDark
                  ? 'border-white/10 text-amber-400 hover:bg-white/5 hover:border-white/20'
                  : 'border-slate-200 text-blue-600 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Chuông thông báo Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                title="Thông báo hệ thống"
                className={`p-2 rounded-full border transition relative cursor-pointer ${
                  isDark
                    ? 'border-white/10 text-slate-300 hover:text-white hover:bg-white/5 hover:border-white/20'
                    : 'border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-80 rounded-2xl bg-white/95 dark:bg-[#0B0C1E]/95 backdrop-blur-2xl border border-slate-200 dark:border-white/10 shadow-2xl p-3 z-50 text-slate-900 dark:text-white"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-white/10">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">Thông báo Khảo thí</span>
                      <span className="text-[10px] font-mono text-[var(--color-azure)] font-bold">3 mới</span>
                    </div>
                    <div className="py-2 space-y-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-[var(--color-electric)]/10 border border-[var(--color-azure)]/20 text-[var(--color-azure)]">
                        <p className="font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Cụm AI Khảo thí Sẵn sàng</span>
                        </p>
                        <p className="text-[11px] opacity-80 mt-0.5">ArcFace 3D + Microservice CCTV hoạt động bình thường.</p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[var(--color-electric)]/10 border border-[var(--color-azure)]/30 text-[var(--color-azure)]">
                        <p className="font-bold flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 shrink-0" />
                          <span>Ca thi LAB-01 đang diễn ra</span>
                        </p>
                        <p className="text-[11px] opacity-80 mt-0.5">24 bàn thi đã sẵn sàng giám sát trực tiếp.</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body (Layout Chuẩn Rộng Thoáng Theo Skill UI/UX Pro Max) */}
        <main className={`flex-1 overflow-y-auto transition-colors duration-200 ${
          isDark ? 'bg-transparent' : 'bg-slate-50'
        }`}>
          <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200 space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

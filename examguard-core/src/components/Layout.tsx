import { ReactNode, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  GraduationCap,
  HeartHandshake,
  UserSquare2,
  BarChart3,
  LogOut,
  Menu,
  X,
  Settings2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  BookOpen,
  Wallet,
  Receipt,
  ClipboardCheck,
  FolderOpen,
  Settings,
  ShieldCheck,
  ChevronDown,
  UserPlus,
  Building2,
  Presentation,
  Layers,
  Award,
  Landmark,
  CalendarCheck,
  Newspaper,
  MapPin,
  ScanFace,
  FileCheck2,
  Eye,
  Monitor,
  Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Modal } from './Modal';
import { PERMISSIONS } from '../constants/permissions'; // Import hằng số quyền

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NavItem {
  name: string;
  path: string;
  icon: any;
  permission?: string; // Bổ sung trường này (optional)
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
  accent?: string;
}



// 2. Danh mục điều hướng chuẩn cho Hệ thống Khảo thí ExamGuard AI
const navGroups: NavGroup[] = [
  {
    title: 'Tổng quan',
    accent: 'sky',
    items: [
      { name: 'Dashboard Khảo thí', path: '/', icon: LayoutDashboard },
      { name: 'Bản tin & Thông báo', path: '/newsfeed', icon: Newspaper },
    ]
  },
  {
    title: 'Khảo thí & Giám sát AI',
    accent: 'violet',
    items: [
      { name: 'Lịch thi & Ca thi', path: '/exam-sessions', icon: Calendar, badge: 'AI' },
      { name: 'Ngân hàng Đề thi', path: '/exam-papers', icon: BookOpen },
      { name: 'Giám thị Phòng 3D', path: '/live-proctor', icon: Eye, badge: 'LIVE' },
      { name: 'Rà soát & Duyệt điểm', path: '/grading-review', icon: FileCheck2 },
      { name: 'Phòng thi Làm bài', path: '/exam/take', icon: Monitor, badge: 'SV' },
      { name: 'Kết quả & Đáp án', path: '/exam/result', icon: Award },
    ]
  },
  {
    title: 'Quản lý Đào tạo',
    accent: 'emerald',
    items: [
      { name: 'Sinh viên', path: '/students', icon: GraduationCap },
      { name: 'Giảng viên & Giám thị', path: '/teachers', icon: UserSquare2 },
      { name: 'Lớp học', path: '/classes', icon: Presentation },
      { name: 'Học phần & Môn học', path: '/courses', icon: BookOpen },
      { name: 'Phòng thi & Cơ sở', path: '/campuses', icon: Building2 },
    ]
  },
  {
    title: 'Hệ thống & Face AI',
    accent: 'slate',
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

  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(navGroups.map(g => g.title));

  const filteredNavGroups = useMemo(() => {
    // Nếu đang load hoặc chưa có user, trả về mảng rỗng
    if (loading || !user) return [];

    console.group("🔐 [RBAC Debug] Sidebar Filtering");
    console.log("User:", user.fullName);
    console.log("Role:", user.role?.name || "N/A");
    console.log("Permissions:", user.permissions);

    const filtered = navGroups
      .map(group => {
        const allowedItems = group.items.filter(item => {
          const isParent = user.department === 'parent' || 
            (user.role && (typeof user.role === 'object' ? user.role.name : user.role)?.toLowerCase() === 'parent') ||
            (user.roles && user.roles.some((r: any) => (typeof r === 'object' ? r.name : r)?.toLowerCase() === 'parent'));
          
          if (isParent && (item.path === '/teacher-attendance-report' || item.path === '/payroll-report' || item.path === '/operating-expense-report')) {
            return false;
          }

          // Nếu item không yêu cầu quyền, cho hiện luôn
          if (!item.permission) return true;
          // Sử dụng hàm can để kiểm tra quyền
          const isAllowed = can(item.permission);
          
          if (!isAllowed) {
            console.log(`🚫 Denied: [${group.title} > ${item.name}] - Needs: ${item.permission}`);
          } else {
            console.log(`✅ Allowed: [${group.title} > ${item.name}]`);
          }
          
          return isAllowed;
        }).map(item => {
          const isParent = user.department === 'parent' || 
            (user.role && (typeof user.role === 'object' ? user.role.name : user.role)?.toLowerCase() === 'parent') ||
            (user.roles && user.roles.some((r: any) => (typeof r === 'object' ? r.name : r)?.toLowerCase() === 'parent'));
          
          if (isParent && item.path === '/attendance') {
            return { ...item, name: 'Điểm danh & Lịch học' };
          }
          return item;
        });

        return {
          ...group,
          items: allowedItems
        };
      })
      // Chỉ giữ lại những nhóm có ít nhất 1 item được phép xem
      .filter(group => group.items.length > 0);

    console.groupEnd();
    return filtered;
  }, [user, loading, can]);


  const toggleGroup = (title: string) => {
    setExpandedGroups(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
    setIsMobileMenuOpen(false);
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Xác nhận đăng xuất"
      >
        <div className="space-y-6">
          <p className="text-slate-600">Bạn có chắc chắn muốn đăng xuất khỏi ExamGuard AI không?</p>
          <div className="flex gap-3">
            <button
              onClick={() => setIsLogoutModalOpen(false)}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              Hủy
            </button>
            <button
              onClick={confirmLogout}
              className="flex-1 px-6 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Sidebar Desktop ─── */}
      <aside
        className={cn(
          "hidden md:flex flex-col transition-all duration-300 ease-in-out relative",
          "bg-gradient-to-b from-slate-950 via-[#0c1222] to-slate-950",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-14 bg-sky-500 text-white rounded-full p-1.5 shadow-lg shadow-sky-500/30 hover:bg-sky-400 transition-all z-50 hover:scale-110"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {/* Brand */}
        <div className={cn("transition-all duration-300 border-b border-white/5", isCollapsed ? "px-3 py-5" : "px-5 py-5")}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0",
              isCollapsed ? "w-10 h-10" : "w-9 h-9"
            )}>
              <ShieldCheck className={cn("text-white", isCollapsed ? "w-5 h-5" : "w-4.5 h-4.5")} strokeWidth={2.5} />
            </div>
            {!isCollapsed && (
              <div className="animate-in fade-in duration-300">
                <h1 className="text-lg font-extrabold tracking-tight text-white leading-none">
                  ExamGuard<span className="text-sky-400"> AI</span>
                </h1>
                <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-[0.2em] font-semibold">
                  Quản lý Thi Trực tuyến
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-4 space-y-5 overflow-y-auto overflow-x-hidden sidebar-scrollbar font-sans">
          {filteredNavGroups.map((group) => (
            <div key={group.title} className="space-y-0.5">
              {!isCollapsed && (
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em] hover:text-slate-300 transition-colors group/header"
                >
                  <span className="truncate">{group.title}</span>
                  <ChevronDown className={cn(
                    "w-3 h-3 transition-transform duration-200 shrink-0",
                    expandedGroups.includes(group.title) ? "" : "-rotate-90"
                  )} />
                </button>
              )}

              {(isCollapsed || expandedGroups.includes(group.title)) && (
                <div className="space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        title={isCollapsed ? item.name : ""}
                        className={cn(
                          "flex items-center py-2 text-[13px] font-medium rounded-lg transition-all duration-200 group relative",
                          isCollapsed ? "px-0 justify-center" : "px-3",
                          isActive
                            ? "bg-gradient-to-r from-sky-500/15 to-violet-500/10 text-sky-400 border-l-2 border-sky-400"
                            : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                        )}
                      >
                        <Icon className={cn(
                          "w-4 h-4 transition-all shrink-0",
                          isCollapsed ? "" : "mr-2.5",
                          isActive ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"
                        )} />
                        {!isCollapsed && (
                          <>
                            <span className="truncate flex-1">{item.name}</span>
                            {item.badge && (
                              <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0",
                                item.badge === 'LIVE' 
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30" 
                                  : "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-white/5 bg-black/20">
          <div className={cn("flex items-center mb-2 transition-all duration-300", isCollapsed ? "justify-center" : "px-2 py-2")}>
            <div className={cn(
              "rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 text-white flex items-center justify-center font-bold transition-all shrink-0 shadow-lg shadow-sky-500/15",
              isCollapsed ? "w-10 h-10 text-sm" : "w-9 h-9 mr-3 text-xs"
            )}>
              {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
            </div>
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden animate-in fade-in duration-300">
                <p className="text-sm font-bold text-white truncate leading-tight" title={user?.fullName}>{user?.fullName || 'Người dùng'}</p>
                <div className="mt-0.5">
                  <span className="inline-block text-[10px] font-semibold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20 truncate max-w-full">
                    {getRoleDisplayName(user)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleLogoutClick}
            title={isCollapsed ? "Đăng xuất" : ""}
            className={cn(
              "flex items-center w-full py-2 text-sm font-medium text-slate-500 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all",
              isCollapsed ? "justify-center" : "px-2"
            )}
          >
            <LogOut className={cn("w-4 h-4 transition-all", isCollapsed ? "" : "mr-2.5")} />
            {!isCollapsed && <span className="animate-in fade-in duration-300 text-xs font-semibold">Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ─── Mobile Header ─── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-950 text-white flex items-center justify-between px-4 z-50 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-extrabold text-white">
            ExamGuard<span className="text-sky-400"> AI</span>
          </span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-40 pt-14 overflow-y-auto">
          <nav className="p-4 space-y-5">
            {filteredNavGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-[0.15em]">
                  {group.title}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all",
                          isActive 
                            ? "bg-gradient-to-r from-sky-500/15 to-violet-500/10 text-sky-400" 
                            : "text-slate-400 hover:bg-white/5"
                        )}
                      >
                        <Icon className="w-4 h-4 mr-3" />
                        <span className="flex-1">{item.name}</span>
                        {item.badge && (
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                            item.badge === 'LIVE' 
                              ? "bg-red-500/20 text-red-400" 
                              : "bg-violet-500/20 text-violet-400"
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      )}

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 bg-slate-50">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

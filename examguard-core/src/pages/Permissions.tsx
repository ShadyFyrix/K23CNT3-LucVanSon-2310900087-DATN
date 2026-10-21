
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield,
  ShieldCheck, 
  Plus, 
  Search, 
  Check, 
  UserCog,
  Trash2, 
  Info,
  Loader2,
  AlertTriangle,
  Save,
  Users,
  Settings,
  Lock,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { toast } from 'react-hot-toast';
import { PERMISSION_GROUPS, PERMISSIONS } from '../constants/permissions'; 
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Permissions() {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Tải danh sách vai trò từ Server
  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/roles');
      if (res.data.success) {
        const BLUEPRINT_ROLES = ['admin', 'academic', 'teacher', 'student'];
        const rawList = res.data.data || [];
        const rolesList = rawList.filter((r: any) =>
          BLUEPRINT_ROLES.includes(String(r.name).toLowerCase().trim())
        );
        setRoles(rolesList);

        // Logic chọn Role để hiển thị
        if (!selectedRole && rolesList.length > 0) {
          setSelectedRole(rolesList[0]);
        } 
        else if (selectedRole) {
          // Tìm bản ghi mới nhất của Role đang chọn trong danh sách vừa tải về
          const updated = rolesList.find((r: any) => r._id === selectedRole._id);
          if (updated) {
            setSelectedRole(updated);
          }
        }
      }
    } catch (error: any) {
      toast.error("Không thể tải danh sách vai trò");
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    fetchRoles();
  }, []);

  // 2. Logic Bật/Tắt quyền
  const handleTogglePermission = (permId: string) => {
    // Không cho sửa Admin tối cao hoặc các quyền 'all'
    if (selectedRole?.permissions.includes('all') || selectedRole?.name?.toLowerCase() === 'admin') {
      toast.error("Vai trò quản trị tối cao có toàn quyền hệ thống");
      return;
    }

    // ĐẶC BIỆT: Quyền Syllabus.MANAGE chỉ dành cho Admin (Không cho gán cho role khác)
    if (permId === PERMISSIONS.SYLLABUS.MANAGE) {
      toast.error("Chỉ duy nhất Admin được phép có quyền điều chỉnh Khung chương trình (Syllabus)");
      return;
    }

    const currentPerms = [...selectedRole.permissions];
    const index = currentPerms.indexOf(permId);

    if (index > -1) {
      currentPerms.splice(index, 1);
    } else {
      currentPerms.push(permId);
    }

    setSelectedRole({ ...selectedRole, permissions: currentPerms });
  };

  // Logic Chọn/Bỏ chọn nhanh cho toàn bộ nhóm quyền
  const handleToggleGroupPermissions = (groupPermIds: string[], selectAll: boolean) => {
    if (selectedRole?.permissions.includes('all') || selectedRole?.name?.toLowerCase() === 'admin') {
      toast.error("Vai trò quản trị tối cao có toàn quyền hệ thống");
      return;
    }

    let updatedPerms = [...selectedRole.permissions];

    if (selectAll) {
      groupPermIds.forEach(id => {
        // Chỉ duy nhất Admin được Syllabus.MANAGE
        if (id === PERMISSIONS.SYLLABUS.MANAGE && selectedRole?.name?.toLowerCase() !== 'admin') {
          return;
        }
        if (!updatedPerms.includes(id)) {
          updatedPerms.push(id);
        }
      });
      toast.success("Đã chọn tất cả quyền trong nhóm");
    } else {
      updatedPerms = updatedPerms.filter(id => !groupPermIds.includes(id));
      toast.success("Đã bỏ chọn các quyền trong nhóm");
    }

    setSelectedRole({ ...selectedRole, permissions: updatedPerms });
  };

  const isGroupAllSelected = (groupPerms: any[]) => {
    if (!selectedRole) return false;
    return groupPerms.every(p => selectedRole.permissions.includes(p.id));
  };

  // 3. Lưu thay đổi xuống Database
  const handleSave = async () => {
    if (!selectedRole) return;

    const payload = {
      id: selectedRole._id,
      name: selectedRole.name,
      description: selectedRole.description,
      permissions: selectedRole.permissions
    };

    setSaving(true);
    try {
      const res = await apiClient.post('/roles', payload);
      if (res.data.success) {
        toast.success("Đã cập nhật quyền hạn thành công!");
        fetchRoles();
      } else {
        toast.error(res.data.message || "Lỗi lưu cấu hình");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Không thể kết nối đến máy chủ";
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // 4. Xóa Vai trò
  const handleDeleteRole = async () => {
    if (selectedRole.isSystem || selectedRole.name?.toLowerCase() === 'admin') {
      return toast.error("Không thể xóa vai trò hệ thống!");
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa vai trò "${selectedRole.name}"?`)) return;

    try {
      const res = await apiClient.delete(`/roles/${selectedRole._id}`);
      if (res.data.success) {
        toast.success("Đã xóa vai trò");
        setSelectedRole(null);
        fetchRoles();
      }
    } catch (error) {
      toast.error("Lỗi khi xóa vai trò");
    }
  };

  // 5. Thêm vai trò mới
  const handleAddRole = async () => {
    const name = prompt("Nhập tên vai trò mới:");
    if (!name) return;

    try {
      const res = await apiClient.post('/roles', {
        name,
        permissions: [],
        description: "Vai trò mới được tạo"
      });
      if (res.data.success) {
        toast.success("Đã thêm vai trò mới");
        fetchRoles();
      }
    } catch (error) {
      toast.error("Vai trò đã tồn tại hoặc lỗi server");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* HEADER SECTION */}
      <header className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 md:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-500/20">
            <Shield className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Phân Quyền Hệ Thống</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Cấu hình nhóm vai trò (Roles) và chi tiết đặc quyền (Permissions) truy cập chức năng.</p>
          </div>
        </div>
        <button 
          onClick={handleAddRole}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer text-sm shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          Tạo vai trò mới
        </button>
      </header>

      {/* MAIN CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ROLES LIST */}
        <div className="lg:col-span-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm nhanh vai trò..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs text-sm font-medium text-slate-700 dark:text-slate-200 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
              style={{ paddingLeft: '2.6rem' }}
            />
          </div>

          <div className="space-y-3">
            {loading && roles.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-teal-500 w-8 h-8" />
                <span className="text-slate-400 text-xs mt-3 font-medium">Đang tải danh sách vai trò...</span>
              </div>
            ) : (
              roles.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase())).map((role) => {
                const isActive = selectedRole?._id === role._id;
                return (
                  <button
                    key={role._id}
                    onClick={() => setSelectedRole(role)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border transition-all duration-200 group relative flex flex-col cursor-pointer",
                      isActive
                        ? 'bg-gradient-to-r from-teal-50/50 to-teal-50/5 dark:from-teal-950/40 dark:to-teal-950/10 border-teal-500 shadow-sm ring-1 ring-teal-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 w-full mb-2">
                      <div className={cn(
                        "p-2.5 rounded-xl transition-colors shrink-0",
                        isActive ? "bg-teal-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/40 group-hover:text-teal-600"
                      )}>
                        <ShieldCheck className="w-5 h-5 shrink-0" />
                      </div>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors shrink-0",
                        isActive 
                          ? "bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 group-hover:bg-teal-50 dark:group-hover:bg-teal-950/40 group-hover:text-teal-700 group-hover:border-teal-200"
                      )}>
                        <Users className="w-3.5 h-3.5 shrink-0 text-current" />
                        <span>{role.userCount || 0} nhân sự</span>
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base tracking-tight">{role.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed font-medium">
                      {role.description || "Chưa có mô tả chi tiết cho vai trò này."}
                    </p>
                    
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500 rounded-l-2xl" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: PERMISSIONS EDITOR */}
        <div className="lg:col-span-8">
          {selectedRole ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col">
              {/* SELECTED ROLE BANNER */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-teal-600 text-white rounded-xl shadow-sm shadow-teal-500/10">
                    <UserCog className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-slate-950 dark:text-white text-lg">{selectedRole.name}</h2>
                      {selectedRole.isSystem ? (
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">Hệ Thống</span>
                      ) : (
                        <span className="text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-2 py-0.5 rounded-full">Tự Định Nghĩa</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium uppercase tracking-wider">Cấu hình phân quyền hệ thống</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-[0.98] disabled:bg-slate-300 dark:disabled:bg-slate-800 uppercase tracking-widest flex items-center gap-2 cursor-pointer"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Lưu cấu hình
                  </button>
                </div>
              </div>

              {/* PERMISSION CHECKBOXES AREA */}
              <div className="p-6 space-y-8">
                {selectedRole.permissions.includes('all') ? (
                  <div className="p-10 text-center space-y-4 bg-gradient-to-br from-teal-50/70 via-slate-50 to-blue-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-teal-950 text-slate-900 dark:text-white rounded-2xl border border-teal-100 dark:border-slate-700 shadow-sm">
                    <div className="w-16 h-16 bg-teal-500/15 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mx-auto border border-teal-500/30">
                      <ShieldCheck className="w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Quyền Hạn Tối Cao (ALL)</h3>
                      <p className="text-slate-600 dark:text-slate-300 text-sm max-w-md mx-auto leading-relaxed">
                        Vai trò <b className="text-slate-900 dark:text-white">{selectedRole.name}</b> đã được thiết lập quyền quản trị hệ thống đầy đủ. 
                        Không cần cấu hình thủ công vì vai trò này tự động sở hữu mọi đặc quyền.
                      </p>
                    </div>
                  </div>
                ) : (
                  PERMISSION_GROUPS.map((group) => {
                    const allSelected = isGroupAllSelected(group.permissions);
                    return (
                      <div key={group.title} className="space-y-4">
                        {/* Group Header Banner */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 px-1">
                          <div className="flex items-center gap-2">
                            <div className="h-3.5 w-1 bg-teal-500 rounded-full" />
                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{group.title}</h3>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => handleToggleGroupPermissions(group.permissions.map(p => p.id), !allSelected)}
                            className={cn(
                              "text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer active:scale-95",
                              allSelected
                                ? "bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-100/50"
                                : "bg-teal-50/50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100/50"
                            )}
                          >
                            {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                          </button>
                        </div>

                        {/* Permission Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {group.permissions.map((perm) => {
                            const isChecked = selectedRole.permissions.includes(perm.id);
                            return (
                              <div
                                key={perm.id}
                                onClick={() => handleTogglePermission(perm.id)}
                                className={cn(
                                  "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 group select-none",
                                  isChecked 
                                    ? 'bg-teal-50/30 dark:bg-teal-950/30 border-teal-500 shadow-sm ring-1 ring-teal-500/10' 
                                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-50/55 dark:hover:bg-slate-800/40'
                                )}
                              >
                                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                  {/* Custom Checkbox */}
                                  <div className={cn(
                                    "w-5 h-5 rounded-md border flex items-center justify-center transition-all shrink-0",
                                    isChecked 
                                      ? "bg-teal-600 border-teal-600 text-white shadow-sm scale-105" 
                                      : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 group-hover:border-teal-400"
                                  )}>
                                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                                  </div>
                                  
                                  {/* Title & ID */}
                                  <div className="flex flex-col min-w-0">
                                    <span className={cn(
                                      "text-sm font-semibold transition-colors truncate",
                                      isChecked ? 'text-teal-950 dark:text-teal-200 font-bold' : 'text-slate-700 dark:text-slate-200'
                                    )}>
                                      {perm.name}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-medium block mt-0.5">
                                      {perm.id}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  {perm.id === PERMISSIONS.SYLLABUS.MANAGE && (
                                    <span className="text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-250/80 dark:border-amber-900/50 px-1.5 py-0.5 rounded uppercase tracking-wider scale-90">
                                      Chỉ Admin
                                    </span>
                                  )}
                                  <Info className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 transition-colors" />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* DANGER ZONE */}
                {(!selectedRole.isSystem && selectedRole.name?.toLowerCase() !== 'admin') && (
                  <div className="pt-6 border-t border-slate-200 dark:border-slate-800 mt-8">
                    <div className="p-5 bg-rose-50/30 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/40 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex gap-3">
                        <div className="p-2.5 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl shrink-0 mt-0.5 md:mt-0">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-rose-950 dark:text-rose-200 leading-tight">Xóa vai trò "{selectedRole.name}"</p>
                          <p className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1">Lưu ý: Hành động này không thể hoàn tác. Tất cả nhân sự thuộc nhóm này sẽ bị thu hồi quyền truy cập tương ứng.</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleDeleteRole}
                        className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl hover:shadow-md transition-all active:scale-[0.98] uppercase tracking-widest cursor-pointer whitespace-nowrap"
                      >
                        Xóa vĩnh viễn
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-24 text-center flex flex-col items-center justify-center space-y-4">
               <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 text-slate-300 dark:text-slate-600 rounded-full flex items-center justify-center border border-slate-200/50 dark:border-slate-700">
                 <Shield className="w-8 h-8 opacity-40" />
               </div>
               <div>
                 <p className="font-bold text-sm text-slate-800 dark:text-white">Không có vai trò nào được chọn</p>
                 <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs leading-relaxed">Vui lòng bấm chọn một vai trò ở danh sách bên trái để bắt đầu thiết lập quyền truy cập.</p>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
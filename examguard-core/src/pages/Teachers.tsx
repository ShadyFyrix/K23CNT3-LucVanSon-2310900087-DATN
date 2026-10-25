import React, { useState, useEffect, useCallback } from 'react';
import {
  UserSquare2, Star, Calendar, Clock, Search, Plus,
  MoreHorizontal, Mail, Phone, Trash2, Edit2, Loader2, Award, Briefcase, Globe, ShieldCheck, ScanFace, CheckCircle, AlertCircle,
  KeyRound, Sparkles
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { TeacherForm } from '../components/forms/TeacherForm';
import { UserForm } from '../components/forms/UserForm';
import { FaceRegistrationModal } from '../components/FaceRegistrationModal';
import { apiClient } from '../api/apiClient';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import TeacherPortalPage from './teacher/TeacherPortalPage';

export default function Teachers() {
  const { hasRole } = useAuth();

  // Nếu là giảng viên đăng nhập, hiển thị Cổng Giảng Viên / Bàn làm việc cá nhân
  if (hasRole('teacher') && !hasRole('admin')) {
    return <TeacherPortalPage />;
  }

  const [teachers, setTeachers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [selectedTeacherForFace, setSelectedTeacherForFace] = useState<any>(null);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [selectedForUser, setSelectedForUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await apiClient.get('/roles');
      if (res.data.success) setRoles(res.data.data);
    } catch (error) { console.error("Lỗi tải vai trò:", error); }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/teachers?search=${searchTerm}`);
      if (res.data.success) {
        setTeachers(res.data.data);
      }
    } catch (error) {
      toast.error("Lỗi tải danh sách giảng viên");
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchTeachers();
    fetchRoles();
  }, [fetchTeachers, fetchRoles]);

  const handleSaveTeacher = async (data: any) => {
    try {
      const isEdit = !!editingTeacher;
      const url = isEdit ? `/teachers/${editingTeacher._id}` : '/teachers';
      const res = isEdit ? await apiClient.put(url, data) : await apiClient.post(url, data);

      if (res.data.success) {
        toast.success(isEdit ? "Cập nhật thành công" : "Đã thêm giảng viên");
        setIsModalOpen(false);
        setEditingTeacher(null);
        fetchTeachers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Thao tác thất bại");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Xóa hồ sơ giảng viên này?")) return;
    try {
      const res = await apiClient.delete(`/teachers/${id}`);
      if (res.data.success) {
        toast.success("Đã xóa");
        fetchTeachers();
      }
    } catch (error) { toast.error("Lỗi xóa dữ liệu"); }
  };

  // Cấp tài khoản hàng loạt cho tất cả giảng viên
  const handleBulkCreateAccounts = async () => {
    if (!window.confirm("Hệ thống sẽ đồng bộ và cấp tài khoản coi thi với MẬT KHẨU MẶC ĐỊNH là 123456 cho toàn bộ giảng viên. Bạn có muốn thực hiện ngay?")) {
      return;
    }
    try {
      setBulkLoading(true);
      const res = await apiClient.post('/teachers/bulk-create-accounts');
      if (res.data?.success) {
        toast.success(res.data.message || "Đã cấp tài khoản coi thi thành công! Mật khẩu mặc định: 123456");
        fetchTeachers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi cấp tài khoản hàng loạt");
    } finally {
      setBulkLoading(false);
    }
  };

  // Đặt lại mật khẩu về mặc định 123456 cho giảng viên
  const handleResetPassword = async (teacher: any) => {
    if (!window.confirm(`Bạn có chắc muốn đặt lại mật khẩu coi thi của giảng viên "${teacher.fullName}" (${teacher.email}) về mặc định "123456"?`)) {
      return;
    }
    try {
      const res = await apiClient.put(`/teachers/${teacher._id}`, {
        password: '123456'
      });
      if (res.data?.success) {
        toast.success(`Đã đặt lại mật khẩu cho giảng viên ${teacher.fullName} thành "123456"!`);
        fetchTeachers();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi đặt lại mật khẩu");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Đội ngũ Giảng viên</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">
            Quản lý danh sách giảng viên, chuyên môn, hợp đồng đào tạo và định danh sinh trắc học Coi thi.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleBulkCreateAccounts}
            disabled={bulkLoading}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-lg shadow-indigo-600/20 text-xs uppercase tracking-wider cursor-pointer active:scale-95 disabled:opacity-50"
            title="Đồng bộ & cấp tài khoản coi thi (Pass: 123456) cho tất cả giảng viên"
          >
            <Sparkles className="w-4 h-4" />
            <span>{bulkLoading ? 'Đang cấp TK...' : '⚡ Cấp TK coi thi (Pass: 123456)'}</span>
          </button>

          <button
            onClick={() => { setEditingTeacher(null); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-lg shadow-blue-600/20 text-xs uppercase tracking-wider cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" /> Thêm giảng viên
          </button>
        </div>
      </header>

      <div className="bg-white dark:bg-slate-900/90 p-4 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 flex gap-4 backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã giảng viên hoặc chuyên môn..."
            className="w-full pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            style={{ paddingLeft: '2.6rem' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher) => (
            <div key={teacher._id} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden hover:shadow-xl dark:hover:border-slate-700 transition-all group relative flex flex-col justify-between">
              <div>
                {/* Header Card Banner */}
                <div className="h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 relative border-b border-blue-500/20 dark:border-slate-800/80">
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingTeacher(teacher); setIsModalOpen(true); }} className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-md transition-colors cursor-pointer" title="Chỉnh sửa"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(teacher._id)} className="p-2 bg-rose-500/80 hover:bg-rose-500 text-white rounded-xl backdrop-blur-md transition-colors cursor-pointer" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <div className="relative -mt-10 mb-4 flex justify-between items-end">
                    <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-800 p-1 shadow-xl border border-slate-200 dark:border-slate-700">
                      <div className="w-full h-full rounded-xl bg-blue-600 flex items-center justify-center text-white text-2xl font-black overflow-hidden shadow-inner">
                        {teacher.avatar ? (
                          <img src={teacher.avatar} alt={teacher.fullName} className="w-full h-full object-cover" />
                        ) : (
                          teacher.fullName.charAt(0)
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800/40">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{teacher.rating || '5.0'}</span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-3">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{teacher.fullName}</h3>
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{teacher.teacherCode || 'GV_COITHI'}</p>
                  </div>

                  {/* Chuyên môn Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4 min-h-[24px]">
                    {teacher.specialization?.map((s: string) => (
                      <span key={s} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 rounded-md text-[10px] font-bold uppercase">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-blue-500" /> Kinh nghiệm
                      </p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{teacher.experience || 0} năm</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800">
                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase mb-0.5 flex items-center gap-1">
                        <Award className="w-3 h-3 text-teal-500" /> Bằng cấp
                      </p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{teacher.degree || 'Thạc sĩ'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6 pt-0 space-y-3">
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2">
                    {teacher.phone && (
                      <a href={`tel:${teacher.phone}`} className="p-2 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50 rounded-xl hover:bg-teal-600 hover:text-white transition-all"><Phone className="w-3.5 h-3.5" /></a>
                    )}
                    {teacher.email && (
                      <a href={`mailto:${teacher.email}`} className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50 rounded-xl hover:bg-blue-600 hover:text-white transition-all"><Mail className="w-3.5 h-3.5" /></a>
                    )}
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border ${
                    teacher.status === 'active' 
                      ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/50' 
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50'
                  }`}>
                    {teacher.status === 'active' ? 'Sẵn sàng' : 'Nghỉ phép'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {teacher.isFaceKyc || teacher.userId?.isFaceRegistered || (Array.isArray(teacher.faceEmbedding) && teacher.faceEmbedding.length > 0) ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-1 rounded-xl border border-teal-200 dark:border-teal-800/50">
                      <CheckCircle className="w-3 h-3 text-teal-600 dark:text-teal-400" /> Đã KYC Coi thi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800/50">
                      <AlertCircle className="w-3 h-3 text-amber-500" /> Chưa KYC
                    </span>
                  )}

                  <button
                    onClick={() => {
                      setSelectedTeacherForFace({
                        _id: teacher._id,
                        fullName: teacher.fullName,
                        email: teacher.email,
                        department: teacher.department?.name || 'Giảng viên',
                        code: teacher.teacherCode
                      });
                      setIsFaceModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold rounded-xl transition shadow-sm cursor-pointer"
                  >
                    <ScanFace className="w-3 h-3" />
                    <span>{teacher.isFaceKyc || teacher.userId?.isFaceRegistered ? 'Đổi Face' : 'Đăng ký Face'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Pass: 123456</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleResetPassword(teacher)}
                      className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold rounded-xl transition-all cursor-pointer"
                      title="Đặt lại mật khẩu về mặc định 123456"
                    >
                      Reset MK
                    </button>
                    <button
                      onClick={() => {
                        setSelectedForUser({ fullName: teacher.fullName, email: teacher.email, department: 'training', role: roles.find(r => r.name.toLowerCase() === 'teacher')?._id });
                        setIsUserModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-500 rounded-xl transition-all cursor-pointer"
                      title="Phân quyền tài khoản User"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTeacher ? "Chỉnh sửa hồ sơ" : "Thêm giảng viên"}>
        <TeacherForm
          initialData={editingTeacher}
          onSubmit={handleSaveTeacher}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Kích hoạt tài khoản giảng viên">
        <UserForm
          initialData={selectedForUser}
          roles={roles}
          onSuccess={() => {
            setIsUserModalOpen(false);
            toast.success("Đã kích hoạt tài khoản hệ thống cho giảng viên");
            fetchTeachers();
            setTimeout(() => window.location.reload(), 1000);
          }}
          onCancel={() => setIsUserModalOpen(false)}
        />
      </Modal>

      {/* Modal Đăng ký Face ID Giảng viên */}
      {isFaceModalOpen && selectedTeacherForFace && (
        <FaceRegistrationModal
          isOpen={isFaceModalOpen}
          onClose={() => {
            setIsFaceModalOpen(false);
            setSelectedTeacherForFace(null);
          }}
          user={selectedTeacherForFace}
          onSuccess={() => {
            fetchTeachers();
            toast.success(`Đã cập nhật Face ID cho giảng viên ${selectedTeacherForFace.fullName}!`);
          }}
        />
      )}
    </div>
  );
}
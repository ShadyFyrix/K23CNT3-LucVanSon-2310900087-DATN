import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  UserSquare2, Star, Calendar, Clock, Search, Plus,
  MoreHorizontal, Mail, Phone, Trash2, Edit2, Loader2, Award, Briefcase, Globe, ShieldCheck, ScanFace, CheckCircle, AlertCircle,
  KeyRound, Sparkles, UserCheck
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto pb-16 font-sans select-none"
    >
      {/* ─── 1. BENTO HEADER STAGE ─── */}
      <motion.div
        variants={itemVariants}
        className="eg-hero-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full eg-glass-pill shadow-xs">
            <UserCheck className="w-3.5 h-3.5 text-[var(--color-azure)]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--color-azure)]">
              Hội Đồng Khảo Thí & Giám Thị
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Đội Ngũ <span className="eg-text-gradient">Giảng Viên & Giám Thị</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
            Quản lý hồ sơ giảng viên, phân công coi thi, cấp tài khoản bảo mật và đăng ký định danh Face ID ArcFace 512-D.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleBulkCreateAccounts}
            disabled={bulkLoading}
            className="eg-glass-pill px-4 py-2.5 flex items-center gap-2 text-xs font-bold cursor-pointer active:scale-95 disabled:opacity-50 shadow-md"
            title="Đồng bộ & cấp tài khoản coi thi (Pass: 123456) cho tất cả giảng viên"
          >
            <Sparkles className="w-4 h-4 text-[var(--color-azure)]" />
            <span>{bulkLoading ? 'Đang cấp TK...' : '⚡ Cấp TK coi thi (Pass: 123456)'}</span>
          </button>

          <button
            onClick={() => { setEditingTeacher(null); setIsModalOpen(true); }}
            className="eg-btn-gradient px-5 py-2.5 flex items-center gap-2 text-xs font-bold cursor-pointer active:scale-95 shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Thêm giảng viên</span>
          </button>
        </div>
      </motion.div>

      {/* ─── 2. SEARCH & FILTER TOOLBAR ─── */}
      <motion.div
        variants={itemVariants}
        className="bg-white/95 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-lg flex gap-4 items-center"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên, mã giảng viên hoặc chuyên môn..."
            className="w-full pr-4 py-2 bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-[var(--color-azure)] transition-all"
            style={{ paddingLeft: '2.6rem' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 px-2 shrink-0">
          {teachers.length} Giảng viên
        </span>
      </motion.div>

      {/* ─── 3. TEACHER BENTO CARDS GRID ─── */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[var(--color-azure)]" /></div>
      ) : (
        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher) => (
            <motion.div
              key={teacher._id}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="eg-cyber-card overflow-hidden group relative flex flex-col justify-between"
            >
              <div>
                {/* Header Card Banner */}
                <div className="h-20 bg-gradient-to-r from-blue-600/30 via-indigo-600/20 to-purple-600/30 dark:from-blue-900/30 dark:via-purple-900/20 dark:to-slate-900/40 relative border-b border-slate-200/60 dark:border-white/10">
                  <div className="absolute top-3 right-3 flex gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditingTeacher(teacher); setIsModalOpen(true); }}
                      className="p-1.5 bg-white/80 dark:bg-black/40 hover:bg-white dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 rounded-xl backdrop-blur-md transition-colors cursor-pointer border border-slate-200/50 dark:border-white/10"
                      title="Chỉnh sửa"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(teacher._id)}
                      className="p-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-600 hover:text-white rounded-xl backdrop-blur-md transition-colors cursor-pointer border border-rose-500/30"
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="px-6 pb-4">
                  <div className="relative -mt-10 mb-4 flex justify-between items-end">
                    <div className="w-18 h-18 rounded-2xl bg-white dark:bg-[#0B0C1E] p-1 shadow-xl border border-slate-200 dark:border-white/15">
                      <div className="w-full h-full rounded-xl bg-gradient-to-tr from-[#0b2cb1] to-[#1951fc] flex items-center justify-center text-white text-xl font-black overflow-hidden shadow-inner">
                        {teacher.avatar ? (
                          <img src={teacher.avatar} alt={teacher.fullName} className="w-full h-full object-cover" />
                        ) : (
                          teacher.fullName.charAt(0)
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{teacher.rating || '5.0'}</span>
                    </div>
                  </div>

                  <div className="space-y-1 mb-3">
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight group-hover:text-[var(--color-azure)] transition-colors line-clamp-1">
                      {teacher.fullName}
                    </h3>
                    <p className="text-[11px] font-mono font-bold text-[var(--color-azure)] uppercase tracking-wider">
                      {teacher.teacherCode || 'GV_COITHI'}
                    </p>
                  </div>

                  {/* Chuyên môn Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4 min-h-[24px]">
                    {teacher.specialization?.map((s: string) => (
                      <span key={s} className="px-2 py-0.5 bg-slate-100/90 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 rounded-full text-[10px] font-bold">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-50 dark:bg-white/[0.03] p-2.5 rounded-2xl border border-slate-200/70 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-0.5 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-[var(--color-azure)]" /> Kinh nghiệm
                      </p>
                      <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{teacher.experience || 0} năm</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-white/[0.03] p-2.5 rounded-2xl border border-slate-200/70 dark:border-white/5">
                      <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-0.5 flex items-center gap-1">
                        <Award className="w-3 h-3 text-emerald-500" /> Bằng cấp
                      </p>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{teacher.degree || 'Thạc sĩ'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-5 pt-0 space-y-3">
                <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    {teacher.phone && (
                      <a href={`tel:${teacher.phone}`} className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"><Phone className="w-3.5 h-3.5" /></a>
                    )}
                    {teacher.email && (
                      <a href={`mailto:${teacher.email}`} className="p-2 bg-[var(--color-electric)]/10 text-[var(--color-azure)] border border-[var(--color-azure)]/20 rounded-xl hover:bg-[var(--color-electric)] hover:text-white transition-all"><Mail className="w-3.5 h-3.5" /></a>
                    )}
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase border ${
                    teacher.status === 'active' 
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' 
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                  }`}>
                    {teacher.status === 'active' ? 'Sẵn sàng coi thi' : 'Nghỉ phép'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {teacher.isFaceKyc || teacher.userId?.isFaceRegistered || (Array.isArray(teacher.faceEmbedding) && teacher.faceEmbedding.length > 0) ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                      <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Đã KYC Coi thi
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30">
                      <AlertCircle className="w-3 h-3 text-amber-500" /> Chưa KYC Face
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
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-full transition shadow-sm cursor-pointer"
                  >
                    <ScanFace className="w-3 h-3" />
                    <span>{teacher.isFaceKyc || teacher.userId?.isFaceRegistered ? 'Đổi Face' : 'Đăng ký Face'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/10 gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Pass: 123456</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleResetPassword(teacher)}
                      className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 text-[11px] font-bold rounded-full transition-all cursor-pointer"
                      title="Đặt lại mật khẩu về mặc định 123456"
                    >
                      Reset MK
                    </button>
                    <button
                      onClick={() => {
                        setSelectedForUser({ fullName: teacher.fullName, email: teacher.email, department: 'training', role: roles.find(r => r.name.toLowerCase() === 'teacher')?._id });
                        setIsUserModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-100 dark:bg-white/5 hover:bg-[#1951fc] hover:text-white text-slate-500 dark:text-slate-400 rounded-full transition-all cursor-pointer border border-slate-200/50 dark:border-white/10"
                      title="Phân quyền tài khoản User"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
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
    </motion.div>
  );
}
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Search,
  Phone,
  Mail,
  Edit2,
  Trash2,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  LayoutGrid,
  List as ListIcon,
  Download,
  Building2,
  GraduationCap,
  ScanFace,
  KeyRound,
  Sparkles,
  Users
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { StudentForm } from '../components/forms/StudentForm';
import { UserForm } from '../components/forms/UserForm';
import { FaceRegistrationModal } from '../components/FaceRegistrationModal';
import { apiClient } from '../api/apiClient';
import { toast } from 'react-hot-toast';
import { exportStudentsToExcel, exportStudentsToCSV } from '../utils/studentExport';
import { useAuth } from '../context/AuthContext';
import StudentPortalPage from './student/StudentPortalPage';

// Mapping trạng thái sinh viên
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: 'Đang theo học', color: 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/50' },
  graduated: { label: 'Đã tốt nghiệp', color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/40' },
  suspended: { label: 'Tạm hoãn / Đình chỉ', color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50' },
};

export default function Students() {
  const { hasRole } = useAuth();

  // Nếu là sinh viên đăng nhập, hiển thị Cổng Sinh Viên cá nhân
  if (hasRole('student') && !hasRole('admin')) {
    return <StudentPortalPage />;
  }

  const [students, setStudents] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [selectedForUser, setSelectedForUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Trạng thái Face KYC Modal
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [selectedStudentForFace, setSelectedStudentForFace] = useState<any>(null);

  // Trạng thái xuất danh sách sinh viên
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('all');
  const [exportFormat, setExportFormat] = useState<'xlsx' | 'csv'>('xlsx');
  const [exporting, setExporting] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await apiClient.get('/roles');
      if (res.data.success) setRoles(res.data.data);
    } catch (error) {
      console.error("Lỗi tải vai trò:", error);
    }
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await apiClient.get('/departments');
      if (res.data.success) setDepartments(res.data.data || []);
    } catch (error) {
      console.error("Lỗi tải khoa:", error);
    }
  }, []);

  // Lấy danh sách sinh viên
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      if (selectedDeptFilter !== 'all') params.append('department', selectedDeptFilter);
      if (selectedStatusFilter !== 'all') params.append('status', selectedStatusFilter);

      const res = await apiClient.get(`/students?${params.toString()}`);
      if (res.data.success) {
        setStudents(res.data.data || []);
      }
    } catch (error: any) {
      toast.error("Không thể tải danh sách sinh viên");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedDeptFilter, selectedStatusFilter]);

  useEffect(() => {
    fetchStudents();
    fetchRoles();
    fetchDepartments();
  }, [fetchStudents, fetchRoles, fetchDepartments]);

  // Bộ lọc danh sách sinh viên trên client
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      if (selectedStatusFilter !== 'all' && student.status !== selectedStatusFilter) {
        return false;
      }
      if (selectedDeptFilter !== 'all') {
        const dId = student.department?._id || student.department;
        if (dId !== selectedDeptFilter) return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = student.fullName?.toLowerCase().includes(q);
        const matchCode = student.studentCode?.toLowerCase().includes(q);
        const matchPhone = student.phone?.toLowerCase().includes(q);
        const matchEmail = student.email?.toLowerCase().includes(q);
        const matchClass = student.class?.name?.toLowerCase().includes(q) || student.class?.code?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPhone && !matchEmail && !matchClass) {
          return false;
        }
      }
      return true;
    });
  }, [students, selectedDeptFilter, selectedStatusFilter, searchTerm]);

  // Thêm hoặc cập nhật sinh viên
  const handleSaveStudent = async (data: any) => {
    try {
      const isEdit = !!editingStudent;
      const res = isEdit
        ? await apiClient.put(`/students/${editingStudent._id}`, data)
        : await apiClient.post('/students', data);

      if (res.data.success) {
        toast.success(isEdit ? "Cập nhật sinh viên thành công" : "Thêm sinh viên thành công");
        setIsModalOpen(false);
        setEditingStudent(null);
        fetchStudents();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Thao tác thất bại");
    }
  };

  // Xóa sinh viên
  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa hồ sơ sinh viên này?")) return;
    try {
      const res = await apiClient.delete(`/students/${id}`);
      if (res.data.success) {
        toast.success("Đã xóa sinh viên");
        fetchStudents();
      }
    } catch (error) {
      toast.error("Lỗi khi xóa dữ liệu");
    }
  };

  // Cấp tài khoản hàng loạt cho tất cả sinh viên
  const handleBulkCreateAccounts = async () => {
    if (!window.confirm("Hệ thống sẽ đồng bộ và cấp tài khoản dự thi với MẬT KHẨU MẶC ĐỊNH là 123456 cho toàn bộ thí sinh. Bạn có muốn thực hiện ngay?")) {
      return;
    }
    try {
      setBulkLoading(true);
      const res = await apiClient.post('/students/bulk-create-accounts');
      if (res.data?.success) {
        toast.success(res.data.message || "Đã cấp tài khoản thành công! Mật khẩu mặc định: 123456");
        fetchStudents();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi cấp tài khoản hàng loạt");
    } finally {
      setBulkLoading(false);
    }
  };

  // Đặt lại mật khẩu về mặc định 123456 cho sinh viên
  const handleResetPassword = async (student: any) => {
    if (!window.confirm(`Bạn có chắc muốn đặt lại mật khẩu của sinh viên "${student.fullName}" (${student.email}) về mặc định "123456"?`)) {
      return;
    }
    try {
      const res = await apiClient.put(`/students/${student._id}`, {
        password: '123456'
      });
      if (res.data?.success) {
        toast.success(`Đã đặt lại mật khẩu cho ${student.fullName} thành "123456"!`);
        fetchStudents();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Lỗi khi đặt lại mật khẩu");
    }
  };

  const handleDownload = async () => {
    try {
      setExporting(true);
      let targetList: any[] = [];
      if (exportScope === 'filtered') {
        targetList = filteredStudents;
      } else {
        const res = await apiClient.get('/students?limit=all');
        if (res.data?.success && Array.isArray(res.data.data)) {
          targetList = res.data.data;
        } else {
          targetList = students;
        }
      }

      if (targetList.length === 0) {
        toast.error("Không có dữ liệu sinh viên để xuất");
        return;
      }

      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `Danh_Sach_Sinh_Vien_ExamGuard_${dateStr}`;

      if (exportFormat === 'xlsx') {
        exportStudentsToExcel(targetList, filename);
      } else {
        exportStudentsToCSV(targetList, filename);
      }

      toast.success(`Đã xuất ${targetList.length} sinh viên thành công!`);
      setIsExportModalOpen(false);
    } catch (err: any) {
      console.error("Lỗi xuất file:", err);
      toast.error("Lỗi khi tạo file xuất dữ liệu");
    } finally {
      setExporting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.03 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-7xl mx-auto pb-16 font-sans select-none"
    >
      {/* ─── 1. BENTO HERO HEADER STAGE ─── */}
      <motion.div
        variants={itemVariants}
        className="eg-hero-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full eg-glass-pill shadow-xs">
            <Users className="w-3.5 h-3.5 text-[var(--color-azure)]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--color-azure)]">
              Hệ Thống Thí Sinh & Face KYC
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Quản Lý <span className="eg-text-gradient">Sinh Viên & Thí Sinh</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
            Quản lý hồ sơ thí sinh toàn trường, định danh sinh trắc học Face KYC 5 góc ArcFace và cấp phát tài khoản thi trực tuyến.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={handleBulkCreateAccounts}
            disabled={bulkLoading}
            className="eg-glass-pill px-4 py-2.5 flex items-center gap-2 text-xs font-bold cursor-pointer active:scale-95 disabled:opacity-50 shadow-md"
            title="Đồng bộ & cấp tài khoản thi (Pass: 123456) cho tất cả sinh viên"
          >
            <Sparkles className="w-4 h-4 text-[var(--color-azure)]" />
            <span>{bulkLoading ? 'Đang cấp TK...' : '⚡ Cấp TK hàng loạt (Pass: 123456)'}</span>
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="eg-glass-pill px-4 py-2.5 flex items-center gap-2 text-xs font-bold cursor-pointer active:scale-95 shadow-md"
          >
            <Download className="w-4 h-4 text-[var(--color-azure)]" />
            <span>Xuất Excel / CSV</span>
          </button>

          <button
            onClick={() => { setEditingStudent(null); setIsModalOpen(true); }}
            className="eg-btn-gradient px-5 py-2.5 flex items-center gap-2 text-xs font-bold cursor-pointer active:scale-95 shadow-md"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Thêm sinh viên</span>
          </button>
        </div>
      </motion.div>

      {/* ─── 2. SEARCH & FILTER TOOLBAR ─── */}
      <motion.div
        variants={itemVariants}
        className="bg-white/95 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-lg flex flex-col md:flex-row gap-4 justify-between items-center"
      >
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo MSSV, tên, email, lớp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-4 py-2 bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[var(--color-azure)] transition-all"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>

          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="px-4 py-2 bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:border-[var(--color-azure)] transition-all cursor-pointer"
          >
            <option value="all">Tất cả Khoa / Viện</option>
            {departments.map(d => (
              <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:border-[var(--color-azure)] transition-all cursor-pointer"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang theo học</option>
            <option value="graduated">Đã tốt nghiệp</option>
            <option value="suspended">Tạm hoãn / Đình chỉ</option>
          </select>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-full border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white dark:bg-[var(--color-electric)] shadow-sm text-[var(--color-royal)] dark:text-white font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              title="Xem dạng lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-full transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white dark:bg-[var(--color-electric)] shadow-sm text-[var(--color-royal)] dark:text-white font-bold' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              title="Xem dạng danh sách"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 px-2">
            {filteredStudents.length} thí sinh
          </span>
        </div>
      </motion.div>

      {/* ─── 3. CONTENT DISPLAY (GRID OR LIST) ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1951fc]"></div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="eg-cyber-card p-12 text-center">
          <GraduationCap className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Chưa có sinh viên nào</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Không tìm thấy hồ sơ sinh viên phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => {
            const isKyc = student.isFaceKyc || student.userId?.isFaceRegistered;
            return (
              <motion.div
                key={student._id}
                variants={itemVariants}
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="eg-cyber-card overflow-hidden group flex flex-col justify-between"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-[#0b2cb1] to-[#1951fc] flex items-center justify-center text-white font-black text-lg mr-3 shadow-md shadow-blue-600/20 shrink-0 border border-white/20">
                        {student.avatar ? (
                          <img src={student.avatar} alt="avatar" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          student.fullName?.charAt(0) || 'S'
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight group-hover:text-[var(--color-azure)] transition-colors line-clamp-1">
                          {student.fullName}
                        </h3>
                        <p className="text-xs font-mono font-bold text-[var(--color-azure)] mt-1">
                          MSSV: {student.studentCode || '---'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingStudent(student); setIsModalOpen(true); }}
                        className="p-1.5 text-[var(--color-azure)] hover:bg-[var(--color-electric)]/15 rounded-lg cursor-pointer transition-colors"
                        title="Sửa hồ sơ"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student._id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                        title="Xóa hồ sơ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${STATUS_MAP[student.status]?.color || 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300'}`}>
                        {STATUS_MAP[student.status]?.label || student.status}
                      </span>
                      {isKyc ? (
                        <button
                          onClick={() => {
                            setSelectedStudentForFace({
                              _id: student._id,
                              fullName: student.fullName,
                              email: student.email,
                              department: student.class?.name || 'Sinh viên',
                              studentCode: student.studentCode
                            });
                            setIsFaceModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30 transition-all cursor-pointer"
                          title="Bấm để xem hoặc cập nhật lại khuôn mặt"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Đã KYC Face
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedStudentForFace({
                              _id: student._id,
                              fullName: student.fullName,
                              email: student.email,
                              department: student.class?.name || 'Sinh viên',
                              studentCode: student.studentCode
                            });
                            setIsFaceModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-azure)] bg-[var(--color-electric)]/15 hover:bg-[var(--color-electric)]/25 px-2.5 py-1 rounded-full border border-[var(--color-azure)]/30 transition-all cursor-pointer"
                          title="Bấm để quét webcam 5 góc khuôn mặt chuẩn KYC"
                        >
                          <ScanFace className="w-3.5 h-3.5 text-[var(--color-azure)]" /> Đăng ký Face ID
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{student.department?.name || 'Chưa gán khoa'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                        <span>Lớp: {student.class?.name || student.class?.code || 'Chưa phân lớp'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{student.email || 'Chưa có email'}</span>
                      </div>
                      {student.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{student.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3 bg-slate-50/70 dark:bg-white/[0.02] border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    <KeyRound className="w-3 h-3 text-indigo-500" />
                    <span>Pass: 123456</span>
                  </div>
                  <button
                    onClick={() => handleResetPassword(student)}
                    className="px-2.5 py-1 bg-indigo-500/10 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 text-[11px] font-bold rounded-full transition-all cursor-pointer"
                    title="Đặt lại mật khẩu về mặc định 123456"
                  >
                    Reset MK
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="eg-cyber-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/10">
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 text-center w-12">STT</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Sinh viên</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Lớp & Khoa</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Định danh Face AI</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Trạng thái</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-white/[0.06] text-sm">
                {filteredStudents.map((student, index) => {
                  const isKyc = student.isFaceKyc || student.userId?.isFaceRegistered;
                  return (
                    <tr key={student._id} className="hover:bg-blue-50/50 dark:hover:bg-white/[0.04] transition-colors group">
                      <td className="px-4 py-3.5 text-center text-xs font-bold text-slate-500 dark:text-slate-400">{index + 1}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0b2cb1] to-[#1951fc] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                            {student.avatar ? (
                              <img src={student.avatar} alt="avatar" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              student.fullName?.charAt(0) || 'S'
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-[#3781fc] transition-colors flex items-center gap-2">
                              {student.fullName}
                              {student.studentCode && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-blue-500/10 text-blue-700 dark:text-[#cbe9fd] rounded border border-blue-500/20">
                                  {student.studentCode}
                                </span>
                              )}
                            </p>
                            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {student.email && <span>{student.email}</span>}
                              {student.phone && <span>{student.phone}</span>}
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20" title="Mật khẩu tài khoản đăng nhập mặc định là 123456">
                                <KeyRound className="w-2.5 h-2.5 text-indigo-500" /> Pass: 123456
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="text-xs">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{student.class?.name || student.class?.code || 'Chưa phân lớp'}</p>
                          <p className="text-slate-500 dark:text-slate-400">{student.department?.name || '---'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        {isKyc ? (
                          <button
                            onClick={() => {
                              setSelectedStudentForFace({
                                _id: student._id,
                                fullName: student.fullName,
                                email: student.email,
                                department: student.class?.name || 'Sinh viên',
                                studentCode: student.studentCode
                              });
                              setIsFaceModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30 transition-all cursor-pointer"
                            title="Bấm để xem hoặc cập nhật lại khuôn mặt"
                          >
                            <ScanFace className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Đã KYC Face
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedStudentForFace({
                                _id: student._id,
                                fullName: student.fullName,
                                email: student.email,
                                department: student.class?.name || 'Sinh viên',
                                studentCode: student.studentCode
                              });
                              setIsFaceModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-[#cbe9fd] bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded-full border border-blue-500/30 transition-all cursor-pointer"
                            title="Bật webcam quét 5 góc khuôn mặt chuẩn KYC"
                          >
                            <ScanFace className="w-3.5 h-3.5 text-blue-600 dark:text-[#3781fc]" /> Đăng ký Face ID
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${STATUS_MAP[student.status]?.color || 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'}`}>
                          {STATUS_MAP[student.status]?.label || student.status}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <div className="flex gap-1 justify-end items-center">
                          <button
                            onClick={() => {
                              setSelectedStudentForFace({
                                _id: student._id,
                                fullName: student.fullName,
                                email: student.email,
                                department: student.class?.name || 'Sinh viên',
                                studentCode: student.studentCode
                              });
                              setIsFaceModalOpen(true);
                            }}
                            className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Quét & Đăng ký Face ID (KYC)"
                          >
                            <ScanFace className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(student)}
                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                            title="Đặt lại mật khẩu về mặc định 123456"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedForUser({
                                fullName: student.fullName,
                                email: student.email,
                                department: 'student',
                                role: roles.find(r => r.name.toLowerCase() === 'student')?._id,
                                _studentId: student._id
                              });
                              setIsUserModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-[#3781fc] hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                            title="Phân quyền & Kiểm tra tài khoản User"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingStudent(student); setIsModalOpen(true); }}
                            className="p-1.5 text-blue-600 dark:text-[#3781fc] hover:bg-blue-50 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                            title="Sửa hồ sơ"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(student._id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                            title="Xóa hồ sơ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Modal Thêm/Sửa Sinh viên */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingStudent(null); }}
        title={editingStudent ? "Chỉnh sửa hồ sơ sinh viên" : "Thêm sinh viên mới"}
      >
        <StudentForm
          initialData={editingStudent}
          onSubmit={handleSaveStudent}
          onCancel={() => { setIsModalOpen(false); setEditingStudent(null); }}
        />
      </Modal>

      {/* Modal Kích hoạt User */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title="Kích hoạt tài khoản người dùng"
      >
        <UserForm
          initialData={selectedForUser}
          roles={roles}
          onSuccess={async (payload) => {
            if (selectedForUser?._studentId && payload?.email && !selectedForUser.email) {
              try {
                await apiClient.put(`/students/${selectedForUser._studentId}`, { email: payload.email });
              } catch (e) {
                console.error("Lỗi khi đồng bộ email về Student", e);
              }
            }
            setIsUserModalOpen(false);
            toast.success("Đã kích hoạt tài khoản hệ thống cho sinh viên");
            fetchStudents();
          }}
          onCancel={() => setIsUserModalOpen(false)}
        />
      </Modal>

      {/* Modal Xuất dữ liệu */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Xuất danh sách sinh viên"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Phạm vi xuất</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${exportScope === 'all' ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold shadow-2xs' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <p className="text-xs font-black">Tất cả sinh viên</p>
                <p className="text-[11px] opacity-75 mt-0.5">{students.length} bản ghi</p>
              </button>
              <button
                type="button"
                onClick={() => setExportScope('filtered')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${exportScope === 'filtered' ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 font-bold shadow-2xs' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <p className="text-xs font-black">Theo bộ lọc</p>
                <p className="text-[11px] opacity-75 mt-0.5">{filteredStudents.length} bản ghi</p>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Định dạng tệp tin</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('xlsx')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${exportFormat === 'xlsx' ? 'border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold shadow-2xs' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <p className="text-xs font-black">Excel (.xlsx)</p>
                <p className="text-[11px] opacity-75 mt-0.5">Định dạng bảng tính chuẩn</p>
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${exportFormat === 'csv' ? 'border-teal-600 bg-teal-50/60 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 font-bold shadow-2xs' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <p className="text-xs font-black">CSV (.csv)</p>
                <p className="text-[11px] opacity-75 mt-0.5">Dữ liệu phân tách bằng phẩy</p>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(false)}
              className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={handleDownload}
              className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider eg-btn-gradient text-white rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4" />
              {exporting ? 'Đang xuất file...' : 'Tải về máy'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Đăng Ký Khuôn Mặt KYC */}
      {isFaceModalOpen && selectedStudentForFace && (
        <FaceRegistrationModal
          isOpen={isFaceModalOpen}
          onClose={() => {
            setIsFaceModalOpen(false);
            setSelectedStudentForFace(null);
          }}
          user={selectedStudentForFace}
          onSuccess={() => {
            fetchStudents();
            toast.success(`Đã cập nhật khuôn mặt Face ID cho sinh viên ${selectedStudentForFace.fullName}!`);
          }}
        />
      )}
    </motion.div>
  );
}

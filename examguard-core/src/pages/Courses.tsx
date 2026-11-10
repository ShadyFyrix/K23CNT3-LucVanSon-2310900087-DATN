import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  Plus, Search, BookOpen, Clock,
  Edit2, Trash2, Loader2, Award, CheckCircle, BookMarked
} from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { Modal } from '../components/Modal';
import { CourseForm } from '../components/forms/CourseForm';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function Courses() {
  const { can } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);

  const canManageCourses = can('courses.manage');

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/courses?search=${searchTerm}`);
      if (res.data.success) {
        setCourses(res.data.data);
      }
    } catch (error) {
      toast.error("Lỗi tải danh mục học phần");
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Xác nhận xóa học phần "${name || 'này'}"?`)) return;
    try {
      const res = await apiClient.delete(`/courses/${id}`);
      if (res.data.success) {
        toast.success("Đã xóa học phần");
        fetchCourses();
      }
    } catch (err) {
      toast.error("Không thể xóa học phần");
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
      {/* ─── 1. BENTO HERO HEADER STAGE ─── */}
      <motion.div
        variants={itemVariants}
        className="eg-hero-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full eg-glass-pill shadow-xs">
            <BookMarked className="w-3.5 h-3.5 text-[var(--color-azure)]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--color-azure)]">
              Chương Trình Đào Tạo & Khảo Thí
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Học Phần & <span className="eg-text-gradient">Môn Thi</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
            Quản lý chương trình đào tạo, học phần tín chỉ, khoa phụ trách và liên kết ma trận ngân hàng câu hỏi.
          </p>
        </div>

        {canManageCourses && (
          <button
            onClick={() => { setEditingCourse(null); setIsModalOpen(true); }}
            className="eg-btn-gradient px-5 py-2.5 flex items-center gap-2 text-xs font-bold cursor-pointer active:scale-95 shadow-md shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Thêm học phần mới</span>
          </button>
        )}
      </motion.div>

      {/* ─── 2. SEARCH TOOLBAR ─── */}
      <motion.div
        variants={itemVariants}
        className="bg-white/95 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-lg flex gap-4 items-center"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên học phần hoặc mã môn học (VD: IT201)..."
            className="w-full pr-4 py-2 bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-[var(--color-azure)] transition-all"
            style={{ paddingLeft: '2.6rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 px-2 shrink-0">
          {courses.length} Học phần
        </span>
      </motion.div>

      {/* ─── 3. COURSE CARDS GRID ─── */}
      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--color-azure)]" />
        </div>
      ) : (
        <motion.div variants={containerVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: any) => (
            <motion.div
              key={course._id}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="eg-cyber-card overflow-hidden group flex flex-col justify-between"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--color-electric)]/15 border border-[var(--color-azure)]/30 flex items-center justify-center text-[var(--color-azure)] shadow-sm">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  {canManageCourses && (
                    <div className="flex gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingCourse(course); setIsModalOpen(true); }} 
                        className="p-1.5 text-[var(--color-azure)] hover:bg-[var(--color-electric)]/15 rounded-lg cursor-pointer transition-colors"
                        title="Sửa học phần"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(course._id, course.name)} 
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                        title="Xóa học phần"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1 group-hover:text-[var(--color-azure)] transition-colors line-clamp-1">
                  {course.name}
                </h3>
                <p className="text-xs font-mono font-bold text-[var(--color-azure)] uppercase tracking-wider mb-4">
                  Mã môn: {course.courseCode || course.code || 'CHƯA_CÓ'}
                </p>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-200/70 dark:border-white/5">
                      <p className="text-[10px] text-[var(--color-azure)] font-bold uppercase mb-1 flex items-center gap-1">
                        <Award className="w-3 h-3" /> Số tín chỉ
                      </p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {course.credits || 3} tín chỉ
                      </p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-white/[0.03] rounded-2xl border border-slate-200/70 dark:border-white/5">
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Thời lượng
                      </p>
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        {course.duration || '45 tiết'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${
                    course.status === 'active' 
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' 
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                  }`}>
                    {course.status === 'active' ? 'Đang giảng dạy' : 'Tạm dừng'}
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                      {course.department?.name || course.category || 'Khoa CNTT'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCourse ? "Cập nhật học phần" : "Thêm học phần mới"}>
        <CourseForm
          initialData={editingCourse}
          onSuccess={() => { setIsModalOpen(false); fetchCourses(); }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </motion.div>
  );
}

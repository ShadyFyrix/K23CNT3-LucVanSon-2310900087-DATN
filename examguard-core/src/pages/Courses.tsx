import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Book, Clock,
  Edit2, Trash2, Loader2, Tag, Layers, Hash, Award, CheckCircle
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Học Phần & Môn Thi</h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">
            Quản lý chương trình đào tạo, học phần tín chỉ, khoa phụ trách và đề cương thi.
          </p>
        </div>
        {canManageCourses && (
          <button
            onClick={() => { setEditingCourse(null); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-3 rounded-2xl transition-all shadow-lg shadow-blue-600/25 text-xs uppercase tracking-wider cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Thêm học phần mới
          </button>
        )}
      </header>

      <div className="bg-white dark:bg-slate-900/90 p-4 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 flex gap-4 backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên học phần hoặc mã môn học (VD: IT201)..."
            className="w-full pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            style={{ paddingLeft: '2.6rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: any) => (
            <div key={course._id} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-hidden hover:shadow-xl dark:hover:border-slate-700 transition-all group flex flex-col justify-between">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Book className="w-6 h-6" />
                  </div>
                  {canManageCourses && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingCourse(course); setIsModalOpen(true); }} 
                        className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                        title="Sửa học phần"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(course._id, course.name)} 
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                        title="Xóa học phần"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{course.name}</h3>
                <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">
                  Mã môn: {course.courseCode || course.code || 'Chưa có'}
                </p>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 rounded-2xl border border-blue-100 dark:border-blue-900/40">
                      <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <Award className="w-3 h-3" /> Số tín chỉ
                      </p>
                      <p className="text-sm font-black text-blue-900 dark:text-blue-200">
                        {course.credits || 3} tín chỉ
                      </p>
                    </div>
                    <div className="p-3 bg-teal-50/60 dark:bg-teal-950/40 rounded-2xl border border-teal-100 dark:border-teal-900/40">
                      <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Thời lượng
                      </p>
                      <p className="text-sm font-black text-teal-900 dark:text-teal-200">
                        {course.duration || '45 tiết'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase border ${
                    course.status === 'active' 
                      ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800/60' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}>
                    {course.status === 'active' ? 'Đang giảng dạy' : 'Tạm dừng'}
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase">
                      {course.department?.name || course.category || 'Khoa CNTT'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCourse ? "Cập nhật học phần" : "Thêm học phần mới"}>
        <CourseForm
          initialData={editingCourse}
          onSuccess={() => { setIsModalOpen(false); fetchCourses(); }}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Học Phần & Môn Thi</h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Quản lý chương trình đào tạo, học phần tín chỉ, khoa phụ trách và đề cương thi.
          </p>
        </div>
        {canManageCourses && (
          <button
            onClick={() => { setEditingCourse(null); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white font-black px-5 py-3 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-xs uppercase tracking-wider cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Thêm học phần mới
          </button>
        )}
      </header>

      <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo tên học phần hoặc mã môn học (VD: IT201)..."
            className="w-full pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
            style={{ paddingLeft: '2.6rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course: any) => (
            <div key={course._id} className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-all group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Book className="w-6 h-6" />
                  </div>
                  {canManageCourses && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => { setEditingCourse(course); setIsModalOpen(true); }} 
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl cursor-pointer"
                        title="Sửa học phần"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(course._id, course.name)} 
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl cursor-pointer"
                        title="Xóa học phần"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-black text-slate-900 mb-1">{course.name}</h3>
                <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-4">
                  Mã môn: {course.courseCode || course.code || 'Chưa có'}
                </p>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                      <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <Award className="w-3 h-3" /> Số tín chỉ
                      </p>
                      <p className="text-sm font-black text-indigo-700">
                        {course.credits || 3} tín chỉ
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                      <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Thời lượng
                      </p>
                      <p className="text-sm font-black text-emerald-700">
                        {course.duration || '45 tiết'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-lg uppercase ${course.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {course.status === 'active' ? 'Đang giảng dạy' : 'Tạm dừng'}
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
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
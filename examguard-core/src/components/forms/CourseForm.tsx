import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/apiClient';
import { toast } from 'react-hot-toast';
import { Book, Hash, Clock, Award, Tag, FileText } from 'lucide-react';

export function CourseForm({ initialData, onSuccess, onCancel }: any) {
  const [formData, setFormData] = useState({
    name: '',
    courseCode: '',
    credits: 3,
    duration: '45 tiết',
    category: 'Khoa Công nghệ Thông tin',
    description: '',
    status: 'active'
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        courseCode: initialData.courseCode || initialData.code || '',
        credits: initialData.credits || 3,
        duration: initialData.duration || '45 tiết',
        category: initialData.category || 'Khoa Công nghệ Thông tin',
        description: initialData.description || '',
        status: initialData.status || 'active'
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        credits: Number(formData.credits)
      };

      const res = initialData?._id 
        ? await apiClient.put(`/courses/${initialData._id}`, payload)
        : await apiClient.post('/courses', payload);
      
      if (res.data.success) {
        toast.success(initialData?._id ? "Đã cập nhật học phần" : "Đã thêm học phần mới");
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi thao tác học phần");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Book className="w-3.5 h-3.5 text-indigo-600" />
            Tên học phần / Môn thi <span className="text-rose-500">*</span>
          </label>
          <input
            required
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            placeholder="VD: Kỹ thuật lập trình C/C++"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-indigo-600" />
            Mã học phần <span className="text-rose-500">*</span>
          </label>
          <input
            required
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
            placeholder="VD: IT201"
            value={formData.courseCode}
            onChange={e => setFormData({ ...formData, courseCode: e.target.value.toUpperCase() })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-indigo-600" />
            Số tín chỉ
          </label>
          <input
            type="number"
            min={1}
            max={10}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            value={formData.credits}
            onChange={e => setFormData({ ...formData, credits: Number(e.target.value) })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            Thời lượng giảng dạy
          </label>
          <input
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            placeholder="VD: 45 tiết (30 lý thuyết + 15 thực hành)"
            value={formData.duration}
            onChange={e => setFormData({ ...formData, duration: e.target.value })}
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-600" />
            Khoa phụ trách chuyên môn
          </label>
          <select
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
          >
            <option value="Khoa Công nghệ Thông tin">Khoa Công nghệ Thông tin</option>
            <option value="Khoa Điện - Điện tử">Khoa Điện - Điện tử</option>
            <option value="Khoa Kinh tế & Quản trị">Khoa Kinh tế & Quản trị</option>
            <option value="Khoa Ngoại ngữ">Khoa Ngoại ngữ</option>
            <option value="Khoa Khoa học Cơ bản">Khoa Khoa học Cơ bản</option>
          </select>
        </div>

        <div className="col-span-2 space-y-1">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            Mô tả học phần & Đề cương tóm tắt
          </label>
          <textarea
            rows={3}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            placeholder="Nhập mục tiêu học phần, kiến thức chuẩn đầu ra hoặc quy định thi cử..."
            value={formData.description}
            onChange={e => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-indigo-200 cursor-pointer"
        >
          {initialData?._id ? "Cập nhật học phần" : "Lưu học phần"}
        </button>
      </div>
    </form>
  );
}
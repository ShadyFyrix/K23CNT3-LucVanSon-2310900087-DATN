import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/apiClient';
import { User, Mail, Phone, Calendar, Hash, Building2, BookOpen, Layers, FileText, KeyRound, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';

interface StudentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
}

export function StudentForm({ onSubmit, onCancel, initialData }: StudentFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    studentCode: '',
    fullName: '',
    email: '',
    phone: '',
    gender: 'M',
    birthday: '',
    department: '',
    batch: '',
    class: '',
    status: 'active',
    note: '',
    password: ''
  });

  const [departments, setDepartments] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    // Fetch danh mục khoa, khóa, lớp phục vụ chọn lựa
    const fetchSelectData = async () => {
      try {
        const [deptRes, batchRes, classRes] = await Promise.all([
          apiClient.get('/departments'),
          apiClient.get('/academic-batches'),
          apiClient.get('/classes?limit=all')
        ]);

        if (deptRes.data?.success && Array.isArray(deptRes.data.data)) {
          setDepartments(deptRes.data.data);
        }
        if (batchRes.data?.success && Array.isArray(batchRes.data.data)) {
          setBatches(batchRes.data.data);
        }
        if (classRes.data?.success && Array.isArray(classRes.data.data)) {
          setClasses(classRes.data.data);
        }
      } catch (err) {
        console.error('Lỗi khi nạp dữ liệu danh mục cho Form Sinh viên:', err);
      }
    };

    fetchSelectData();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        studentCode: initialData.studentCode || '',
        fullName: initialData.fullName || initialData.name || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        gender: initialData.gender || 'M',
        birthday: initialData.birthday ? new Date(initialData.birthday).toISOString().split('T')[0] : '',
        department: initialData.department?._id || initialData.department || '',
        batch: initialData.batch?._id || initialData.batch || '',
        class: initialData.class?._id || initialData.class || '',
        status: initialData.status || 'active',
        note: initialData.note || '',
        password: ''
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...formData };
    if (!payload.department) delete payload.department;
    if (!payload.batch) delete payload.batch;
    if (!payload.class) delete payload.class;
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
      {/* 1. THÔNG TIN CƠ BẢN */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Thông tin cá nhân thí sinh</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-blue-500" />
              Mã sinh viên (MSSV) <span className="text-rose-500">*</span>
            </label>
            <input
              name="studentCode"
              required
              value={formData.studentCode}
              onChange={handleChange}
              placeholder="VD: 2310900087"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-semibold uppercase text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" />
              Họ và tên thí sinh <span className="text-rose-500">*</span>
            </label>
            <input
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="VD: Lục Văn Sơn"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-medium text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-blue-500" />
              Email sinh viên <span className="text-rose-500">*</span>
            </label>
            <input
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="sinhvien@examguard.edu.vn"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-teal-500" />
              Số điện thoại
            </label>
            <input
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="0912..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Giới tính</label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-slate-100 font-semibold"
            >
              <option value="M">Nam (Male)</option>
              <option value="F">Nữ (Female)</option>
              <option value="OTHER">Khác (Other)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              Ngày sinh
            </label>
            <input
              name="birthday"
              type="date"
              value={formData.birthday}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>
      </div>

      {/* 2. PHÂN CẤP TỔ CHỨC ĐÀO TẠO */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="w-1.5 h-5 bg-teal-500 rounded-full"></div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Tổ chức học thuật & Quản lý</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              Khoa chuyên môn
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-slate-100 font-semibold"
            >
              <option value="">-- Chọn Khoa đào tạo --</option>
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-teal-500" />
              Khóa tuyển sinh
            </label>
            <select
              name="batch"
              value={formData.batch}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-slate-100 font-semibold"
            >
              <option value="">-- Chọn Khóa học --</option>
              {batches.map(b => (
                <option key={b._id} value={b._id}>{b.name} ({b.batchCode})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              Lớp sinh hoạt / Học phần
            </label>
            <select
              name="class"
              value={formData.class}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-slate-100 font-semibold"
            >
              <option value="">-- Chọn Lớp sinh hoạt --</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.name} ({c.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Trạng thái đào tạo</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm font-bold text-teal-600 dark:text-teal-400"
            >
              <option value="active">Đang theo học (Active)</option>
              <option value="graduated">Đã tốt nghiệp (Graduated)</option>
              <option value="suspended">Tạm hoãn / Đình chỉ (Suspended)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              Ghi chú hồ sơ
            </label>
            <input
              name="note"
              value={formData.note}
              onChange={handleChange}
              placeholder="Ghi chú thêm về thí sinh..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
          </div>
        </div>
      </div>

      {/* 3. TÀI KHOẢN ĐĂNG NHẬP DỰ THI */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="w-1.5 h-5 bg-indigo-600 rounded-full"></div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">Tài khoản & Mật khẩu đăng nhập thi</h3>
        </div>

        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 space-y-3">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-900 dark:text-indigo-200">
              <span className="font-bold">Quy chế đăng nhập:</span> Sinh viên sẽ đăng nhập vào hệ thống bằng <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Email thí sinh</span> ở trên và <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">Mật khẩu</span> được cấp ở đây.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-500" />
                  Mật khẩu tài khoản
                </span>
                <span className="text-[10px] font-normal text-slate-400">
                  {initialData ? '(Bỏ trống = Giữ nguyên pass cũ)' : '(Mặc định nếu để trống: 123456)'}
                </span>
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={initialData ? 'Nhập mật khẩu mới (hoặc để trống)...' : 'Mặc định: 123456'}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, password: '123456' }))}
                className="flex-1 py-2.5 px-3 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" /> Gán "123456"
              </button>
              {initialData && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, password: '' }))}
                  className="py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Xóa ô
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
        >
          {initialData ? 'Cập nhật sinh viên' : 'Thêm sinh viên mới'}
        </button>
      </div>
    </form>
  );
}
export default StudentForm;
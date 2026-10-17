import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  ScanFace
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { StudentForm } from '../components/forms/StudentForm';
import { UserForm } from '../components/forms/UserForm';
import { FaceRegistrationModal } from '../components/FaceRegistrationModal';
import { apiClient } from '../api/apiClient';
import { toast } from 'react-hot-toast';
import { exportStudentsToExcel, exportStudentsToCSV } from '../utils/studentExport';

// Mapping trạng thái sinh viên
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: 'Đang theo học', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  graduated: { label: 'Đã tốt nghiệp', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  suspended: { label: 'Tạm hoãn / Đình chỉ', color: 'bg-amber-100 text-amber-700 border-amber-200' },
};

export default function Students() {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Quản lý Sinh viên & Thí sinh</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              ExamGuard AI
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Quản lý hồ sơ thí sinh, định danh sinh trắc học Face KYC và tài khoản dự thi trực tuyến
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all text-sm font-semibold shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Xuất Excel / CSV</span>
          </button>

          <button
            onClick={() => { setEditingStudent(null); setIsModalOpen(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl hover:from-indigo-700 hover:to-violet-700 transition-all text-sm font-bold shadow-md shadow-indigo-200 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm sinh viên mới</span>
          </button>
        </div>
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-100 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo MSSV, tên, email, lớp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Tất cả Khoa / Viện</option>
            {departments.map(d => (
              <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
            ))}
          </select>

          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang theo học</option>
            <option value="graduated">Đã tốt nghiệp</option>
            <option value="suspended">Tạm hoãn / Đình chỉ</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Xem dạng lưới"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'list' ? 'bg-white shadow-xs text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Xem dạng danh sách"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {filteredStudents.length} thí sinh
          </span>
        </div>
      </div>

      {/* Nội dung danh sách */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-100">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">Chưa có sinh viên nào</h3>
          <p className="text-sm text-slate-400 mt-1">Không tìm thấy hồ sơ sinh viên phù hợp với bộ lọc hiện tại.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => {
            const isKyc = student.isFaceKyc || student.userId?.isFaceRegistered;
            return (
              <div key={student._id} className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden hover:shadow-md transition-shadow group flex flex-col justify-between">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xl mr-4 shadow-md shadow-indigo-100 shrink-0">
                        {student.avatar ? (
                          <img src={student.avatar} alt="avatar" className="w-full h-full object-cover rounded-2xl" />
                        ) : (
                          student.fullName?.charAt(0) || 'S'
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-indigo-600 transition-colors">
                          {student.fullName}
                        </h3>
                        <p className="text-xs font-mono font-bold text-indigo-600 mt-1">
                          MSSV: {student.studentCode || '---'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingStudent(student); setIsModalOpen(true); }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                        title="Sửa hồ sơ"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(student._id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Xóa hồ sơ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${STATUS_MAP[student.status]?.color || 'bg-slate-100 text-slate-600'}`}>
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
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-all cursor-pointer"
                          title="Bấm để xem hoặc cập nhật lại khuôn mặt"
                        >
                          <CheckCircle className="w-3 h-3 text-emerald-600" /> Đã KYC 5 góc
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
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                          title="Bấm để quét webcam 5 góc khuôn mặt chuẩn KYC"
                        >
                          <ScanFace className="w-3 h-3 text-indigo-600" /> Đăng ký Face ID
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-2 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{student.department?.name || 'Chưa gán khoa'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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

                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100">
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
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" /> Kích hoạt tài khoản thi
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-xs border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center w-12">STT</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Sinh viên</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Lớp & Khoa</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Định danh Face AI</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400">Trạng thái</th>
                  <th className="px-6 py-3.5 text-[10px] font-black uppercase tracking-wider text-slate-400 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredStudents.map((student, index) => {
                  const isKyc = student.isFaceKyc || student.userId?.isFaceRegistered;
                  return (
                    <tr key={student._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-4 py-3.5 text-center text-xs font-bold text-slate-400">{index + 1}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                            {student.avatar ? (
                              <img src={student.avatar} alt="avatar" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                              student.fullName?.charAt(0) || 'S'
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                              {student.fullName}
                              {student.studentCode && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                                  {student.studentCode}
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                              {student.email && <span>{student.email}</span>}
                              {student.phone && <span>{student.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        <div className="text-xs">
                          <p className="font-bold text-slate-800">{student.class?.name || student.class?.code || 'Chưa phân lớp'}</p>
                          <p className="text-slate-400">{student.department?.name || '---'}</p>
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
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-all cursor-pointer"
                            title="Bấm để xem hoặc cập nhật lại khuôn mặt"
                          >
                            <ScanFace className="w-3.5 h-3.5 text-emerald-600" /> Đã KYC 5 góc
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
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                            title="Bật webcam quét 5 góc khuôn mặt chuẩn KYC"
                          >
                            <ScanFace className="w-3.5 h-3.5 text-indigo-600" /> Đăng ký Face ID
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${STATUS_MAP[student.status]?.color || 'bg-slate-100 text-slate-600'}`}>
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
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Quét & Đăng ký Face ID (KYC)"
                          >
                            <ScanFace className="w-4 h-4 text-indigo-600" />
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
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Kích hoạt tài khoản thi"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setEditingStudent(student); setIsModalOpen(true); }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                            title="Sửa hồ sơ"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(student._id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
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
        </div>
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
            <label className="text-xs font-bold text-slate-700">Phạm vi xuất</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-3 rounded-xl border text-left transition-all ${exportScope === 'all' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold' : 'border-slate-200 text-slate-600'}`}
              >
                Tất cả sinh viên ({students.length})
              </button>
              <button
                type="button"
                onClick={() => setExportScope('filtered')}
                className={`p-3 rounded-xl border text-left transition-all ${exportScope === 'filtered' ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold' : 'border-slate-200 text-slate-600'}`}
              >
                Theo bộ lọc hiện tại ({filteredStudents.length})
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Định dạng tệp tin</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('xlsx')}
                className={`p-3 rounded-xl border text-left transition-all ${exportFormat === 'xlsx' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold' : 'border-slate-200 text-slate-600'}`}
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-3 rounded-xl border text-left transition-all ${exportFormat === 'csv' ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 font-bold' : 'border-slate-200 text-slate-600'}`}
              >
                CSV (.csv)
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsExportModalOpen(false)}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={exporting}
              onClick={handleDownload}
              className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md shadow-indigo-100 flex items-center gap-2"
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
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Sparkles,
  UserPlus,
  Trash2,
  Edit2,
  Check,
  Printer,
  Shield,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Camera,
  Download,
  Users,
  Grid,
  ArrowUpDown,
  CheckCircle2,
  Info
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../api/apiClient';
import { FaceRegistrationModal } from '../../components/FaceRegistrationModal';

interface CandidateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    _id: string;
    code: string;
    title: string;
    room?: { code: string; capacity: number };
    durationMinutes?: number;
  } | null;
  onRefreshParent?: () => void;
}

interface ExamStudentItem {
  _id: string;
  sessionId?: string;
  session?: string;
  candidateCode: string;
  seatRow: number;
  seatCol: number;
  status: string;
  score?: number;
  student?: {
    _id: string;
    fullName: string;
    studentCode: string;
    email: string;
    phone?: string;
    avatar?: string;
    faceImage?: string;
    isFaceKyc?: boolean;
    classId?: { name: string };
  };
  studentId?: {
    _id: string;
    fullName: string;
    studentCode: string;
    email: string;
    phone?: string;
    avatar?: string;
    faceImage?: string;
    isFaceKyc?: boolean;
    classId?: { name: string };
  };
}

interface StudentOption {
  _id: string;
  fullName: string;
  studentCode: string;
  email: string;
  isFaceKyc?: boolean;
  class?: { _id?: string; name?: string; code?: string };
  classId?: { _id?: string; name?: string; code?: string };
}

interface ClassOption {
  _id: string;
  name: string;
  code: string;
}

export function CandidateManagerModal({
  isOpen,
  onClose,
  session,
  onRefreshParent
}: CandidateManagerModalProps) {
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<ExamStudentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKyc, setFilterKyc] = useState<'ALL' | 'KYC' | 'NOT_KYC'>('ALL');

  // Chỉnh sửa SBD inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState('');
  const [editingSeatRow, setEditingSeatRow] = useState<number>(1);
  const [editingSeatCol, setEditingSeatCol] = useState<number>(1);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Sinh SBD tự động Drawer / Form
  const [showAutoSbdForm, setShowAutoSbdForm] = useState(false);
  const [sbdPrefix, setSbdPrefix] = useState('SBD-');
  const [sbdStartNum, setSbdStartNum] = useState(1);
  const [sbdPadLength, setSbdPadLength] = useState(3);
  const [sbdSortBy, setSbdSortBy] = useState<'NAME' | 'STUDENT_CODE' | 'SEAT'>('NAME');
  const [isGeneratingSbd, setIsGeneratingSbd] = useState(false);

  // Thêm thí sinh vào ca
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isBulkAddingClass, setIsBulkAddingClass] = useState(false);

  // Đăng ký Face KYC Modal
  const [kycCandidate, setKycCandidate] = useState<ExamStudentItem | null>(null);

  // Lấy chi tiết ca thi kèm danh sách thí sinh
  const fetchSessionDetails = async () => {
    if (!session?._id) return;
    try {
      setLoading(true);
      const res = await apiClient.get(`/api/exam/sessions/${session._id}`);
      if (res.data && res.data.success) {
        setCandidates(res.data.data.students || []);
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách thí sinh:', err);
      toast.error('Không thể tải danh sách thí sinh');
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách toàn bộ sinh viên và lớp học khi mở modal
  const fetchAllStudents = async () => {
    try {
      // 1. Tải danh sách sinh viên trường
      const res = await apiClient.get('/api/students?limit=500');
      if (res.data && res.data.success) {
        const studentList = Array.isArray(res.data.data)
          ? res.data.data
          : (res.data.data?.students || []);
        setAllStudents(studentList);
      }
    } catch (err: any) {
      console.warn('Lỗi gọi /api/students, thử fallback /api/academic/students:', err);
      try {
        const res2 = await apiClient.get('/api/academic/students?limit=500');
        if (res2.data) {
          const studentList = Array.isArray(res2.data.data)
            ? res2.data.data
            : (res2.data.data?.students || res2.data.students || []);
          setAllStudents(studentList);
        }
      } catch (e) {
        console.error('Không thể tải danh sách sinh viên trường:', e);
      }
    }

    try {
      // 2. Tải danh sách lớp học
      const cRes = await apiClient.get('/api/classes');
      if (cRes.data && (cRes.data.success || Array.isArray(cRes.data.data))) {
        const classList = Array.isArray(cRes.data.data) ? cRes.data.data : (cRes.data.data?.classes || []);
        setClasses(classList);
      }
    } catch (cErr) {
      console.warn('Không thể tải danh sách lớp học:', cErr);
    }
  };

  useEffect(() => {
    if (isOpen && session?._id) {
      fetchSessionDetails();
      fetchAllStudents();
      setShowAutoSbdForm(false);
      setShowAddStudentForm(false);
      setEditingId(null);
    }
  }, [isOpen, session?._id]);

  if (!isOpen || !session) return null;

  // Lọc thí sinh hiển thị
  const filteredCandidates = candidates.filter(c => {
    const student = c.student || c.studentId;
    const nameMatch = student?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const codeMatch = student?.studentCode?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const sbdMatch = c.candidateCode?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const matchesSearch = nameMatch || codeMatch || sbdMatch;

    if (!matchesSearch) return false;

    if (filterKyc === 'KYC') return !!student?.isFaceKyc;
    if (filterKyc === 'NOT_KYC') return !student?.isFaceKyc;
    return true;
  });

  // Thống kê KYC
  const totalCount = candidates.length;
  const kycCount = candidates.filter(c => (c.student || c.studentId)?.isFaceKyc).length;
  const notKycCount = totalCount - kycCount;

  // Xử lý lưu inline SBD
  const handleStartEdit = (item: ExamStudentItem) => {
    setEditingId(item._id);
    setEditingCode(item.candidateCode || '');
    setEditingSeatRow(item.seatRow || 1);
    setEditingSeatCol(item.seatCol || 1);
  };

  const handleSaveEdit = async (item: ExamStudentItem) => {
    if (!editingCode.trim()) {
      toast.error('Số báo danh không được để trống');
      return;
    }
    try {
      setIsSavingEdit(true);
      const res = await apiClient.put(`/api/exam/sessions/${session._id}/students/${item._id}`, {
        candidateCode: editingCode.trim().toUpperCase(),
        seatRow: editingSeatRow,
        seatCol: editingSeatCol
      });
      if (res.data && res.data.success) {
        toast.success(`Đã cập nhật SBD: ${editingCode.trim().toUpperCase()}`);
        setEditingId(null);
        fetchSessionDetails();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi cập nhật số báo danh');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Xử lý sinh SBD hàng loạt
  const handleGenerateSbd = async () => {
    try {
      setIsGeneratingSbd(true);
      const res = await apiClient.post(`/api/exam/sessions/${session._id}/generate-candidate-codes`, {
        prefix: sbdPrefix,
        startNum: Number(sbdStartNum) || 1,
        padLength: Number(sbdPadLength) || 3,
        sortBy: sbdSortBy
      });
      if (res.data && res.data.success) {
        toast.success(res.data.message || 'Đã sinh số báo danh thành công!');
        setShowAutoSbdForm(false);
        fetchSessionDetails();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi sinh số báo danh tự động');
    } finally {
      setIsGeneratingSbd(false);
    }
  };

  // Thêm thí sinh vào ca
  const handleAddStudent = async (student: StudentOption) => {
    try {
      setIsAddingStudent(true);
      // Gợi ý SBD tự động
      const nextNum = candidates.length + 1;
      const suggestedCode = `${sbdPrefix}${String(nextNum).padStart(sbdPadLength, '0')}`;
      const res = await apiClient.post(`/api/exam/sessions/${session._id}/add-student`, {
        studentId: student._id,
        candidateCode: suggestedCode
      });
      if (res.data && res.data.success) {
        toast.success(`Đã thêm thí sinh ${student.fullName} vào ca thi!`);
        fetchSessionDetails();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể thêm thí sinh');
    } finally {
      setIsAddingStudent(false);
    }
  };

  // Xóa thí sinh khỏi ca thi
  const handleRemoveStudent = async (item: ExamStudentItem) => {
    const student = item.student || item.studentId;
    const studentName = student?.fullName || item.candidateCode;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thí sinh ${studentName} (${item.candidateCode}) khỏi ca thi này?`)) {
      return;
    }
    try {
      const res = await apiClient.delete(`/api/exam/sessions/${session._id}/students/${item._id}`);
      if (res.data && res.data.success) {
        toast.success(`Đã xóa thí sinh khỏi ca thi`);
        fetchSessionDetails();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi xóa thí sinh');
    }
  };

  // Thí sinh chưa có trong ca thi (để chọn thêm)
  const enrolledStudentIds = new Set(
    candidates.map(c => {
      const s = c.student || c.studentId;
      return (typeof s === 'object' ? s?._id : s)?.toString();
    }).filter(Boolean)
  );

  const availableStudentsToAdd = allStudents
    .filter(st => !enrolledStudentIds.has(st._id?.toString()))
    .filter(st => {
      // 1. Lọc theo lớp học nếu chọn cụ thể
      if (selectedClassId !== 'ALL') {
        const stClass = st.class || st.classId;
        const stClassId = stClass?._id ? String(stClass._id) : '';
        const stClassCode = stClass?.code || '';
        if (stClassId !== selectedClassId && stClassCode !== selectedClassId) {
          return false;
        }
      }

      // 2. Lọc theo từ khóa tìm kiếm (MSSV, Họ tên, Email)
      if (!studentSearchTerm.trim()) return true;
      const term = studentSearchTerm.trim().toLowerCase();
      const codeMatch = st.studentCode?.toLowerCase().includes(term);
      const nameMatch = st.fullName?.toLowerCase().includes(term);
      const emailMatch = st.email?.toLowerCase().includes(term);
      return codeMatch || nameMatch || emailMatch;
    });

  // Thêm tất cả sinh viên đang lọc vào ca thi
  const handleBulkAddClass = async () => {
    if (availableStudentsToAdd.length === 0) {
      toast.error('Không có sinh viên nào để thêm');
      return;
    }
    const studentIdsToAdd = availableStudentsToAdd.map(st => st._id);
    try {
      setIsBulkAddingClass(true);
      const res = await apiClient.post(`/api/exam/sessions/${session._id}/bulk-add-students`, {
        studentIds: studentIdsToAdd
      });
      if (res.data && res.data.success) {
        toast.success(res.data.message || `Đã thêm ${studentIdsToAdd.length} sinh viên vào ca thi!`);
        fetchSessionDetails();
        if (onRefreshParent) onRefreshParent();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi thêm sinh viên vào ca thi');
    } finally {
      setIsBulkAddingClass(false);
    }
  };

  // In danh sách thí sinh phòng thi
  const handlePrintList = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-20">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span className="font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                {session.code}
              </span>
              <span>•</span>
              <span className="text-slate-300">Phòng thi: <strong className="text-white">{session.room?.code || 'Chưa xếp'}</strong> ({session.room?.capacity || 40} bàn)</span>
              <span>•</span>
              <span>Thời lượng: {session.durationMinutes || 60} phút</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center space-x-3">
              <span>Quản lý Thí sinh & Lập Số Báo Danh (SBD)</span>
            </h2>
            <p className="text-xs text-slate-400">
              {session.title}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchSessionDetails}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition disabled:opacity-50"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={handlePrintList}
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-700"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>In Danh Sách Ca Thi</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/60 border-b border-slate-800/80">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Tổng Thí Sinh</p>
              <p className="text-lg font-bold text-white">{totalCount} / {session.room?.capacity || 40}</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Đã Định Danh KYC</p>
              <p className="text-lg font-bold text-emerald-400">{kycCount}</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Chưa Đăng Ký Face</p>
              <p className="text-lg font-bold text-amber-400">{notKycCount}</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-medium">Tỷ lệ Sẵn Sàng AI</p>
              <p className="text-lg font-bold text-cyan-400">
                {totalCount > 0 ? Math.round((kycCount / totalCount) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Batch Tools */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
          {/* Search & Filter */}
          <div className="flex items-center space-x-3 flex-1 min-w-[280px]">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm theo SBD, Tên, MSSV..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setFilterKyc('ALL')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  filterKyc === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tất cả ({totalCount})
              </button>
              <button
                onClick={() => setFilterKyc('KYC')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  filterKyc === 'KYC' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Đã KYC ({kycCount})
              </button>
              <button
                onClick={() => setFilterKyc('NOT_KYC')}
                className={`px-2.5 py-1 rounded-lg font-medium transition ${
                  filterKyc === 'NOT_KYC' ? 'bg-amber-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Chưa KYC ({notKycCount})
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setShowAutoSbdForm(!showAutoSbdForm);
                setShowAddStudentForm(false);
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                showAutoSbdForm
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sinh SBD Hàng Loạt</span>
            </button>

            <button
              onClick={() => {
                setShowAddStudentForm(!showAddStudentForm);
                setShowAutoSbdForm(false);
              }}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                showAddStudentForm
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Thêm Thí Sinh</span>
            </button>
          </div>
        </div>

        {/* Panel 1: Form Sinh SBD Tự Động */}
        {showAutoSbdForm && (
          <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950/40 border-b border-cyan-500/30 animate-in fade-in duration-200">
            <div className="max-w-4xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Quy Tắc Tự Động Đánh Số Báo Danh (SBD) Cho Ca Thi</span>
                </h4>
                <button
                  onClick={() => setShowAutoSbdForm(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Đóng lại
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Tiền tố SBD (Prefix)</label>
                  <input
                    type="text"
                    value={sbdPrefix}
                    onChange={e => setSbdPrefix(e.target.value)}
                    placeholder="VD: SBD-, CA1-, 23IT-"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:ring-1 focus:ring-cyan-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500">VD: SBD-001, SBD-002...</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Số bắt đầu</label>
                  <input
                    type="number"
                    min="1"
                    value={sbdStartNum}
                    onChange={e => setSbdStartNum(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:ring-1 focus:ring-cyan-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-500">Mặc định: 1</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Số chữ số đệm 0</label>
                  <select
                    value={sbdPadLength}
                    onChange={e => setSbdPadLength(parseInt(e.target.value) || 3)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:ring-1 focus:ring-cyan-500 outline-none"
                  >
                    <option value={2}>2 chữ số (01, 02...)</option>
                    <option value={3}>3 chữ số (001, 002...)</option>
                    <option value={4}>4 chữ số (0001, 0002...)</option>
                  </select>
                  <span className="text-[10px] text-slate-500">Quy chuẩn phòng thi</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Thứ tự sắp xếp</label>
                  <select
                    value={sbdSortBy}
                    onChange={e => setSbdSortBy(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:ring-1 focus:ring-cyan-500 outline-none"
                  >
                    <option value="NAME">Họ Tên Thí Sinh (A → Z)</option>
                    <option value="STUDENT_CODE">Mã Sinh Viên (MSSV)</option>
                    <option value="SEAT">Vị trí Bàn Thi (Hàng - Cột)</option>
                  </select>
                  <span className="text-[10px] text-slate-500">Theo chuẩn Bộ GD&ĐT</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-cyan-300 flex items-center space-x-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Ví dụ kết quả: <strong>{sbdPrefix}{String(sbdStartNum).padStart(sbdPadLength, '0')}</strong>,{' '}
                    <strong>{sbdPrefix}{String(sbdStartNum + 1).padStart(sbdPadLength, '0')}</strong>... áp dụng cho {candidates.length} thí sinh.
                  </span>
                </div>

                <button
                  onClick={handleGenerateSbd}
                  disabled={isGeneratingSbd || candidates.length === 0}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition disabled:opacity-50 shadow-md shadow-cyan-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>{isGeneratingSbd ? 'Đang cập nhật SBD...' : 'Áp Dụng Đánh SBD Ngay'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Panel 2: Form Thêm Thí Sinh Vào Ca */}
        {showAddStudentForm && (
          <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950/30 border-b border-indigo-500/30 animate-in fade-in duration-200">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-indigo-400" />
                  <span>Chọn Thí Sinh Từ Danh Sách Lớp / Toàn Trường Để Thêm Vào Ca Thi</span>
                </h4>
                <button
                  onClick={() => setShowAddStudentForm(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Đóng lại
                </button>
              </div>

              {/* Dải bộ lọc: Ô tìm kiếm MSSV/Họ tên + Chọn theo Lớp + Nút thêm cả lớp */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Gõ mã sinh viên (VD: 2310900087), họ tên hoặc email..."
                    value={studentSearchTerm}
                    onChange={e => setStudentSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="w-full sm:w-64">
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="ALL">🏫 Tất cả lớp (Toàn trường)</option>
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {availableStudentsToAdd.length > 0 && (
                  <button
                    onClick={handleBulkAddClass}
                    disabled={isBulkAddingClass || isAddingStudent}
                    className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-500/20 disabled:opacity-50 whitespace-nowrap"
                    title="Thêm tất cả các sinh viên đang hiển thị theo bộ lọc vào ca thi"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>
                      {isBulkAddingClass ? 'Đang thêm...' : `+ Thêm tất cả (${availableStudentsToAdd.length} SV)`}
                    </span>
                  </button>
                )}
              </div>

              {/* Danh sách thẻ sinh viên */}
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {availableStudentsToAdd.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                    <p className="text-xs text-slate-400 font-medium">Không tìm thấy sinh viên nào chưa có trong ca thi.</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Thử xóa bộ lọc, tìm theo MSSV (VD: 2310900087) hoặc chọn "Tất cả lớp (Toàn trường)".
                    </p>
                  </div>
                ) : (
                  availableStudentsToAdd.slice(0, 30).map(st => {
                    const stClass = st.class || st.classId;
                    const className = typeof stClass === 'object' ? (stClass?.code || stClass?.name) : '';
                    return (
                      <div
                        key={st._id}
                        className="flex items-center justify-between p-3 bg-slate-950/90 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 rounded-xl transition"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center text-xs">
                            {st.fullName?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="text-xs font-semibold text-white">{st.fullName}</p>
                              {className && (
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                                  {className}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              MSSV: <span className="font-mono text-cyan-400 font-bold">{st.studentCode}</span> • {st.email}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {st.isFaceKyc ? (
                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold flex items-center space-x-1">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>Đã KYC Face</span>
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 text-amber-400" />
                              <span>Chưa KYC</span>
                            </span>
                          )}

                          <button
                            onClick={() => handleAddStudent(st)}
                            disabled={isAddingStudent || isBulkAddingClass}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center space-x-1 shadow-sm"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>+ Thêm vào ca</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* Candidate Table Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-8 h-8 mx-auto animate-spin text-cyan-400" />
              <p className="text-xs">Đang tải danh sách thí sinh phòng thi...</p>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="py-16 text-center bg-slate-950/60 border border-slate-800 rounded-2xl p-8 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <h4 className="text-sm font-bold text-slate-300">Chưa có thí sinh nào trong ca thi này</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Nhấn nút "Thêm Thí Sinh" phía trên hoặc nhập danh sách thí sinh từ lớp học để giảng viên bắt đầu xếp chỗ và đánh số báo danh.
              </p>
              <button
                onClick={() => setShowAddStudentForm(true)}
                className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition inline-flex items-center space-x-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Thêm thí sinh ngay</span>
              </button>
            </div>
          ) : (
            <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/60 shadow-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">STT</th>
                    <th className="py-3 px-4 w-36">Số Báo Danh (SBD)</th>
                    <th className="py-3 px-4">Thí Sinh</th>
                    <th className="py-3 px-4 w-28 text-center">Bàn Thi</th>
                    <th className="py-3 px-4 w-48 text-center">Định Danh Face KYC</th>
                    <th className="py-3 px-4 w-28 text-center">Trạng Thái</th>
                    <th className="py-3 px-4 w-24 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCandidates.map((item, idx) => {
                    const student = item.student || item.studentId;
                    const isEditing = editingId === item._id;
                    const isKyc = !!student?.isFaceKyc;

                    return (
                      <tr key={item._id} className="hover:bg-slate-850 transition group">
                        {/* STT */}
                        <td className="py-3 px-4 text-center font-mono text-slate-500">
                          {idx + 1}
                        </td>

                        {/* SBD */}
                        <td className="py-3 px-4">
                          {isEditing ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="text"
                                value={editingCode}
                                onChange={e => setEditingCode(e.target.value.toUpperCase())}
                                className="w-24 bg-slate-950 border border-cyan-500 rounded px-2 py-1 text-xs font-mono font-bold text-cyan-300 focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveEdit(item)}
                                disabled={isSavingEdit}
                                className="p-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white"
                                title="Lưu"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400"
                                title="Hủy"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <span className="font-mono font-bold text-xs px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                {item.candidateCode || 'CHƯA CÓ'}
                              </span>
                              <button
                                onClick={() => handleStartEdit(item)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-cyan-400 transition"
                                title="Sửa SBD"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Thí sinh */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-700 to-indigo-700 flex items-center justify-center font-bold text-white text-xs">
                              {student?.fullName?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                                {student?.fullName || 'Thí sinh'}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                MSSV: <span className="font-mono text-cyan-400 font-semibold">{student?.studentCode}</span>
                                {student?.email && <span className="ml-2 text-slate-500">({student.email})</span>}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Bàn thi */}
                        <td className="py-3 px-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center space-x-1 text-[11px]">
                              <span>H:</span>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={editingSeatRow}
                                onChange={e => setEditingSeatRow(parseInt(e.target.value) || 1)}
                                className="w-10 bg-slate-950 border border-slate-700 rounded px-1 text-center text-white"
                              />
                              <span>C:</span>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={editingSeatCol}
                                onChange={e => setEditingSeatCol(parseInt(e.target.value) || 1)}
                                className="w-10 bg-slate-950 border border-slate-700 rounded px-1 text-center text-white"
                              />
                            </div>
                          ) : (
                            <span className="font-mono text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                              H{item.seatRow} - C{item.seatCol}
                            </span>
                          )}
                        </td>

                        {/* Định danh Face KYC */}
                        <td className="py-3 px-4 text-center">
                          {isKyc ? (
                            <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Đã KYC ArcFace</span>
                            </div>
                          ) : (
                            <div className="inline-flex items-center space-x-2">
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                <span>Chưa KYC</span>
                              </span>
                              <button
                                onClick={() => setKycCandidate(item)}
                                className="px-2 py-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-[10px] font-bold flex items-center space-x-1 shadow-sm transition active:scale-95"
                                title="Đăng ký khuôn mặt ngay"
                              >
                                <Camera className="w-3 h-3" />
                                <span>Đăng Ký Face</span>
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Trạng thái thi */}
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'SUBMITTED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : item.status === 'IN_PROGRESS'
                              ? 'bg-cyan-500/10 text-cyan-400 animate-pulse border border-cyan-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {item.status === 'SUBMITTED' ? 'ĐÃ NỘP BÀI' : item.status === 'IN_PROGRESS' ? 'ĐANG THI' : 'SẴN SÀNG'}
                          </span>
                        </td>

                        {/* Thao tác */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => setKycCandidate(item)}
                              className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition"
                              title="Chụp / Quét Face ID"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveStudent(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                              title="Xóa khỏi ca thi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-400 flex items-center space-x-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span>
              Số báo danh (SBD) được chuẩn hóa cho camera AI nhận diện đối soát và hiển thị trên sơ đồ phòng thi 3D.
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      </div>

      {/* Face Registration Modal Pop-up */}
      {kycCandidate && (() => {
        const student = kycCandidate.student || kycCandidate.studentId;
        return (
          <FaceRegistrationModal
            isOpen={!!kycCandidate}
            onClose={() => setKycCandidate(null)}
            user={{
              _id: student?._id,
              employeeId: student?.studentCode,
              fullName: student?.fullName,
              department: student?.classId?.name || 'Thí sinh ca thi'
            }}
            onSuccess={() => {
              fetchSessionDetails();
              toast.success(`Đã cập nhật sinh trắc học khuôn mặt cho ${student?.fullName}!`);
            }}
          />
        );
      })()}
    </div>
  );
}

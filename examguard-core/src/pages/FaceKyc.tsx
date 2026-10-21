import React, { useState, useEffect, useMemo } from 'react';
import {
  ScanFace,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  Camera,
  RefreshCw,
  UserCheck,
  UserX,
  Users,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  ArrowRight
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../api/apiClient';
import { FaceRegistrationModal } from '../components/FaceRegistrationModal';
import { useAuth } from '../context/AuthContext';

export default function FaceKyc() {
  const { user: currentUser } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [searchTerm, setSearchTerm] = useState('');
  const [kycFilter, setKycFilter] = useState<'ALL' | 'KYC_DONE' | 'KYC_PENDING'>('ALL');

  // Modal State
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resStudents, resTeachers] = await Promise.all([
        apiClient.get('/students?limit=1000').catch(() => ({ data: { data: [] } })),
        apiClient.get('/teachers?limit=1000').catch(() => ({ data: { data: [] } }))
      ]);

      if (resStudents.data?.data) {
        setStudents(resStudents.data.data);
      }
      if (resTeachers.data?.data) {
        setTeachers(resTeachers.data.data);
      }
    } catch (e: any) {
      console.error('Fetch error:', e);
      toast.error('Không thể tải dữ liệu danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered List
  const targetList = activeTab === 'STUDENT' ? students : teachers;

  const filteredList = useMemo(() => {
    return targetList.filter((item) => {
      const isKyc = item.isFaceKyc || item.userId?.isFaceRegistered || (Array.isArray(item.faceEmbedding) && item.faceEmbedding.length > 0);
      if (kycFilter === 'KYC_DONE' && !isKyc) return false;
      if (kycFilter === 'KYC_PENDING' && isKyc) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const code = (item.studentCode || item.teacherCode || '').toLowerCase();
        const name = (item.fullName || item.name || '').toLowerCase();
        const email = (item.email || '').toLowerCase();
        return code.includes(q) || name.includes(q) || email.includes(q);
      }
      return true;
    });
  }, [targetList, kycFilter, searchTerm]);

  // Thống kê
  const studentTotal = students.length;
  const studentKycCount = students.filter(s => s.isFaceKyc || s.userId?.isFaceRegistered || (Array.isArray(s.faceEmbedding) && s.faceEmbedding.length > 0)).length;
  const teacherTotal = teachers.length;
  const teacherKycCount = teachers.filter(t => t.isFaceKyc || t.userId?.isFaceRegistered || (Array.isArray(t.faceEmbedding) && t.faceEmbedding.length > 0)).length;

  const handleOpenKyc = (item: any) => {
    setSelectedPerson({
      _id: item._id,
      fullName: item.fullName || item.name,
      email: item.email,
      department: activeTab === 'STUDENT' ? (item.class?.name || 'Sinh viên') : (item.department?.name || 'Giảng viên'),
      code: item.studentCode || item.teacherCode
    });
    setIsFaceModalOpen(true);
  };

  const handleSelfKyc = () => {
    if (!currentUser) return;
    const u = currentUser as any;
    setSelectedPerson({
      _id: u._id || u.id,
      fullName: u.fullName || u.name,
      email: u.email,
      department: u.role || 'Cán bộ / Thí sinh',
      code: u.username || u.email
    });
    setIsFaceModalOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">ExamGuard AI</span>
              <span>•</span>
              <span>Định Danh Sinh Trắc Học Gốc</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-3">
              <ScanFace className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
              <span>TRUNG TÂM ĐĂNG KÝ & QUẢN LÝ FACE ID (KYC)</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Khuôn mặt là căn cước sinh trắc học gốc chuẩn KYC. Bắt buộc hoàn thành để được cấp quyền dự thi và phân công coi thi.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSelfKyc}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Quét Face ID Cho Tôi ({currentUser?.fullName || 'Bản thân'})</span>
            </button>
            <button
              onClick={fetchData}
              className="p-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer shadow-xs"
              title="Làm mới"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Thẻ Thống Kê Tổng Quan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center space-x-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Sinh viên đã KYC</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold text-slate-900 dark:text-white">{studentKycCount}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">/ {studentTotal} SV</span>
              </div>
              <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold mt-0.5">
                {studentTotal > 0 ? Math.round((studentKycCount / studentTotal) * 100) : 0}% hoàn thành
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center space-x-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Giảng viên đã KYC</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold text-slate-900 dark:text-white">{teacherKycCount}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">/ {teacherTotal} GV</span>
              </div>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">
                {teacherTotal > 0 ? Math.round((teacherKycCount / teacherTotal) * 100) : 0}% hoàn thành
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center space-x-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <UserX className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Chưa hoàn tất KYC</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
                  {(studentTotal - studentKycCount) + (teacherTotal - teacherKycCount)}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">người</span>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400/80 mt-0.5 font-medium">Bị chặn thi / chặn coi thi</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center space-x-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">AI Face Microservice</p>
              <div className="flex items-center space-x-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Port 8000 Sẵn Sàng</span>
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">YuNet + ArcFace w600k 512D</p>
            </div>
          </div>
        </div>

        {/* Toolbar & Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
          {/* Tabs: Sinh viên / Giảng viên */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('STUDENT')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                activeTab === 'STUDENT'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              <span>Sinh Viên & Thí Sinh ({students.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('TEACHER')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                activeTab === 'TEACHER'
                  ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Giảng Viên & Giám Thị ({teachers.length})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder={activeTab === 'STUDENT' ? "Tìm theo MSSV, họ tên, email..." : "Tìm theo Mã GV, họ tên, email..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          {/* Filter KYC Status */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shrink-0">
            <button
              onClick={() => setKycFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                kycFilter === 'ALL' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setKycFilter('KYC_PENDING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1 ${
                kycFilter === 'KYC_PENDING' ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-500/30' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Chưa KYC</span>
            </button>
            <button
              onClick={() => setKycFilter('KYC_DONE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer flex items-center space-x-1 ${
                kycFilter === 'KYC_DONE' ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-500/30' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Đã KYC</span>
            </button>
          </div>
        </div>

        {/* Bảng danh sách người dùng */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-14 text-center">STT</th>
                  <th className="py-3.5 px-4">Họ và Tên</th>
                  <th className="py-3.5 px-4">Mã Định Danh</th>
                  <th className="py-3.5 px-4">Đơn Vị / Lớp</th>
                  <th className="py-3.5 px-4">Trạng Thái Face KYC</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-600 dark:text-cyan-400" />
                      <p>Đang tải dữ liệu hồ sơ...</p>
                    </td>
                  </tr>
                ) : filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-slate-400 dark:text-slate-600" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Không tìm thấy bản ghi phù hợp</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Vui lòng thay đổi từ khóa hoặc bộ lọc tìm kiếm.</p>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item, idx) => {
                    const isKyc = item.isFaceKyc || item.userId?.isFaceRegistered || (Array.isArray(item.faceEmbedding) && item.faceEmbedding.length > 0);
                    const code = item.studentCode || item.teacherCode || '---';
                    const name = item.fullName || item.name || '---';
                    const deptOrClass = activeTab === 'STUDENT' ? (item.class?.name || item.class?.code || 'Chưa phân lớp') : (item.department?.name || 'Bộ môn');

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                        <td className="py-3 px-4 text-center font-mono text-slate-400 dark:text-slate-500">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-xs">
                              {name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">{name}</p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500">{item.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-cyan-600 dark:text-cyan-400">{code}</td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{deptOrClass}</td>
                        <td className="py-3 px-4">
                          {isKyc ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>ĐÃ KYC 5 GÓC (APPROVED)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>CHƯA KYC (BLOCKED)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleOpenKyc(item)}
                            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                              isKyc
                                ? 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700'
                                : 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-cyan-600/20'
                            }`}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>{isKyc ? 'Cập Nhật Face' : 'Đăng Ký Face ID'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Quét Face KYC */}
        {isFaceModalOpen && selectedPerson && (
          <FaceRegistrationModal
            isOpen={isFaceModalOpen}
            onClose={() => {
              setIsFaceModalOpen(false);
              setSelectedPerson(null);
            }}
            user={selectedPerson}
            onSuccess={() => {
              fetchData();
              toast.success(`Đã hoàn tất đăng ký Face KYC cho ${selectedPerson.fullName}!`);
            }}
          />
        )}
      </div>
    </div>
  );
}

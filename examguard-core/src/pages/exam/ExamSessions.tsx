import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Plus,
  Play,
  Eye,
  ShieldCheck,
  CheckCircle,
  Users,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Loader2,
  FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../api/apiClient';

interface ExamSessionItem {
  _id: string;
  code: string;
  title: string;
  subject?: { name: string; courseCode: string };
  room?: { code: string; name: string; capacity: number };
  startTime: string;
  endTime: string;
  durationMinutes: number;
  examType: string;
  status: string;
  gradingStatus: string;
  proctor1?: { fullName: string };
}

export default function ExamSessions() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ExamSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [typeFilter, setTypeFilter] = useState('ALL');

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/exam/sessions');
      if (res.data && res.data.success) {
        setSessions(res.data.data);
      }
    } catch (e: any) {
      console.error('Lỗi fetch ca thi:', e);
      toast.error('Không thể tải danh sách ca thi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const filtered = sessions.filter(s => {
    const matchSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || s.status === statusFilter || s.gradingStatus === statusFilter;
    const matchType = typeFilter === 'ALL' || s.examType === typeFilter;
    return matchSearch && matchStatus && matchType;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400 mb-1">
              <span className="text-cyan-400 font-semibold">ExamGuard AI</span>
              <span>•</span>
              <span>Khảo thí & Thi Trực Tuyến</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center space-x-3">
              <span>QUẢN LÝ LỊCH THI & CA THI QUIZ</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {sessions.length} CA THI
              </span>
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/take-exam')}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/20 transition active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Vào Làm Bài Quiz</span>
            </button>
            <button
              onClick={() => navigate('/exam-papers')}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <FileText className="w-4 h-4 text-cyan-400" />
              <span>Ngân Hàng Đề Thi</span>
            </button>
          </div>
        </div>

        {/* Toolbar lọc */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Tìm kiếm ca thi, mã ca, môn học..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bộ lọc loại thi */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  typeFilter === 'ALL' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Mọi hình thức
              </button>
              <button
                onClick={() => setTypeFilter('ONLINE_QUIZ')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${
                  typeFilter === 'ONLINE_QUIZ' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>⚡ Quiz Trực Tuyến</span>
              </button>
              <button
                onClick={() => setTypeFilter('LAB_PC')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  typeFilter === 'LAB_PC' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Máy Lab
              </button>
              <button
                onClick={() => setTypeFilter('BYOD_LAPTOP')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  typeFilter === 'BYOD_LAPTOP' ? 'bg-indigo-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Laptop BYOD
              </button>
            </div>

            {/* Bộ lọc trạng thái */}
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {['ALL', 'IN_PROGRESS', 'SCHEDULED', 'PUBLISHED'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    statusFilter === st ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'Tất cả trạng thái' : st === 'IN_PROGRESS' ? 'Đang thi' : st === 'SCHEDULED' ? 'Lên lịch' : 'Đã có điểm'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Danh sách ca thi Cards */}
        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 className="w-8 h-8 mx-auto mb-2 text-cyan-400 animate-spin" />
            <p className="text-xs">Đang tải danh sách ca thi...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <Calendar className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-300">Không có ca thi nào phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1">Vui lòng thay đổi từ khóa hoặc bộ lọc tìm kiếm.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(s => (
              <div
                key={s._id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                        {s.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.examType === 'ONLINE_QUIZ'
                          ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          : s.examType === 'BYOD_LAPTOP'
                          ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                          : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {s.examType === 'ONLINE_QUIZ' ? '⚡ QUIZ' : s.examType === 'BYOD_LAPTOP' ? '💻 BYOD' : '🖥️ LAB'}
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.gradingStatus === 'PUBLISHED'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : s.status === 'IN_PROGRESS'
                        ? 'bg-cyan-500/10 text-cyan-400 animate-pulse'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {s.gradingStatus === 'PUBLISHED' ? 'ĐÃ CÔNG BỐ ĐIỂM' : s.status === 'IN_PROGRESS' ? 'ĐANG THI' : 'LÊN LỊCH'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
                    {s.title}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Môn học:</span>
                      <span className="text-slate-200 font-medium">{s.subject?.name || 'Kỹ thuật lập trình'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Phòng thi:</span>
                      <span className="text-slate-200 font-bold">{s.room?.code} ({s.room?.capacity} bàn)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Thời lượng:</span>
                      <span className="text-slate-200">{s.durationMinutes} phút</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Cán bộ coi thi:</span>
                      <span className="text-slate-200">{s.proctor1?.fullName || 'ThS. Nguyễn Văn Giảng'}</span>
                    </div>
                  </div>
                </div>

                {/* 3 Nút nghiệp vụ */}
                <div className="space-y-2 pt-4 border-t border-slate-800/80 mt-4 text-xs font-semibold">
                  <button
                    onClick={() => navigate('/take-exam')}
                    className="w-full py-2 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl transition flex items-center justify-center space-x-1.5 shadow-md shadow-cyan-600/20"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Làm Bài Thi Quiz</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(`/live-proctor/${s._id}`)}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl transition flex items-center justify-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Phòng 3D Live</span>
                    </button>

                    <button
                      onClick={() => navigate(`/grading-review/${s._id}`)}
                      className="p-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl transition flex items-center justify-center space-x-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Rà Soát Điểm</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

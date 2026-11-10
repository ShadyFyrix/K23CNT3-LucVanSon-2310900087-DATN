import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Newspaper, Pin, Heart, MessageSquare, Send, Plus, Search, Filter,
  Share2, Shield, Building2, Users, User, Check, X, Paperclip,
  Megaphone, Award, FileText, Calendar, Sparkles, AlertCircle,
  ChevronDown, ChevronUp, Eye, ExternalLink, GraduationCap, Clock
} from 'lucide-react';
import { apiClient } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string; badge: string }> = {
  announcement: { label: 'Thông báo khảo thí & Lịch thi', icon: Megaphone, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60', badge: 'bg-amber-500' },
  event: { label: 'Sự kiện thi & Hướng dẫn', icon: Calendar, color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60', badge: 'bg-sky-500' },
  policy: { label: 'Quy chế thi & Kỷ luật phòng thi', icon: FileText, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60', badge: 'bg-emerald-500' },
  recognition: { label: 'Công bố điểm & Khen thưởng', icon: Award, color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60', badge: 'bg-rose-500' },
  general: { label: 'Tin tức chung', icon: Newspaper, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60', badge: 'bg-indigo-500' }
};

const DEPARTMENTS = [
  { id: 'examination', label: 'Phòng Khảo thí' },
  { id: 'academic', label: 'Phòng Đào tạo' },
  { id: 'it', label: 'Ban Công nghệ & AI' },
  { id: 'faculty', label: 'Khoa chuyên môn' },
  { id: 'general', label: 'Toàn hệ thống' }
];

export default function Newsfeed() {
  const navigate = useNavigate();
  const { user, can, hasRole } = useAuth();
  const canCreatePost = hasRole('admin') || hasRole('superadmin') || hasRole('academic') || hasRole('teacher') || can('create_post');
  const isManager = hasRole('admin') || hasRole('superadmin') || hasRole('academic') || hasRole('teacher');

  const [posts, setPosts] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 1 thời điểm chỉ cho phép mở rộng 1 bản tin duy nhất để đọc
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category: 'announcement',
    isPinned: false,
    targetType: 'all',
    targetDepartments: [] as string[],
    targetRoles: [] as string[],
    targetUsers: [] as string[],
    attachmentUrl: '',
    actionLink: '',
    actionText: '',
    examSessionCode: ''
  });

  // Comment Inputs state for each post
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resPosts, resRoles, resUsers] = await Promise.all([
        apiClient.get(`/posts?category=${activeCategory}&search=${searchTerm}`).catch(() => ({ data: { success: true, data: [] } })),
        apiClient.get('/roles').catch(() => ({ data: { data: [] } })),
        apiClient.get('/users').catch(() => ({ data: { data: [] } }))
      ]);

      if (resPosts.data?.success && Array.isArray(resPosts.data.data)) {
        setPosts(resPosts.data.data);
      }
      if (resRoles.data?.data) {
        setRoles(resRoles.data.data);
      }
      if (resUsers.data?.data) {
        setUsersList(resUsers.data.data);
      }
    } catch (_) {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, searchTerm]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.title.trim() || !newPost.content.trim()) {
      return toast.error("Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo");
    }

    try {
      setSubmitting(true);
      const payload = {
        ...newPost,
        attachments: newPost.attachmentUrl ? [newPost.attachmentUrl] : []
      };

      const res = await apiClient.post('/posts', payload);
      if (res.data.success) {
        toast.success("Đã đăng thông báo khảo thí & học vụ thành công!");
        setIsCreateModalOpen(false);
        setNewPost({
          title: '',
          content: '',
          category: 'announcement',
          isPinned: false,
          targetType: 'all',
          targetDepartments: [],
          targetRoles: [],
          targetUsers: [],
          attachmentUrl: '',
          actionLink: '',
          actionText: '',
          examSessionCode: ''
        });
        fetchData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể đăng bản tin");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      const res = await apiClient.post(`/posts/${postId}/like`);
      if (res.data.success) {
        setPosts(prev => prev.map(p => {
          if (p._id === postId) {
            const userId = user?._id || (user as any)?.id;
            const currentLikes = p.likes || [];
            const hasLiked = currentLikes.some((u: any) => (u._id || u).toString() === userId?.toString());
            const newLikes = hasLiked
              ? currentLikes.filter((u: any) => (u._id || u).toString() !== userId?.toString())
              : [...currentLikes, userId];
            return { ...p, likes: newLikes };
          }
          return p;
        }));
      }
    } catch (err) {
      toast.error("Lỗi tương tác bài viết");
    }
  };

  const handleTogglePin = async (postId: string, currentStatus: boolean) => {
    try {
      const res = await apiClient.put(`/posts/${postId}`, { isPinned: !currentStatus });
      if (res.data.success) {
        toast.success(!currentStatus ? "Đã ghim bài viết lên đầu trang" : "Đã bỏ ghim bài viết");
        fetchData();
      }
    } catch (err) {
      toast.error("Không thể thay đổi trạng thái ghim");
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId];
    if (!text || !text.trim()) return;

    try {
      const res = await apiClient.post(`/posts/${postId}/comments`, { content: text });
      if (res.data.success) {
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
        setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: res.data.data } : p));
        toast.success("Đã đăng bình luận");
      }
    } catch (err) {
      toast.error("Không thể đăng bình luận");
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Xác nhận xóa thông báo này?")) return;
    try {
      const res = await apiClient.delete(`/posts/${postId}`);
      if (res.data.success) {
        toast.success("Đã xóa thông báo");
        if (expandedPostId === postId) setExpandedPostId(null);
        fetchData();
      }
    } catch (err) {
      toast.error("Không thể xóa thông báo");
    }
  };

  const toggleExpandPost = (postId: string) => {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
    }
  };

  const applyTemplate = (type: 'schedule' | 'grade' | 'policy') => {
    if (type === 'schedule') {
      setNewPost({
        title: '[KHẢO THÍ] Lịch Thi Học Kỳ 1 & Kế Hoạch Vận Hành Buồng Thi 3D Biometric AI',
        content: `Hội đồng Khảo thí thông báo chính thức Thời khóa biểu thi Kết thúc Học phần KHKT Học kỳ 1. Tất cả thí sinh và cán bộ coi thi bắt buộc tuân thủ quy trình kiểm định sinh trắc học Face ID trước giờ mở phòng 15 phút.\n\n📌 Yêu cầu trọng tâm:\n1. Thí sinh mang thẻ sinh viên hoặc CCCD gắn chip để đối soát tại cửa buồng thi.\n2. Kiểm tra tài khoản ExamGuard AI trên Cổng sinh viên, kiểm tra trạng thái KYC đã hoàn tất hay chưa.\n3. Đúng giờ G, hệ thống sẽ mở cổng làm bài và kích hoạt giám thị AI đa góc.`,
        category: 'announcement',
        isPinned: true,
        targetType: 'all',
        targetDepartments: [],
        targetRoles: [],
        targetUsers: [],
        attachmentUrl: '',
        actionLink: '/exam-sessions',
        actionText: 'Xem Lịch Thi & Sơ Đồ Phòng Máy [Gantt]',
        examSessionCode: 'CA-20261025-P302-300'
      });
    } else if (type === 'grade') {
      setNewPost({
        title: '[CÔNG BỐ ĐIỂM] Bảng Điểm Thi & Đáp Án Học Phần Kỹ Thuật Lập Trình (KTLT)',
        content: `Bộ môn Kỹ thuật Lập trình đã hoàn tất công tác chấm trắc nghiệm tự động và rọc phách điểm thi thực hành ca thi kết thúc học phần.\n\n📊 Thống kê sơ bộ ca thi:\n• Điểm trung bình: 7.85 / 10.00\n• Tỷ lệ đạt (>= 5.0): 94.2%\n• Điểm cao nhất: 10.00 (Thí sinh Nguyễn Công Tùng & Lục Văn Sơn)\n• Uy tín AI trung bình: 98/100 (Không phát hiện gian lận nghiêm trọng)\n\nSinh viên vui lòng bấm nút "Tra Cứu Bảng Điểm & Đáp Án Chi Tiết" bên dưới để đối chiếu bài làm, thang điểm chi tiết. Hạn chót gửi đơn phúc khảo trực tuyến: 17/11/2026.`,
        category: 'recognition',
        isPinned: true,
        targetType: 'all',
        targetDepartments: [],
        targetRoles: [],
        targetUsers: [],
        attachmentUrl: '',
        actionLink: '/exam/result?view=student',
        actionText: 'Tra Cứu Bảng Điểm & Đáp Án Chi Tiết',
        examSessionCode: 'CA-20261025-P302-300'
      });
    } else if (type === 'policy') {
      setNewPost({
        title: '[QUY CHẾ] Quy Định Phòng Thi Chuẩn Zero-Trust & Chế Tài Xử Lý Gian Lận AI',
        content: `Ban Giám thị Khảo thí ban hành Quyết định số 482/QĐ-KT về việc áp dụng Giám thị Đa tầng AI (Edge CCTV + Face Verification 5 góc):\n\n🚫 Các hành vi vi phạm sẽ bị hệ thống tự động ghi biên bản điện tử và trừ điểm uy tín (Trust Score):\n1. Quay đầu góc nghiêng quá 35 độ kéo dài trên 5 giây.\n2. Xuất hiện khuôn mặt thứ hai hoặc vắng mặt khỏi vùng quét camera.\n3. Chuyển tab trình duyệt hoặc kết nối màn hình phụ / USB không hợp lệ.\n4. Sử dụng tai nghe bluetooth hoặc thiết bị ngoại vi trái phép.`,
        category: 'policy',
        isPinned: false,
        targetType: 'all',
        targetDepartments: [],
        targetRoles: [],
        targetUsers: [],
        attachmentUrl: '',
        actionLink: '/student',
        actionText: 'Xem Quy Chế Phòng Thi SEB',
        examSessionCode: ''
      });
    }
  };

  const pinnedPosts = posts.filter(p => p.isPinned);

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
      className="space-y-6 max-w-5xl mx-auto pb-16 font-sans select-none"
    >
      {/* ─── 1. BENTO HERO HEADER STAGE ─── */}
      <motion.div
        variants={itemVariants}
        className="eg-hero-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full eg-glass-pill shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-[var(--color-azure)]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--color-azure)]">
              Truyền Thông & Quy Chế Khảo Thí
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Bản Tin & <span className="eg-text-gradient">Quy Chế Thi Cử</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
            Cập nhật thông báo khảo thí, thời khóa biểu thi chính thức và các quy định kỷ luật phòng thi công nghệ cao ExamGuard AI.
          </p>
        </div>

        {canCreatePost && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="eg-btn-gradient px-5 py-2.5 flex items-center gap-2 text-xs font-bold cursor-pointer active:scale-95 shadow-md shrink-0 text-white rounded-xl"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Đăng thông báo mới</span>
          </button>
        )}
      </motion.div>

      {/* ─── 2. PINNED ANNOUNCEMENT BANNER ─── */}
      {pinnedPosts.length > 0 && (
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-[var(--color-azure)] uppercase tracking-widest px-1">
            <Pin className="w-4 h-4 fill-[var(--color-azure)] text-[var(--color-azure)]" /> Thông báo Ghim Nổi Bật ({pinnedPosts.length})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pinnedPosts.map(post => (
              <div key={post._id} className="eg-cyber-card p-6 border-[var(--color-electric)]/40 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="eg-glass-pill text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider flex items-center gap-1 text-[var(--color-azure)]">
                      <Pin className="w-3 h-3 fill-[var(--color-azure)]" /> TIN NỔI BẬT
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-bold font-mono">
                      {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mb-2 leading-snug">{post.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-xs line-clamp-2 leading-relaxed whitespace-pre-line font-medium">{post.content}</p>
                </div>

                {post.actionLink && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10">
                    <button
                      onClick={() => navigate(post.actionLink)}
                      className="w-full eg-btn-gradient py-2 px-3 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                    >
                      <span>{post.actionText || 'Xem Ngay'}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[var(--color-electric)] to-[var(--color-azure)] text-white font-bold flex items-center justify-center text-xs">
                      {post.author?.fullName?.charAt(0) || 'A'}
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{post.author?.fullName || 'Hội đồng Khảo thí'}</span>
                  </div>
                  <button
                    onClick={() => {
                      setExpandedPostId(post._id);
                      setTimeout(() => {
                        const el = document.getElementById(`post-${post._id}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="text-xs font-bold text-[var(--color-azure)] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Đọc bản tin <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── 3. FILTER TABS & SEARCH ─── */}
      <motion.div variants={itemVariants} className="eg-cyber-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              activeCategory === 'all' ? 'eg-glass-pill shadow-xs text-[var(--color-azure)]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Tất cả bài viết ({posts.length})
          </button>
          {Object.entries(CATEGORY_MAP).map(([key, item]) => {
            const Icon = item.icon;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeCategory === key ? 'eg-glass-pill shadow-xs text-[var(--color-azure)]' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm thông báo, điểm thi..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full pl-10 pr-4 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-[var(--color-electric)] outline-none transition-all"
          />
        </div>
      </motion.div>

      {/* ─── 4. POSTS LIST (ACCORDION SINGLE EXPANDED) ─── */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="w-10 h-10 border-4 border-[var(--color-electric)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : posts.length === 0 ? (
        <div className="eg-cyber-card p-12 text-center border-dashed border-slate-300 dark:border-white/20 space-y-3">
          <Newspaper className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto" />
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-base">Chưa có thông báo khảo thí nào</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Hội đồng khảo thí và Giảng viên chưa đăng thông báo lịch thi hoặc công bố điểm. Bạn có thể bấm "Đăng thông báo mới" để tạo bài viết.
          </p>
          {canCreatePost && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="eg-btn-gradient px-4 py-2 rounded-xl text-xs font-black text-white inline-flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer mt-2"
            >
              <Plus className="w-4 h-4" /> Tạo thông báo đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map(post => {
            const cat = CATEGORY_MAP[post.category] || CATEGORY_MAP.general;
            const CategoryIcon = cat.icon;
            const userId = user?._id || (user as any)?.id;
            const isLiked = (post.likes || []).some((u: any) => (u._id || u).toString() === userId?.toString());
            const commentsList = post.comments || [];
            const isExpanded = expandedPostId === post._id;
            const isAuthor = userId && (post.author?._id || post.author)?.toString() === userId?.toString();

            return (
              <article
                id={`post-${post._id}`}
                key={post._id}
                className={`eg-cyber-card transition-all duration-300 ${
                  isExpanded ? 'border-[var(--color-electric)] ring-2 ring-[var(--color-electric)]/20 shadow-xl' : 'hover:border-slate-300 dark:hover:border-white/20'
                }`}
              >
                {/* Author Header */}
                <div className="p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[var(--color-electric)] to-[var(--color-azure)] text-white font-black flex items-center justify-center text-base shadow-md shrink-0">
                      {post.author?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-slate-900 dark:text-white text-sm leading-tight">
                          {post.author?.fullName || 'Hội đồng Khảo thí'}
                        </h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${cat.color} flex items-center gap-1`}>
                          <CategoryIcon className="w-3 h-3" />
                          {cat.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium mt-0.5">
                        {post.author?.email || 'khao-thi@examguard.edu.vn'} · {new Date(post.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Target Audience Badge */}
                    <span className="hidden sm:flex text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full border border-slate-200 dark:border-white/10 items-center gap-1">
                      {post.targetType === 'all' && <><Users className="w-3 h-3 text-emerald-500" /> Toàn trường</>}
                      {post.targetType === 'department' && <><Building2 className="w-3 h-3 text-indigo-500" /> Khoa CNTT</>}
                      {post.targetType === 'roles' && <><Shield className="w-3 h-3 text-amber-500" /> Theo vai trò</>}
                      {post.targetType === 'users' && <><User className="w-3 h-3 text-purple-500" /> Chỉ định</>}
                    </span>

                    {/* Pin/Unpin Button for Manager */}
                    {isManager && (
                      <button
                        onClick={() => handleTogglePin(post._id, Boolean(post.isPinned))}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          post.isPinned
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                            : 'text-slate-400 hover:text-amber-500 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                        title={post.isPinned ? "Bỏ ghim" : "Ghim bài viết"}
                      >
                        <Pin className={`w-4 h-4 ${post.isPinned ? 'fill-amber-500' : ''}`} />
                      </button>
                    )}

                    {/* Delete button */}
                    {(isAuthor || hasRole('admin') || hasRole('superadmin')) && (
                      <button
                        onClick={() => handleDeletePost(post._id)}
                        className="text-slate-400 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                        title="Xóa bài"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* POST CONTENT BODY (COLLAPSED PREVIEW VS EXPANDED) */}
                <div className="px-6 pb-4 space-y-3">
                  <h3
                    onClick={() => toggleExpandPost(post._id)}
                    className="text-lg font-black text-slate-900 dark:text-white leading-snug cursor-pointer hover:text-[var(--color-azure)] transition-colors"
                  >
                    {post.title}
                  </h3>

                  {isExpanded ? (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-line font-medium bg-slate-50 dark:bg-white/[0.03] p-4 rounded-2xl border border-slate-200/60 dark:border-white/10">
                        {post.content}
                      </div>

                      {/* Attachments */}
                      {post.attachments && post.attachments.length > 0 && (
                        <div className="pt-2 flex flex-wrap gap-2">
                          {post.attachments.map((url: string, idx: number) => (
                            <a
                              key={idx}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all shadow-sm"
                            >
                              <Paperclip className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Tệp đính kèm #{idx + 1}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => toggleExpandPost(post._id)}
                      className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed font-medium line-clamp-2 cursor-pointer hover:text-slate-900 dark:hover:text-white"
                    >
                      {post.content}
                    </div>
                  )}

                  {/* DIRECT ACTION CTA BUTTON FOR EXAM SESSIONS / GRADE LOOKUP */}
                  {post.actionLink && (
                    <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-r from-slate-100/90 to-slate-50/90 dark:from-white/[0.04] dark:to-white/[0.01] border border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[var(--color-azure)] shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            Hành động trực tiếp: {post.actionText || 'Tra cứu ngay'}
                          </div>
                          {post.examSessionCode && (
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              Mã ca thi: <span className="text-[var(--color-azure)] font-bold">{post.examSessionCode}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(post.actionLink)}
                        className="eg-btn-gradient px-4 py-2 rounded-xl text-xs font-black text-white flex items-center justify-center gap-2 shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shrink-0"
                      >
                        <span>{post.actionText || 'Truy Cập Ngay'}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* BOTTOM FOOTER WITH SINGLE EXPAND/COLLAPSE ACTION */}
                <div className="px-6 py-3 bg-slate-50/80 dark:bg-white/[0.02] border-t border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleLike(post._id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        isLiked
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                          : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                      <span>{post.likes?.length || 0} Yêu thích</span>
                    </button>

                    <button
                      onClick={() => toggleExpandPost(post._id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-[var(--color-azure)]" />
                      <span>{commentsList.length} Bình luận</span>
                    </button>
                  </div>

                  {/* BUTTON XEM THÊM (READ MORE / COLLAPSE) */}
                  <button
                    onClick={() => toggleExpandPost(post._id)}
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                      isExpanded
                        ? 'bg-slate-200 dark:bg-white/10 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-white/20'
                        : 'eg-btn-gradient text-white shadow-md'
                    }`}
                  >
                    {isExpanded ? (
                      <>Thu gọn <ChevronUp className="w-4 h-4 stroke-[3]" /></>
                    ) : (
                      <>Xem chi tiết <ChevronDown className="w-4 h-4 stroke-[3]" /></>
                    )}
                  </button>
                </div>

                {/* COMMENTS THREAD (ONLY RENDERED WHEN EXPANDED) */}
                {isExpanded && (
                  <div className="bg-slate-50/80 dark:bg-white/[0.02] p-6 border-t border-slate-200 dark:border-white/10 space-y-4 animate-in fade-in duration-300">
                    <h4 className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-[var(--color-azure)]" /> Ý kiến trao đổi & giải đáp ({commentsList.length})
                    </h4>

                    {/* Add Comment */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-electric)] to-[var(--color-azure)] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                        {user?.fullName?.charAt(0) || 'U'}
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          placeholder="Viết thắc mắc hoặc phản hồi của bạn..."
                          value={commentInputs[post._id] || ''}
                          onChange={e => setCommentInputs({ ...commentInputs, [post._id]: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddComment(post._id); }}
                          className="flex-1 bg-white dark:bg-[#141527] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[var(--color-electric)] shadow-xs"
                        />
                        <button
                          onClick={() => handleAddComment(post._id)}
                          className="eg-btn-gradient text-white p-2.5 rounded-2xl transition-all shadow-md shrink-0 cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Comments Thread */}
                    <div className="space-y-3">
                      {commentsList.map((c: any, idx: number) => (
                        <div key={idx} className="flex gap-3 bg-white dark:bg-[#141527] p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-white/10 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                            {c.user?.fullName?.charAt(0) || 'U'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">{c.user?.fullName || 'Thành viên'}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{new Date(c.createdAt).toLocaleString('vi-VN')}</span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-medium leading-relaxed">{c.content}</p>
                          </div>
                        </div>
                      ))}
                      {commentsList.length === 0 && (
                        <p className="text-xs text-slate-400 italic text-center py-2">Chưa có bình luận nào. Hãy gửi ý kiến của bạn!</p>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ─── 5. CREATE POST MODAL (FOR LECTURER / ADMIN) ─── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B0C1E] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-2xl w-full p-6 space-y-6 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-[var(--color-azure)]" /> Đăng Thông Báo Khảo Thí & Học Vụ
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Đăng thông báo lịch thi, công bố bảng điểm, hoặc phổ biến quy chế thi cho toàn trường.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-500 dark:text-slate-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QUICK TEMPLATE SELECTION FOR LECTURERS & ADMIN */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-2">
              <label className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-azure)]" /> Chọn nhanh biểu mẫu thông báo:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => applyTemplate('schedule')}
                  className="p-2.5 rounded-xl text-left border border-amber-300 dark:border-amber-700/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>📢 Lịch Thi Học Kỳ</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('grade')}
                  className="p-2.5 rounded-xl text-left border border-rose-300 dark:border-rose-700/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  <Award className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>🎓 Công Bố Bảng Điểm</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate('policy')}
                  className="p-2.5 rounded-xl text-left border border-emerald-300 dark:border-emerald-700/50 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  <FileText className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>📄 Quy Chế Phòng Thi</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase mb-1.5">
                  Tiêu đề thông báo *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ví dụ: [KHẢO THÍ] Lịch Thi KTHP Kỹ thuật lập trình Học kỳ 1..."
                  value={newPost.title}
                  onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-[var(--color-electric)]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase mb-1.5">Chuyên mục</label>
                  <select
                    value={newPost.category}
                    onChange={e => setNewPost({ ...newPost, category: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-[#141527] border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none"
                  >
                    {Object.entries(CATEGORY_MAP).map(([k, v]) => (
                      <option key={k} value={k} className="dark:bg-[#141527]">{v.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newPost.isPinned}
                      onChange={e => setNewPost({ ...newPost, isPinned: e.target.checked })}
                      className="w-5 h-5 rounded-lg text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-xs font-black text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Pin className="w-4 h-4 fill-amber-500" /> Ghim bài viết lên đầu trang
                    </span>
                  </label>
                </div>
              </div>

              {/* ACTION LINK / EXAM SESSION INTEGRATION */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 space-y-3">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 uppercase flex items-center gap-2">
                  <ExternalLink className="w-4 h-4 text-[var(--color-azure)]" /> Nút Điều Hướng Trực Tiếp (Action CTA)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Đường dẫn liên kết:</span>
                    <input
                      type="text"
                      placeholder="/exam-sessions hoặc /exam/result"
                      value={newPost.actionLink}
                      onChange={e => setNewPost({ ...newPost, actionLink: e.target.value })}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Tên nút bấm:</span>
                    <input
                      type="text"
                      placeholder="Xem Lịch Thi / Tra Cứu Điểm"
                      value={newPost.actionText}
                      onChange={e => setNewPost({ ...newPost, actionText: e.target.value })}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">Mã ca thi (nếu có):</span>
                    <input
                      type="text"
                      placeholder="CA-20261025-P302-300"
                      value={newPost.examSessionCode}
                      onChange={e => setNewPost({ ...newPost, examSessionCode: e.target.value })}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase mb-1.5">Nội dung chi tiết *</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Nhập nội dung thông báo, thời gian, phòng thi hoặc hướng dẫn làm bài..."
                  value={newPost.content}
                  onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-xs font-medium text-slate-900 dark:text-white outline-none focus:border-[var(--color-electric)]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase mb-1.5">Link tài liệu đính kèm (nếu có)</label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={newPost.attachmentUrl}
                  onChange={e => setNewPost({ ...newPost, attachmentUrl: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-white/10 font-bold text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-200 dark:hover:bg-white/20 transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] py-3 eg-btn-gradient text-white font-black rounded-2xl shadow-lg uppercase tracking-wider text-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Đang xuất bản..." : "Xuất Bản Thông Báo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  FolderOpen,
  Plus,
  Search,
  FileText,
  Image as ImageIcon,
  FileVideo,
  MoreVertical,
  Download,
  Trash2,
  Share2,
  Clock,
  HardDrive,
  Upload,
  FolderPlus,
  X,
  Save,
  ChevronRight,
  Eye,
  EyeOff,
  User,
  Users,
  Edit2
} from 'lucide-react';
import { Modal } from '../components/Modal';
import { apiClient } from '../api/apiClient';
import { useAuthStore } from '../store/useAuthStore';
import { toast } from 'react-hot-toast';

interface Resource {
  _id: string;
  name: string;
  type: 'pdf' | 'doc' | 'image' | 'video' | 'folder' | 'other';
  size?: number;
  mimeType?: string;
  isFolder: boolean;
  parent: string | null;
  owner: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
  };
  visibility: 'public' | 'private' | 'shared';
  sharedWith: Array<{
    _id: string;
    fullName: string;
    email: string;
  }>;
  updatedAt: string;
  createdAt: string;
}

interface UserListItem {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string;
}

export default function Resources() {
  const { user: currentUser } = useAuthStore();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Navigation & Folder structure
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string | null; name: string }>>([
    { id: null, name: 'Tài liệu hệ thống' }
  ]);

  // System users list for sharing
  const [systemUsers, setSystemUsers] = useState<UserListItem[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  // Modals state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Form states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);

  // New folder / upload state
  const [visibility, setVisibility] = useState<'public' | 'private' | 'shared'>('public');
  const [sharedUsers, setSharedUsers] = useState<string[]>([]); // Array of user IDs

  // Edit resource state
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editName, setEditName] = useState('');
  const [editVisibility, setEditVisibility] = useState<'public' | 'private' | 'shared'>('public');
  const [editSharedUsers, setEditSharedUsers] = useState<string[]>([]);

  // Item dropdown menu tracking
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Fetch documents/folders
  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/resources', {
        params: {
          parent: currentFolderId || 'null',
          search: searchTerm
        }
      });
      if (res.data && res.data.success) {
        setResources(res.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Không thể tải tài liệu');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for sharing
  const fetchUsers = async () => {
    try {
      const res = await apiClient.get('/users', { params: { limit: 1000 } });
      if (res.data && res.data.data) {
        // Lọc bỏ user hiện tại khỏi danh sách chia sẻ
        const filteredUsers = res.data.data.filter((u: any) => u._id !== currentUser?._id);
        setSystemUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách nhân viên:', error);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [currentFolderId, searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleOutsideClick = () => setActiveMenuId(null);
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleOpenFolder = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = breadcrumbs[index];
    setCurrentFolderId(target.id);
    setBreadcrumbs(breadcrumbs.slice(0, index + 1));
  };

  // File size formatter
  const formatBytes = (bytes?: number) => {
    if (bytes === undefined || bytes === null) return '--';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileText className="w-8 h-8 text-rose-500" />;
      case 'doc': return <FileText className="w-8 h-8 text-blue-500" />;
      case 'image': return <ImageIcon className="w-8 h-8 text-emerald-500" />;
      case 'video': return <FileVideo className="w-8 h-8 text-amber-500" />;
      case 'folder': return <FolderOpen className="w-8 h-8 text-amber-400" />;
      default: return <FileText className="w-8 h-8 text-slate-400" />;
    }
  };

  // Create Folder
  const handleCreateFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const folderName = formData.get('folderName') as string;

    if (!folderName.trim()) return;

    try {
      const res = await apiClient.post('/resources/folder', {
        name: folderName,
        parent: currentFolderId,
        visibility,
        sharedWith: visibility === 'shared' ? sharedUsers : []
      });

      if (res.data && res.data.success) {
        toast.success('Tạo thư mục thành công');
        setIsFolderModalOpen(false);
        // Reset states
        setVisibility('public');
        setSharedUsers([]);
        setSearchUserQuery('');
        fetchResources();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi tạo thư mục');
    }
  };

  // File select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Upload File
  const handleUploadFile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Vui lòng chọn một tệp tin');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const displayName = (formData.get('fileName') as string) || selectedFile.name;

    const postData = new FormData();
    postData.append('file', selectedFile);
    postData.append('name', displayName);
    postData.append('visibility', visibility);
    if (currentFolderId) {
      postData.append('parent', currentFolderId);
    }
    if (visibility === 'shared') {
      postData.append('sharedWith', JSON.stringify(sharedUsers));
    }

    setUploadProgress(true);
    try {
      const res = await apiClient.post('/resources/upload', postData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data && res.data.success) {
        toast.success('Tải lên tài liệu thành công');
        setIsUploadModalOpen(false);
        setSelectedFile(null);
        setVisibility('public');
        setSharedUsers([]);
        setSearchUserQuery('');
        fetchResources();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi tải lên tệp tin');
    } finally {
      setUploadProgress(false);
    }
  };

  // Download File securely
  const handleDownload = async (resource: Resource) => {
    toast.loading('Đang chuẩn bị tải về...', { id: 'download' });
    try {
      const response = await apiClient.get(`/resources/download/${resource._id}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', resource.name);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      toast.success('Tải về thành công', { id: 'download' });
    } catch (error: any) {
      console.error(error);
      toast.error('Lỗi tải tệp tin hoặc bạn không có quyền truy cập', { id: 'download' });
    }
  };

  // Delete Resource
  const handleDeleteResource = async (id: string, name: string, isFolder: boolean) => {
    const confirmMsg = isFolder 
      ? `Bạn có chắc chắn muốn xóa thư mục "${name}" và toàn bộ tệp tin, thư mục con bên trong không? Hành động này không thể hoàn tác.`
      : `Bạn có chắc chắn muốn xóa tài liệu "${name}" không?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await apiClient.delete(`/resources/${id}`);
      if (res.data && res.data.success) {
        toast.success('Đã xóa tài liệu');
        fetchResources();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi xóa tài liệu');
    }
  };

  // Open edit modal
  const handleOpenEditModal = (resource: Resource) => {
    setEditingResource(resource);
    setEditName(resource.name);
    setEditVisibility(resource.visibility);
    setEditSharedUsers(resource.sharedWith?.map(u => u._id) || []);
    setIsEditModalOpen(true);
  };

  // Edit (Rename & Change Privacy)
  const handleEditResource = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingResource) return;

    try {
      const res = await apiClient.put(`/resources/${editingResource._id}`, {
        name: editName,
        visibility: editVisibility,
        sharedWith: editVisibility === 'shared' ? editSharedUsers : []
      });

      if (res.data && res.data.success) {
        toast.success('Cập nhật tài liệu thành công');
        setIsEditModalOpen(false);
        setEditingResource(null);
        fetchResources();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Lỗi khi cập nhật tài liệu');
    }
  };

  // User sharing toggle helper
  const toggleSharedUser = (userId: string, isEdit: boolean = false) => {
    if (isEdit) {
      if (editSharedUsers.includes(userId)) {
        setEditSharedUsers(editSharedUsers.filter(id => id !== userId));
      } else {
        setEditSharedUsers([...editSharedUsers, userId]);
      }
    } else {
      if (sharedUsers.includes(userId)) {
        setSharedUsers(sharedUsers.filter(id => id !== userId));
      } else {
        setSharedUsers([...sharedUsers, userId]);
      }
    }
  };

  // Visibility text mapper
  const getVisibilityLabel = (vis: string, count: number) => {
    switch (vis) {
      case 'public': return <span className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> Công khai</span>;
      case 'private': return <span className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 rounded-full flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" /> Cá nhân</span>;
      case 'shared': return <span className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 rounded-full flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Đã chia sẻ ({count})</span>;
      default: return null;
    }
  };

  // Filtering users based on query
  const filteredUsers = systemUsers.filter(u => 
    u.fullName.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

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
            <FolderOpen className="w-3.5 h-3.5 text-[var(--color-azure)]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--color-azure)]">
              Kho Học Liệu & Quy Định Khảo Thí
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Tài Liệu & <span className="eg-text-gradient">Chính Sách Khảo Thí</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
            Lưu trữ, quản lý văn bản quy chế, đề thi mẫu và tài nguyên phục vụ công tác tổ chức thi an toàn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setVisibility('public');
              setSharedUsers([]);
              setIsFolderModalOpen(true);
            }}
            className="eg-glass-pill px-4 py-2.5 flex items-center gap-2 text-xs font-bold cursor-pointer active:scale-95 shadow-sm"
          >
            <FolderPlus className="w-4 h-4 text-[var(--color-azure)]" />
            <span>Tạo thư mục</span>
          </button>
          <button
            onClick={() => {
              setSelectedFile(null);
              setVisibility('public');
              setSharedUsers([]);
              setIsUploadModalOpen(true);
            }}
            className="eg-btn-gradient px-5 py-2.5 flex items-center gap-2 text-xs font-bold cursor-pointer active:scale-95 shadow-md"
          >
            <Upload className="w-4 h-4 stroke-[3]" />
            <span>Tải lên tài liệu</span>
          </button>
        </div>
      </motion.div>

      {/* ─── 2. DIRECTORY NAVIGATION (BREADCRUMBS) ─── */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-white/95 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl p-3.5 px-5 rounded-2xl border border-slate-200/80 dark:border-white/10 overflow-x-auto whitespace-nowrap shadow-sm"
      >
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
            <button
              onClick={() => handleBreadcrumbClick(idx)}
              className={`hover:text-[var(--color-azure)] font-bold transition-colors cursor-pointer ${
                idx === breadcrumbs.length - 1 ? 'text-slate-900 dark:text-white font-extrabold cursor-default' : ''
              }`}
              disabled={idx === breadcrumbs.length - 1}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </motion.div>

      {/* ─── 3. DYNAMIC METRICS INFO CARDS ─── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="eg-cyber-card p-5 flex items-center gap-4">
          <div className="p-3 bg-[var(--color-electric)]/15 text-[var(--color-azure)] rounded-2xl border border-[var(--color-azure)]/30">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Thư mục hiện tại</p>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {resources.filter(r => r.isFolder).length} <span className="text-xs font-sans text-slate-500">thư mục</span>
            </p>
          </div>
        </div>
        <div className="eg-cyber-card p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tài liệu hiện tại</p>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {resources.filter(r => !r.isFolder).length} <span className="text-xs font-sans text-slate-500">tệp tin</span>
            </p>
          </div>
        </div>
        <div className="eg-cyber-card p-5 flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng dung lượng tệp</p>
            <p className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5">
              {formatBytes(resources.reduce((sum, r) => sum + (r.size || 0), 0))}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ─── 4. SEARCH BAR ─── */}
      <motion.div variants={itemVariants} className="bg-white/95 dark:bg-[#0B0C1E]/80 backdrop-blur-2xl p-4 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-lg">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm kiếm trong thư mục này..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#3781fc] outline-none transition-all"
          />
        </div>
      </motion.div>

      {/* ─── 5. DOCUMENTS GRID ─── */}
      {loading ? (
        <div className="flex items-center justify-center p-12 eg-cyber-card">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1951fc]"></div>
          <span className="ml-3 text-xs font-bold text-slate-500">Đang tải tài liệu...</span>
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center p-12 eg-cyber-card flex flex-col items-center justify-center space-y-3">
          <FolderOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 animate-pulse" />
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold">Thư mục trống hoặc không tìm thấy tài liệu phù hợp.</p>
        </div>
      ) : (
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {resources.map((file) => (
            <motion.div
              key={file._id}
              variants={itemVariants}
              whileHover={{ y: -4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="eg-cyber-card overflow-hidden group transition-all relative flex flex-col justify-between"
            >
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div 
                    className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl group-hover:bg-blue-500/10 transition-colors cursor-pointer border border-slate-200/50 dark:border-white/10"
                    onClick={() => file.isFolder && handleOpenFolder(file._id, file.name)}
                  >
                    {getFileIcon(file.type)}
                  </div>
                  
                  {/* Dropdown Menu Trigger */}
                  <div className="relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === file._id ? null : file._id);
                      }}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {activeMenuId === file._id && (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="absolute right-0 mt-1 w-44 bg-white dark:bg-[#0B0C1E] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl z-50 py-1.5 backdrop-blur-xl"
                      >
                        <button
                          onClick={() => {
                            handleOpenEditModal(file);
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                          Chỉnh sửa
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteResource(file._id, file.name, file.isFolder);
                            setActiveMenuId(null);
                          }}
                          className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          Xóa tài liệu
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-1 mb-4">
                  <h3 
                    onClick={() => file.isFolder && handleOpenFolder(file._id, file.name)}
                    className={`font-black text-slate-900 dark:text-white leading-snug truncate cursor-pointer ${file.isFolder ? 'hover:text-blue-600 dark:hover:text-[#3781fc] hover:underline' : ''}`}
                    title={file.name}
                  >
                    {file.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>Tạo bởi: {file.owner?.fullName || 'Hệ thống'}</span>
                  </div>
                </div>

                {/* Privacy Badge */}
                <div className="mb-4">
                  {getVisibilityLabel(file.visibility, file.sharedWith?.length || 0)}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-200/60 dark:border-white/10 pt-3">
                  <div className="flex items-center gap-1">
                    <HardDrive className="w-3.5 h-3.5" />
                    {file.isFolder ? 'Thư mục' : formatBytes(file.size)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(file.updatedAt).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              </div>

              {/* Primary Actions based on file type */}
              <div className="px-5 pb-5 pt-1 bg-slate-50/50 dark:bg-white/[0.02] border-t border-slate-200/60 dark:border-white/10 grid grid-cols-2 gap-2">
                {file.isFolder ? (
                  <button
                    onClick={() => handleOpenFolder(file._id, file.name)}
                    className="col-span-2 flex items-center justify-center gap-2 py-2 bg-blue-500/10 text-blue-700 dark:text-[#cbe9fd] border border-blue-500/20 text-xs font-bold rounded-full hover:bg-blue-500/20 transition-all cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Mở thư mục</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleDownload(file)}
                      className="col-span-1 flex items-center justify-center gap-2 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-full hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải về</span>
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(file)}
                      className="col-span-1 flex items-center justify-center gap-2 py-2 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-full hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Chia sẻ</span>
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
                    >
                      <Download className="w-4 h-4 text-slate-500" />
                      Tải về
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(file)}
                      className="col-span-1 flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl hover:bg-emerald-100 transition-all"
                    >
                      <Share2 className="w-4 h-4 text-emerald-600" />
                      Chia sẻ
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Folder Modal */}
      <Modal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        title="Tạo thư mục mới"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Tên thư mục</label>
            <input
              name="folderName"
              required
              autoFocus
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              placeholder="Ví dụ: Chính sách nhân sự 2026"
            />
          </div>

          {/* Visibility Section */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Quyền riêng tư</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            >
              <option value="public">Công khai (Tất cả nhân viên)</option>
              <option value="private">Cá nhân (Chỉ tôi và Admin)</option>
              <option value="shared">Chia sẻ (Chọn thành viên cụ thể)</option>
            </select>
          </div>

          {/* Share with users selector (Visible only if visibility is 'shared') */}
          {visibility === 'shared' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-bold text-slate-800">Chọn thành viên muốn chia sẻ</label>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc email..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Selected users badges list */}
              {sharedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 py-1">
                  {sharedUsers.map(userId => {
                    const matchedUser = systemUsers.find(u => u._id === userId);
                    return (
                      <span key={userId} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-full">
                        {matchedUser?.fullName || 'Nhân viên'}
                        <button type="button" onClick={() => toggleSharedUser(userId)} className="text-emerald-600 hover:text-emerald-800">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Filtered users list checkboxes */}
              <div className="max-h-48 overflow-y-auto space-y-2 border-t border-slate-200/60 pt-3">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">Không tìm thấy thành viên</p>
                ) : (
                  filteredUsers.map(userItem => (
                    <label key={userItem._id} className="flex items-center gap-3 px-2 py-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={sharedUsers.includes(userItem._id)}
                        onChange={() => toggleSharedUser(userItem._id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{userItem.fullName}</p>
                        <p className="text-xs text-slate-500">{userItem.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsFolderModalOpen(false)}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 eg-btn-gradient text-white font-bold rounded-xl shadow-lg shadow-[var(--accent-glow)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-5 h-5" />
              Tạo thư mục
            </button>
          </div>
        </form>
      </Modal>

      {/* Upload File Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Tải lên tài liệu mới"
      >
        <form onSubmit={handleUploadFile} className="space-y-4">
          
          {/* File Picker Zone */}
          <div 
            onClick={() => document.getElementById('file-input-actual')?.click()}
            className="p-8 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-center space-y-3 hover:border-emerald-500 transition-colors cursor-pointer"
          >
            <input
              type="file"
              id="file-input-actual"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="p-3 bg-white rounded-xl shadow-sm">
              <Upload className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              {selectedFile ? (
                <>
                  <p className="text-sm font-bold text-emerald-600">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{formatBytes(selectedFile.size)}</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-900">Click để chọn tài liệu từ thiết bị</p>
                  <p className="text-xs text-slate-500">Hỗ trợ PDF, DOCX, XLSX, MP4, PNG v.v. (Tối đa 100MB)</p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Tên hiển thị</label>
            <input
              name="fileName"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              placeholder="Nhập tên hiển thị (mặc định lấy tên tệp...)"
              defaultValue={selectedFile ? selectedFile.name : ''}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Quyền riêng tư</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            >
              <option value="public">Công khai (Tất cả nhân viên)</option>
              <option value="private">Cá nhân (Chỉ tôi và Admin)</option>
              <option value="shared">Chia sẻ (Chọn thành viên cụ thể)</option>
            </select>
          </div>

          {/* Share list for Upload */}
          {visibility === 'shared' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-bold text-slate-800">Chọn thành viên muốn chia sẻ</label>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc email..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Selected badges */}
              {sharedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 py-1">
                  {sharedUsers.map(userId => {
                    const matchedUser = systemUsers.find(u => u._id === userId);
                    return (
                      <span key={userId} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-full">
                        {matchedUser?.fullName || 'Nhân viên'}
                        <button type="button" onClick={() => toggleSharedUser(userId)} className="text-emerald-600 hover:text-emerald-800">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Users list */}
              <div className="max-h-48 overflow-y-auto space-y-2 border-t border-slate-200/60 pt-3">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">Không tìm thấy thành viên</p>
                ) : (
                  filteredUsers.map(userItem => (
                    <label key={userItem._id} className="flex items-center gap-3 px-2 py-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={sharedUsers.includes(userItem._id)}
                        onChange={() => toggleSharedUser(userItem._id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{userItem.fullName}</p>
                        <p className="text-xs text-slate-500">{userItem.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(false)}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
              disabled={uploadProgress}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              disabled={uploadProgress}
            >
              {uploadProgress ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Đang tải lên...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Bắt đầu tải lên
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit (Rename & Change Privacy) Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingResource(null);
        }}
        title={`Chỉnh sửa: ${editingResource?.isFolder ? 'Thư mục' : 'Tài liệu'}`}
      >
        <form onSubmit={handleEditResource} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Tên hiển thị</label>
            <input
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              placeholder="Tên hiển thị..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Quyền riêng tư</label>
            <select
              value={editVisibility}
              onChange={(e) => setEditVisibility(e.target.value as any)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            >
              <option value="public">Công khai (Tất cả nhân viên)</option>
              <option value="private">Cá nhân (Chỉ tôi và Admin)</option>
              <option value="shared">Chia sẻ (Chọn thành viên cụ thể)</option>
            </select>
          </div>

          {/* Share list for Edit */}
          {editVisibility === 'shared' && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="text-sm font-bold text-slate-800">Chọn thành viên muốn chia sẻ</label>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên hoặc email..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Selected badges */}
              {editSharedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 py-1">
                  {editSharedUsers.map(userId => {
                    const matchedUser = systemUsers.find(u => u._id === userId);
                    return (
                      <span key={userId} className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-full">
                        {matchedUser?.fullName || 'Nhân viên'}
                        <button type="button" onClick={() => toggleSharedUser(userId, true)} className="text-emerald-600 hover:text-emerald-800">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Users list */}
              <div className="max-h-48 overflow-y-auto space-y-2 border-t border-slate-200/60 pt-3">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-2">Không tìm thấy thành viên</p>
                ) : (
                  filteredUsers.map(userItem => (
                    <label key={userItem._id} className="flex items-center gap-3 px-2 py-1.5 hover:bg-white rounded-lg cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={editSharedUsers.includes(userItem._id)}
                        onChange={() => toggleSharedUser(userItem._id, true)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-800 leading-tight">{userItem.fullName}</p>
                        <p className="text-xs text-slate-500">{userItem.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingResource(null);
              }}
              className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 eg-btn-gradient text-white font-bold rounded-xl shadow-lg shadow-[var(--accent-glow)] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-5 h-5" />
              Lưu thay đổi
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}

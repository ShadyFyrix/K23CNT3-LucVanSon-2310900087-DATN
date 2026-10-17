import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, Mail, Loader2, Fingerprint, ScanFace, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      await login(email, password);
      toast.success('Đăng nhập hệ thống thành công!');
      navigate(from, { replace: true });
    } catch (error: any) {
      const msg = error.response?.data?.message || error.message || 'Mật khẩu hoặc tài khoản không chính xác';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen eg-gradient-bg flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Animated Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl eg-float" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl eg-float" style={{ animationDelay: '3s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/5 rounded-full blur-3xl" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className={`max-w-[440px] w-full relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500 via-cyan-500 to-violet-600 shadow-2xl shadow-sky-500/30 mb-5 relative">
            <ShieldCheck className="w-10 h-10 text-white" strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-slate-900 flex items-center justify-center">
              <ScanFace className="w-3 h-3 text-emerald-900" />
            </div>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            ExamGuard<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-violet-400"> AI</span>
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-medium leading-relaxed">
            Hệ thống Quản lý Thi Trực tuyến<br />
            Tích hợp Xác thực Khuôn mặt bằng AI
          </p>
        </div>

        {/* Login Card */}
        <div className="eg-glass-dark rounded-3xl p-8 md:p-10 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-6 bg-gradient-to-b from-sky-400 to-violet-500 rounded-full" />
            <h2 className="text-lg font-bold text-white">Đăng nhập hệ thống</h2>
          </div>

          {/* Error Alert Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-200">Đăng nhập không thành công</p>
                <p className="mt-0.5 text-rose-300/90 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email đăng nhập
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  className="form-input-dark !pl-12"
                  style={{ paddingLeft: '3rem' }}
                  placeholder="admin@examguard.edu.vn"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mật khẩu
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-sky-400 transition-colors pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  className="form-input-dark !pl-12 !pr-11"
                  style={{ paddingLeft: '3rem', paddingRight: '2.75rem' }}
                  placeholder="••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-sky-500 via-cyan-500 to-sky-600 hover:from-sky-600 hover:via-cyan-600 hover:to-sky-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-sky-500/25 active:scale-[0.98] text-sm flex items-center justify-center gap-2.5 relative overflow-hidden group cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  <span>Đăng nhập</span>
                </>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-700/50 text-center">
            <p className="text-xs text-slate-500 font-medium">
              Quên mật khẩu? <a href="#" className="text-sky-400 font-bold hover:text-sky-300 transition-colors">Liên hệ Quản trị viên</a>
            </p>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 flex items-center justify-center gap-4 text-slate-500">
          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Mã hóa AES-256</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-600" />
          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            <ScanFace className="w-3.5 h-3.5 text-sky-500" />
            <span>Face AI xác thực</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-600" />
          <div className="flex items-center gap-1.5 text-[11px] font-medium">
            <Lock className="w-3.5 h-3.5 text-violet-500" />
            <span>RBAC phân quyền</span>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-600 mt-4 font-medium">
          © 2024 ExamGuard AI · Đồ án Tốt nghiệp
        </p>
      </div>
    </div>
  );
}

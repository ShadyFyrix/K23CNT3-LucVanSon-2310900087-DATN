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
    <div className="min-h-screen bg-[#070814] flex items-center justify-center p-4 font-sans relative overflow-hidden select-none">
      {/* Ambient Radial Glowing Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#1951fc]/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#7c3aed]/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#0b2cb1]/10 rounded-full blur-3xl" />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
        backgroundSize: '40px 40px'
      }} />

      <div className={`max-w-[440px] w-full relative z-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Branding Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#0b2cb1] via-[#1951fc] to-[#7c3aed] shadow-2xl shadow-[#1951fc]/40 mb-4 relative border border-[#cbe9fd]/30">
            <ShieldCheck className="w-8 h-8 text-white" strokeWidth={2.5} />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-[#070814] flex items-center justify-center shadow-[0_0_8px_#34d399]" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            ExamGuard<span className="text-transparent bg-clip-text bg-gradient-to-r from-[#cbe9fd] via-[#3781fc] to-[#7c3aed]"> AI</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1.5 font-medium leading-relaxed">
            Hệ Thống Quản Lý Khảo Thí & Giám Sát AI Zero-Trust
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-[#0B0C1E]/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-gradient-to-b from-[#1951fc] to-[#7c3aed] rounded-full" />
              <h2 className="text-sm font-bold text-white">Đăng nhập tài khoản</h2>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#1951fc]/15 text-[#cbe9fd] border border-[#3781fc]/30">
              v2.6 Core
            </span>
          </div>

          {/* Error Alert Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-rose-200">Đăng nhập không thành công</p>
                <p className="mt-0.5 text-rose-300/90 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#3781fc] transition-colors pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:border-[#3781fc] transition-all text-xs font-medium"
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
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#3781fc] transition-colors pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  className="w-full pl-11 pr-11 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:border-[#3781fc] transition-all text-xs font-medium"
                  placeholder="••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                  title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-[#1951fc] to-[#7c3aed] hover:from-[#3781fc] hover:to-[#8b5cf6] text-white font-bold py-3 rounded-2xl transition-all shadow-[0_4px_16px_rgba(25,81,252,0.4)] active:scale-[0.98] text-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xác thực...</span>
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4" />
                  <span>Đăng Nhập Khảo Thí</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-5 pt-4 border-t border-white/10 space-y-2">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block tracking-wider text-center">
              Tài khoản khảo thí mặc định:
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              <button
                type="button"
                onClick={() => { setEmail('admin@examguard.edu.vn'); setPassword('123456'); }}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#cbe9fd] text-center font-bold cursor-pointer transition truncate"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => { setEmail('anguyen@examguard.edu.vn'); setPassword('123456'); }}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-center font-bold cursor-pointer transition truncate"
              >
                Giảng viên
              </button>
              <button
                type="button"
                onClick={() => { setEmail('son.luc@sinhvien.edu.vn'); setPassword('123456'); }}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-emerald-400 text-center font-bold cursor-pointer transition truncate"
              >
                Sinh viên
              </button>
            </div>
          </div>
        </div>

        {/* Security Badges */}
        <div className="mt-5 flex items-center justify-center gap-3 text-slate-400 text-[11px]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mã hóa AES-256</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <ScanFace className="w-3.5 h-3.5 text-[#3781fc]" />
            <span>ArcFace KYC</span>
          </div>
          <span className="text-white/20">•</span>
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#a855f7]" />
            <span>Zero-Trust</span>
          </div>
        </div>

        <p className="text-center text-[10px] text-slate-400 mt-4 font-mono">
          © 2026 ExamGuard AI · Bản quyền thuộc Basel & Zir Tech
        </p>
      </div>
    </div>
  );
}

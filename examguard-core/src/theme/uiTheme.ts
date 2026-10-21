/**
 * ==============================================================================
 * EXAMGUARD AI — MODULE CẤU HÌNH GIAO DIỆN HỆ THỐNG TẬP TRUNG (UI THEME MODULE)
 * ==============================================================================
 * Để thay đổi màu sắc, kiểu thẻ, banner, bảng hoặc nút bấm trên TOÀN BỘ hệ thống,
 * bạn CHỈ CẦN CHỈNH SỬA TẠI FILE NÀY! Không cần phải đi sửa từng file .tsx riêng lẻ.
 * ==============================================================================
 */

export const uiTheme = {
  // ── 1. KHUNG CHỨA TRANG (PAGE WRAPPER) ──
  page: {
    container: "space-y-6 font-sans pb-12 animate-in fade-in duration-300",
    header: "flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800",
    title: "text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center space-x-3",
    subtitle: "text-xs text-slate-500 dark:text-slate-400 mt-1",
    breadcrumb: "flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 mb-1",
  },

  // ── 2. BANNER ĐẦU TRANG (HERO BANNERS) ──
  banner: {
    // Banner lớn (Dashboard, Bản tin doanh nghiệp, Ngân hàng đề thi)
    // Sáng: Gradient Xanh dương - Indigo hoàng gia sang trọng
    // Tối: Gradient Slate sâu - Xanh thẫm huyền bí
    hero: "relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 dark:from-slate-950 dark:via-[#0c1222] dark:to-slate-900 text-white p-6 lg:p-8 border border-blue-500/20 dark:border-slate-800 shadow-xl",
    
    // Banner trung bình (Thông báo ghim, chỉ dẫn)
    accent: "relative overflow-hidden rounded-2xl bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-700 dark:from-slate-900 dark:via-teal-950 dark:to-slate-900 text-white p-5 border border-teal-500/20 dark:border-slate-800 shadow-md",
    
    // Banner cảnh báo / lưu ý
    warning: "rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-4 text-amber-900 dark:text-amber-200",
  },

  // ── 3. THẺ & KHỐI HIỂN THỊ (CARDS & CONTAINERS) ──
  card: {
    // Thẻ cơ bản (dùng cho mọi hộp nội dung)
    base: "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm text-slate-900 dark:text-white transition-all",
    
    // Thẻ tương tác có hiệu ứng hover (Đề thi, Giảng viên, Sinh viên, Ca thi)
    interactive: "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-blue-500/80 dark:hover:border-slate-700 rounded-2xl p-5 shadow-sm hover:shadow-xl dark:shadow-none text-slate-900 dark:text-white transition-all duration-200 group flex flex-col justify-between",
    
    // Hộp con nằm bên trong thẻ cha (Thẻ chi tiết, thông số, metadata)
    sub: "bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 text-slate-800 dark:text-slate-200",
    
    // Thẻ số liệu thống kê (Stat card)
    stat: "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 flex items-center space-x-4 shadow-sm",
  },

  // ── 4. THANH CÔNG CỤ & TÌM KIẾM (TOOLBAR & SEARCH) ──
  toolbar: {
    container: "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4",
    segmentedWrap: "flex items-center space-x-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/80 dark:border-slate-800 shrink-0",
  },

  // ── 5. Ô NHẬP LIỆU & BỘ CHỌN (INPUTS & FORMS) ──
  input: {
    base: "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all",
    search: "w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all",
    select: "bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all",
  },

  // ── 6. NÚT BẤM (BUTTONS) ──
  btn: {
    primary: "px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/20 transition active:scale-95 flex items-center justify-center space-x-2 cursor-pointer",
    success: "px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center space-x-2 cursor-pointer",
    secondary: "px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold transition active:scale-95 cursor-pointer shadow-xs",
    danger: "px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow-md shadow-rose-600/20 transition active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer",
  },

  // ── 7. TABS ĐIỀU HƯỚNG (NAV TABS) ──
  tab: {
    active: "bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20 rounded-lg px-3 py-1.5 text-xs transition",
    inactive: "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg px-3 py-1.5 text-xs transition font-medium",
  },

  // ── 8. BẢNG DỮ LIỆU (TABLES) ──
  table: {
    container: "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden",
    headerRow: "bg-slate-50/80 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider",
    row: "border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors",
    cell: "px-4 py-3.5 text-xs text-slate-800 dark:text-slate-200",
  },

  // ── 9. MODAL CỬA SỔ PHỤ (POPUP MODALS) ──
  modal: {
    backdrop: "fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto",
    container: "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-4xl w-full p-6 md:p-8 shadow-2xl animate-in zoom-in-95 my-8 relative text-slate-900 dark:text-white",
  }
};

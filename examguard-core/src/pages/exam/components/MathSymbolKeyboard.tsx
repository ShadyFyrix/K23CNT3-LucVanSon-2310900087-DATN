import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, ChevronDown, ChevronUp, Copy, Check, Sparkles } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

interface MathSymbolKeyboardProps {
  onInsert: (symbol: string) => void;
  className?: string;
  defaultExpanded?: boolean;
}

interface SymbolCategory {
  id: string;
  name: string;
  symbols: Array<{ char: string; label: string; tooltip?: string }>;
}

const SYMBOL_CATEGORIES: SymbolCategory[] = [
  {
    id: 'basic',
    name: 'Toán cơ bản',
    symbols: [
      { char: 'π', label: 'pi', tooltip: 'Số Pi (3.14159...)' },
      { char: '√', label: 'căn', tooltip: 'Căn bậc hai' },
      { char: '²', label: 'x²', tooltip: 'Mũ 2 (bình phương)' },
      { char: '³', label: 'x³', tooltip: 'Mũ 3 (lập phương)' },
      { char: 'ⁿ', label: 'xⁿ', tooltip: 'Mũ n tổng quát' },
      { char: '≠', label: 'khác', tooltip: 'Không bằng (khác)' },
      { char: '≤', label: '<=', tooltip: 'Nhỏ hơn hoặc bằng' },
      { char: '≥', label: '>=', tooltip: 'Lớn hơn hoặc bằng' },
      { char: '±', label: '+-', tooltip: 'Cộng trừ' },
      { char: '×', label: 'nhân', tooltip: 'Dấu nhân' },
      { char: '÷', label: 'chia', tooltip: 'Dấu chia' },
      { char: '∞', label: 'vô cùng', tooltip: 'Vô cực' },
      { char: '≈', label: 'xấp xỉ', tooltip: 'Gần bằng / Xấp xỉ' },
      { char: '‰', label: 'phần nghìn', tooltip: 'Phần nghìn' },
      { char: '°', label: 'độ', tooltip: 'Ký hiệu độ góc' },
      { char: '‰', label: '%', tooltip: 'Phần trăm' },
    ]
  },
  {
    id: 'brackets',
    name: 'Ngoặc & Phân số',
    symbols: [
      { char: '()', label: '( )', tooltip: 'Cặp ngoặc tròn' },
      { char: '[]', label: '[ ]', tooltip: 'Cặp ngoặc vuông' },
      { char: '{}', label: '{ }', tooltip: 'Cặp ngoặc nhọn' },
      { char: '|x|', label: '| |', tooltip: 'Giá trị tuyệt đối' },
      { char: '½', label: '1/2', tooltip: 'Một phần hai' },
      { char: '¼', label: '1/4', tooltip: 'Một phần tư' },
      { char: '¾', label: '3/4', tooltip: 'Ba phần tư' },
      { char: '⅓', label: '1/3', tooltip: 'Một phần ba' },
      { char: '⅔', label: '2/3', tooltip: 'Hai phần ba' },
      { char: '∈', label: 'thuộc', tooltip: 'Thuộc tập hợp' },
      { char: '∉', label: 'không thuộc', tooltip: 'Không thuộc tập hợp' },
      { char: '⊂', label: 'tập con', tooltip: 'Tập con' },
      { char: '∪', label: 'hợp', tooltip: 'Hợp của hai tập' },
      { char: '∩', label: 'giao', tooltip: 'Giao của hai tập' },
      { char: '∅', label: 'rỗng', tooltip: 'Tập rỗng' },
    ]
  },
  {
    id: 'functions',
    name: 'Lượng giác & Hàm số',
    symbols: [
      { char: 'sin()', label: 'sin', tooltip: 'Hàm Sin' },
      { char: 'cos()', label: 'cos', tooltip: 'Hàm Cos' },
      { char: 'tan()', label: 'tan', tooltip: 'Hàm Tan' },
      { char: 'cot()', label: 'cot', tooltip: 'Hàm Cotang' },
      { char: 'log()', label: 'log', tooltip: 'Logarit cơ số 10' },
      { char: 'ln()', label: 'ln', tooltip: 'Logarit tự nhiên' },
      { char: 'exp()', label: 'eˣ', tooltip: 'Hàm số mũ cơ số e' },
      { char: 'lim', label: 'lim', tooltip: 'Giới hạn' },
      { char: 'f(x)', label: 'f(x)', tooltip: 'Hàm số f(x)' },
      { char: 'g(x)', label: 'g(x)', tooltip: 'Hàm số g(x)' },
      { char: 'arcsin()', label: 'arcsin', tooltip: 'Hàm arcsin' },
      { char: 'arccos()', label: 'arccos', tooltip: 'Hàm arccos' },
    ]
  },
  {
    id: 'greek',
    name: 'Ký tự Hy Lạp',
    symbols: [
      { char: 'α', label: 'alpha', tooltip: 'Alpha' },
      { char: 'β', label: 'beta', tooltip: 'Beta' },
      { char: 'γ', label: 'gamma', tooltip: 'Gamma' },
      { char: 'δ', label: 'delta', tooltip: 'Delta nhỏ' },
      { char: 'Δ', label: 'Delta', tooltip: 'Delta hoa' },
      { char: 'θ', label: 'theta', tooltip: 'Theta (góc)' },
      { char: 'λ', label: 'lambda', tooltip: 'Lambda (bước sóng)' },
      { char: 'μ', label: 'mu', tooltip: 'Mu (vi mô/hệ số ma sát)' },
      { char: 'σ', label: 'sigma', tooltip: 'Sigma nhỏ' },
      { char: 'Σ', label: 'Sigma', tooltip: 'Tổng Sigma' },
      { char: 'ω', label: 'omega', tooltip: 'Omega nhỏ' },
      { char: 'Ω', label: 'Omega', tooltip: 'Điện trở Ohm / Omega hoa' },
      { char: 'φ', label: 'phi', tooltip: 'Phi (pha dao động)' },
      { char: 'ψ', label: 'psi', tooltip: 'Psi' },
      { char: 'ρ', label: 'rho', tooltip: 'Rho (khối lượng riêng)' },
    ]
  },
  {
    id: 'calculus',
    name: 'Giải tích & Đại số',
    symbols: [
      { char: '∫', label: 'tích phân', tooltip: 'Tích phân bất định' },
      { char: '∬', label: 'tích phân kép', tooltip: 'Tích phân 2 lớp' },
      { char: '∂', label: 'đạo hàm riêng', tooltip: 'Đạo hàm riêng' },
      { char: 'dx', label: 'dx', tooltip: 'Vi phân dx' },
      { char: 'dy', label: 'dy', tooltip: 'Vi phân dy' },
      { char: 'dt', label: 'dt', tooltip: 'Vi phân thời gian dt' },
      { char: '∑', label: 'tổng', tooltip: 'Ký hiệu tổng chuỗi' },
      { char: '∏', label: 'tích', tooltip: 'Ký hiệu tích chuỗi' },
      { char: '→', label: 'tiến tới', tooltip: 'Mũi tên suy ra / tiến tới' },
      { char: '⇒', label: 'suy ra', tooltip: 'Kéo theo / Suy ra' },
      { char: '⇔', label: 'tương đương', tooltip: 'Tương đương' },
      { char: '∀', label: 'mọi', tooltip: 'Với mọi' },
      { char: '∃', label: 'tồn tại', tooltip: 'Tồn tại' },
      { char: '∇', label: 'nabla', tooltip: 'Toán tử Nabla' },
    ]
  }
];

export const MathSymbolKeyboard: React.FC<MathSymbolKeyboardProps> = ({
  onInsert,
  className = '',
  defaultExpanded = true
}) => {
  const { isDark } = useTheme();
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [activeTab, setActiveTab] = useState<string>('basic');
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);

  const handleSymbolClick = (char: string) => {
    onInsert(char);
    setCopiedSymbol(char);
    setTimeout(() => {
      setCopiedSymbol(null);
    }, 600);
  };

  const currentCategory = SYMBOL_CATEGORIES.find(c => c.id === activeTab) || SYMBOL_CATEGORIES[0];

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-xl'
          : 'bg-white border-slate-200 text-slate-800 shadow-sm'
      } ${className}`}
    >
      {/* Header bar */}
      <div
        className={`px-3 py-2 flex items-center justify-between cursor-pointer select-none border-b transition-colors ${
          isDark
            ? 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-950'
            : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/70'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold tracking-tight">
            Bàn phím Công thức & Ký hiệu Khoa học
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              isDark
                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            Chạm để chèn
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {copiedSymbol && (
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 flex items-center space-x-1"
            >
              <Check className="w-3 h-3" />
              <span>Đã chèn "{copiedSymbol}"</span>
            </motion.span>
          )}
          <button
            type="button"
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Category tabs */}
            <div
              className={`flex items-center gap-1 px-3 py-2 border-b overflow-x-auto custom-scrollbar text-xs ${
                isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50/70 border-slate-200/80'
              }`}
            >
              {SYMBOL_CATEGORIES.map(cat => {
                const isActive = activeTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveTab(cat.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all text-xs ${
                      isActive
                        ? isDark
                          ? 'bg-blue-600 text-white shadow-sm font-semibold'
                          : 'bg-blue-700 text-white shadow-sm font-semibold'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>

            {/* Symbols grid */}
            <div className="p-3">
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5">
                {currentCategory.symbols.map((sym, idx) => {
                  return (
                    <motion.button
                      key={idx}
                      type="button"
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleSymbolClick(sym.char)}
                      title={sym.tooltip || sym.label}
                      className={`h-9 rounded-xl border text-sm font-mono flex items-center justify-center transition-colors relative group ${
                        isDark
                          ? 'bg-slate-800/80 hover:bg-slate-700 border-slate-700/80 text-slate-100 hover:border-teal-500/50'
                          : 'bg-slate-100 hover:bg-white border-slate-200 text-slate-800 hover:border-teal-600/50 shadow-2xs'
                      }`}
                    >
                      <span className="font-semibold">{sym.char}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

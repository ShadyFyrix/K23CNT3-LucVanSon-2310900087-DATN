import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Clock, Bookmark, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

interface QuestionItem {
  stt: number;
  _id: string;
  type: string;
  content: string;
  score: number;
}

interface NovageniusQuestionMatrixProps {
  questions: QuestionItem[];
  answers: Record<string, any>;
  flagged: Record<number, boolean>;
  currentIdx: number;
  onSelectQuestion: (index: number) => void;
  timeLeft: number;
  totalDurationMinutes: number;
  formatTime: (seconds: number) => string;
}

export const NovageniusQuestionMatrix: React.FC<NovageniusQuestionMatrixProps> = ({
  questions,
  answers,
  flagged,
  currentIdx,
  onSelectQuestion,
  timeLeft,
  totalDurationMinutes,
  formatTime
}) => {
  const { isDark } = useTheme();

  const totalSeconds = totalDurationMinutes * 60;
  const elapsedSeconds = Math.max(0, totalSeconds - timeLeft);

  // Tính số câu đã hoàn thành
  const answeredCount = useMemo(() => {
    return questions.filter((q, idx) => {
      const val = answers[q._id] !== undefined ? answers[q._id] : answers[idx];
      return val !== undefined && val !== null && val !== '';
    }).length;
  }, [questions, answers]);

  const flaggedCount = useMemo(() => {
    return Object.values(flagged).filter(Boolean).length;
  }, [flagged]);

  const progressPercent = questions.length > 0
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  // Chia danh sách câu hỏi thành các Part / Nhóm 10-15 câu (giống mẫu Novagenius Image 4)
  const questionGroups = useMemo(() => {
    const chunkSize = 10;
    const parts: Array<{ title: string; subtitle: string; indices: number[] }> = [];

    const totalQuestions = questions.length;
    let partNum = 1;

    for (let i = 0; i < totalQuestions; i += chunkSize) {
      const end = Math.min(i + chunkSize, totalQuestions);
      const indices: number[] = [];
      for (let j = i; j < end; j++) {
        indices.push(j);
      }

      let partTitle = `Phần ${partNum}`;
      let partSubtitle = `Câu hỏi trắc nghiệm ${i + 1} - ${end}`;
      if (partNum === 1) {
        partSubtitle = `Nhận biết & Thông hiểu (${i + 1} - ${end})`;
      } else if (partNum === 2) {
        partSubtitle = `Vận dụng & Phân tích (${i + 1} - ${end})`;
      } else {
        partSubtitle = `Vận dụng cao & Chuyên sâu (${i + 1} - ${end})`;
      }

      parts.push({
        title: partTitle,
        subtitle: partSubtitle,
        indices
      });
      partNum++;
    }

    return parts;
  }, [questions]);

  return (
    <div
      className={`rounded-2xl border p-4 space-y-4 transition-all duration-200 ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-xl'
          : 'bg-white border-slate-200 text-slate-800 shadow-sm'
      }`}
    >
      {/* 1. DIGITAL TIME COUNTDOWN CARD (NOVAGENIUS STYLE) */}
      <div
        className={`p-3.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${
          timeLeft < 300
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse'
            : isDark
            ? 'bg-slate-950/80 border-slate-800'
            : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
          <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-teal-400" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">Thời gian làm bài</span>
        </div>
        <div className="font-mono text-2xl font-extrabold tracking-wider text-slate-900 dark:text-white">
          <span>{formatTime(timeLeft)}</span>
          <span className="text-xs font-normal text-slate-400 ml-1.5 font-sans">
            / {totalDurationMinutes}:00
          </span>
        </div>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
          Đã trôi qua: {formatTime(elapsedSeconds)}
        </div>
      </div>

      {/* 2. PROGRESS BAR & STATS */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Tiến độ hoàn thành:</span>
          <span className="font-mono font-bold text-blue-600 dark:text-teal-400">
            {answeredCount}/{questions.length} ({progressPercent}%)
          </span>
        </div>

        <div
          className={`h-2.5 w-full rounded-full overflow-hidden p-0.5 border ${
            isDark ? 'bg-slate-800 border-slate-700/80' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4 }}
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500"
          />
        </div>
      </div>

      {/* 3. LEGEND CHÚ THÍCH THEO MẪU NOVAGENIUS */}
      <div
        className={`flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg border ${
          isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200/80'
        }`}
      >
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 dark:bg-teal-500"></span>
          <span className="text-slate-600 dark:text-slate-300 font-medium">Đã làm ({answeredCount})</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 dark:border-slate-500"></span>
          <span className="text-slate-500 dark:text-slate-400">Chưa làm ({questions.length - answeredCount})</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Bookmark className="w-3 h-3 text-amber-500 fill-amber-500" />
          <span className="text-amber-600 dark:text-amber-400 font-medium">Gắn cờ ({flaggedCount})</span>
        </div>
      </div>

      {/* 4. MA TRẬN CÂU HỎI PHÂN THEO PART & NHÓM CÂU (IMAGE 4) */}
      <div className="space-y-3.5 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
        {questionGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200 dark:border-slate-800">
              <span className="font-bold text-slate-800 dark:text-slate-200">{group.title}</span>
              <span className="text-[10px] text-slate-400">{group.subtitle}</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {group.indices.map(qIdx => {
                const q = questions[qIdx];
                const isCurrent = currentIdx === qIdx;
                const isAnswered =
                  answers[q._id] !== undefined || answers[qIdx] !== undefined;
                const isFlagged = flagged[qIdx];

                return (
                  <motion.button
                    key={qIdx}
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onSelectQuestion(qIdx)}
                    className={`h-9 rounded-xl border text-xs font-semibold flex items-center justify-center relative transition-all ${
                      isCurrent
                        ? isDark
                          ? 'bg-blue-600/30 text-blue-300 border-blue-500 ring-2 ring-blue-500/50 shadow-md font-bold'
                          : 'bg-blue-100 text-blue-800 border-blue-600 ring-2 ring-blue-600/40 shadow-sm font-bold'
                        : isAnswered
                        ? isDark
                          ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 hover:bg-teal-500/30'
                          : 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100'
                        : isDark
                        ? 'bg-slate-800/80 text-slate-400 border-slate-700/80 hover:bg-slate-800 hover:text-white'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    <span>{qIdx + 1}</span>

                    {/* Dấu chấm cờ hổ phách (Amber Mark) ở góc trên */}
                    {isFlagged && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-1 ring-white dark:ring-slate-900"></span>
                    )}

                    {/* Chấm tròn biểu thị đã tô đáp án */}
                    {isAnswered && !isCurrent && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-teal-500"></span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

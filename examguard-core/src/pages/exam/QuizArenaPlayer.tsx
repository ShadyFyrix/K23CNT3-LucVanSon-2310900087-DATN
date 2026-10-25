import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { 
  Trophy, Clock, Heart, Flame, Shield, CheckCircle2, 
  XCircle, Zap, Volume2, VolumeX, ArrowLeft, Sparkles, 
  Award, HelpCircle
} from 'lucide-react';
import { useQuizSound } from './hooks/useQuizSound';
import { useAuth } from '../../context/AuthContext';

interface Question {
  stt: number;
  content: string;
  options: string[];
  score: number;
  correctAnswer?: number;
  explanation?: string;
}

export default function QuizArenaPlayer() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Socket & State
  const socketRef = useRef<Socket | null>(null);
  const [status, setStatus] = useState<'LOBBY' | 'QUESTION_ACTIVE' | 'QUESTION_REVEALED' | 'FINISHED'>('LOBBY');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [totalQ, setTotalQ] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  // Student Personal Gameplay Stats
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [rank, setRank] = useState(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<any>(null);
  const [isKnockedOut, setIsKnockedOut] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [used5050, setUsed5050] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [isScreenShaking, setIsScreenShaking] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const { playQuizSound } = useQuizSound(soundEnabled);

  useEffect(() => {
    if (!sessionId) return;

    const socket = io({
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    const u = user as any;
    socket.emit('arena:join', {
      sessionId,
      role: 'student',
      studentId: u?._id || u?.id || 'demo_student',
      studentName: u?.fullName || u?.name || 'Thí sinh',
      candidateCode: u?.studentCode || '20261015-001'
    });

    socket.on('arena:sync_state', (data) => {
      setStatus(data.status);
      setCurrentIdx(data.currentQuestionIndex);
      setTotalQ(data.totalQuestions);
      setTimeRemaining(data.timeRemaining);
      if (data.currentQuestion) setCurrentQuestion(data.currentQuestion);
      if (data.myStats) {
        setScore(data.myStats.score || 0);
        setStreak(data.myStats.streak || 0);
        setHearts(data.myStats.hearts !== undefined ? data.myStats.hearts : 3);
        setRank(data.myStats.rank || 1);
      }
    });

    socket.on('arena:state_changed', (data) => {
      setStatus(data.status);
      setCurrentIdx(data.currentQuestionIndex);
      setTotalQ(data.totalQuestions);
      setCurrentQuestion(data.currentQuestion);
      setTimeRemaining(data.timeRemaining);
      setSelectedOption(null);
      setIsAnswered(false);
      setAnswerFeedback(null);
      setEliminatedOptions([]);
      setQuestionStartTime(Date.now());
      playQuizSound('flag');
    });

    socket.on('arena:timer_tick', (data) => {
      setTimeRemaining(data.timeRemaining);
      if (data.timeRemaining <= 5 && data.timeRemaining > 0) {
        playQuizSound('tick');
      }
    });

    socket.on('arena:answer_feedback', (fb) => {
      setAnswerFeedback(fb);
      setScore(fb.currentScore);
      setStreak(fb.currentStreak);
      setHearts(fb.heartsRemaining);
      setRank(fb.rank);
      setIsKnockedOut(fb.isKnockedOut);

      if (fb.isCorrect) {
        playQuizSound('correct');
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.7 } });
        if (fb.currentStreak >= 3) {
          setTimeout(() => playQuizSound('streak'), 300);
        }
      } else {
        playQuizSound('wrong');
        setIsScreenShaking(true);
        setTimeout(() => setIsScreenShaking(false), 500);
      }
    });

    socket.on('arena:question_timeup', (data) => {
      setStatus('QUESTION_REVEALED');
      if (currentQuestion) {
        setCurrentQuestion({
          ...currentQuestion,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation
        });
      }
    });

    socket.on('arena:game_finished', (data) => {
      setStatus('FINISHED');
      playQuizSound('fanfare');
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 } });
    });

    socket.on('arena:powerup_50_50_result', (data) => {
      setEliminatedOptions(data.eliminated || []);
      toast.success('Đã loại bỏ 2 phương án sai!');
      playQuizSound('select');
    });

    socket.on('arena:kicked', (data) => {
      alert(`Bạn đã bị Giảng viên trục xuất khỏi trận đấu! Lý do: ${data.reason}`);
      navigate('/student-portal');
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, user]);

  // Submit Answer
  const handleSelectOption = (idx: number) => {
    if (isAnswered || status !== 'QUESTION_ACTIVE' || isKnockedOut) return;

    setSelectedOption(idx);
    setIsAnswered(true);
    playQuizSound('select');

    const timeSpentMs = Date.now() - questionStartTime;
    const u = user as any;
    socketRef.current?.emit('arena:submit_answer', {
      sessionId,
      studentId: u?._id || u?.id || 'demo_student',
      questionIndex: currentIdx,
      selectedOption: idx,
      timeSpentMs
    });
  };

  // Use 50:50 Power-up
  const handleUse5050 = () => {
    if (used5050 || isAnswered || status !== 'QUESTION_ACTIVE') return;
    setUsed5050(true);
    const u = user as any;
    socketRef.current?.emit('arena:use_powerup', {
      sessionId,
      studentId: u?._id || u?.id || 'demo_student',
      powerUpType: '50_50'
    });
  };

  const CARD_THEMES = [
    { bg: 'bg-rose-600 hover:bg-rose-500 border-rose-400', activeBg: 'ring-4 ring-rose-400 bg-rose-500', shape: '▲', label: 'A' },
    { bg: 'bg-sky-600 hover:bg-sky-500 border-sky-400', activeBg: 'ring-4 ring-sky-400 bg-sky-500', shape: '◆', label: 'B' },
    { bg: 'bg-amber-600 hover:bg-amber-500 border-amber-400', activeBg: 'ring-4 ring-amber-400 bg-amber-500', shape: '●', label: 'C' },
    { bg: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400', activeBg: 'ring-4 ring-emerald-400 bg-emerald-500', shape: '■', label: 'D' }
  ];

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none transition-transform ${isScreenShaking ? 'animate-shake' : ''}`}>
      {/* ── TOP HUD BAR ── */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/student-portal')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-black text-lg bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">
            ⚡ QUIZ ARENA
          </span>
        </div>

        {/* Realtime Stats HUD */}
        <div className="flex items-center gap-4">
          {/* Hearts remaining */}
          <div className="flex items-center gap-1 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            {[1, 2, 3].map(h => (
              <Heart 
                key={h} 
                className={`w-4 h-4 ${h <= hearts ? 'text-rose-500 fill-rose-500' : 'text-slate-600'}`} 
              />
            ))}
          </div>

          {/* Streak Flame */}
          {streak >= 2 && (
            <div className="flex items-center gap-1 bg-rose-500/20 text-rose-400 px-3 py-1 rounded-full border border-rose-500/40 font-bold text-xs animate-bounce">
              <Flame className="w-4 h-4 fill-rose-500" /> {streak} Streak
            </div>
          )}

          {/* Current Rank */}
          <div className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-3 py-1 rounded-full text-xs font-bold">
            <Trophy className="w-3.5 h-3.5" /> Hạng #{rank}
          </div>

          {/* Score Counter */}
          <div className="font-mono font-black text-cyan-400 text-base">
            {score.toLocaleString()} <span className="text-xs text-slate-400">đ</span>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </header>

      {/* ── GAME CONTENT ── */}
      <main className="flex-1 p-4 md:p-8 flex flex-col justify-center max-w-4xl mx-auto w-full">
        {/* 1. LOBBY WAITING SCREEN */}
        {status === 'LOBBY' && (
          <div className="text-center py-12 flex flex-col items-center">
            <div className="w-24 h-24 rounded-3xl bg-cyan-500/10 border-2 border-cyan-500/30 flex items-center justify-center text-4xl mb-6 shadow-xl shadow-cyan-500/10 animate-pulse">
              🎮
            </div>
            <h2 className="text-3xl font-black text-white mb-3">Đã Vào Phòng Đấu!</h2>
            <p className="text-slate-400 text-sm max-w-sm mb-8">
              Chào bạn <strong className="text-white">{user?.fullName || 'Thí sinh'}</strong>! Hãy tập trung tinh thần, Giảng viên sẽ bấm bắt đầu trận đấu trong giây lát...
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Đang đồng bộ thời gian thực...
            </div>
          </div>
        )}

        {/* 2. ACTIVE QUESTION SCREEN */}
        {status === 'QUESTION_ACTIVE' && (
          <div className="flex flex-col gap-6 flex-1 justify-center">
            {/* Top Question Info & Timer Bar */}
            <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
              <span>CÂU HỎI {currentIdx + 1} / {totalQ}</span>
              <span className={`font-mono text-base font-black flex items-center gap-1 ${
                timeRemaining <= 5 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'
              }`}>
                <Clock className="w-4 h-4" /> {timeRemaining}s
              </span>
            </div>

            {/* Question Text */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-center shadow-xl">
              <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed">
                {currentQuestion?.content || 'Đang tải câu hỏi...'}
              </h2>
            </div>

            {/* Power-up Button */}
            {!used5050 && (
              <div className="flex justify-end">
                <button
                  onClick={handleUse5050}
                  className="px-4 py-1.5 rounded-full bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 shadow"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Dùng Trợ Giúp [50:50]
                </button>
              </div>
            )}

            {/* 4 Large Vibrant Answer Cards (Gameshow style) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(currentQuestion?.options || ['A', 'B', 'C', 'D']).map((opt, idx) => {
                const theme = CARD_THEMES[idx % CARD_THEMES.length];
                const isSelected = selectedOption === idx;
                const isEliminated = eliminatedOptions.includes(idx);

                return (
                  <button
                    key={idx}
                    disabled={isAnswered || isEliminated || isKnockedOut}
                    onClick={() => handleSelectOption(idx)}
                    className={`p-6 rounded-2xl border-2 text-left font-bold text-lg md:text-xl text-white transition-all transform active:scale-95 flex items-center gap-4 shadow-xl ${
                      isEliminated 
                        ? 'opacity-20 pointer-events-none bg-slate-900 border-slate-800'
                        : isSelected 
                        ? `${theme.activeBg} scale-[1.02] shadow-2xl`
                        : `${theme.bg}`
                    }`}
                  >
                    <span className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center font-black text-xl">
                      {theme.shape}
                    </span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Answered State Notice */}
            {isAnswered && (
              <div className="text-center py-2 text-cyan-300 text-sm font-semibold animate-pulse">
                ✓ Đã ghi nhận câu trả lời! Đang chờ Giảng viên mở đáp án...
              </div>
            )}
          </div>
        )}

        {/* 3. REVEALED SCREEN (Feedback & Explanation) */}
        {status === 'QUESTION_REVEALED' && (
          <div className="flex flex-col items-center justify-center text-center py-6">
            {/* Feedback Icon & Message */}
            {answerFeedback?.isCorrect ? (
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-400 flex items-center justify-center mb-3 shadow-xl shadow-emerald-500/20 animate-bounce">
                  <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
                </div>
                <h2 className="text-3xl font-black text-emerald-400">CHÍNH XÁC!</h2>
                <span className="text-lg font-mono font-bold text-cyan-300 mt-1">
                  +{answerFeedback?.pointsEarned?.toLocaleString()} Điểm
                </span>
                {answerFeedback?.speedBonus > 0 && (
                  <span className="text-xs text-amber-300">
                    ⚡ Thưởng tốc độ: +{answerFeedback.speedBonus} đ {answerFeedback.multiplier > 1 && `(Combo x${answerFeedback.multiplier})`}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center mb-6">
                <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 border-2 border-rose-400 flex items-center justify-center mb-3 shadow-xl shadow-rose-500/20">
                  <XCircle className="w-12 h-12 stroke-[2.5]" />
                </div>
                <h2 className="text-3xl font-black text-rose-400">RẤT TIẾC! SAI RỒI</h2>
                <span className="text-xs text-slate-400 mt-1">Bị trừ 1 Trái tim và ngắt chuỗi Streak.</span>
              </div>
            )}

            {/* Question Explanation */}
            {currentQuestion?.explanation && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-left max-w-lg w-full mb-6 text-sm text-slate-300">
                <span className="font-bold text-amber-400 block mb-1">💡 Giải thích chi tiết:</span>
                {currentQuestion.explanation}
              </div>
            )}

            <span className="text-xs text-slate-500 animate-pulse">
              Chờ Giảng viên chuyển sang câu tiếp theo...
            </span>
          </div>
        )}

        {/* 4. FINISHED SCREEN */}
        {status === 'FINISHED' && (
          <div className="text-center py-8 flex flex-col items-center">
            <div className="text-6xl mb-4">🎖️</div>
            <h2 className="text-3xl font-black text-white mb-2">Trận Đấu Đã Khép Lại!</h2>
            <p className="text-slate-400 text-sm mb-6">Bạn đã thi đấu rất xuất sắc hôm nay:</p>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full mb-8 shadow-xl">
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">XẾP HẠNG CHUNG CUỘC</div>
              <div className="text-4xl font-black text-amber-400 mb-4">HẠNG #{rank}</div>
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">TỔNG ĐIỂM ĐẠT ĐƯỢC</div>
              <div className="text-2xl font-mono font-black text-cyan-300 mb-4">{score.toLocaleString()} đ</div>
              <div className="text-xs text-slate-400">
                Chuỗi đúng dài nhất: <strong className="text-rose-400">{streak} câu</strong>
              </div>
            </div>

            <button
              onClick={() => navigate('/student-portal')}
              className="px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition"
            >
              Về Cổng Sinh Viên
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

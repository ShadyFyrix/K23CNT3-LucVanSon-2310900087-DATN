import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import { 
  Trophy, Play, Pause, FastForward, Clock, Heart, Flame, Shield, 
  Users, CheckCircle2, AlertTriangle, Settings, ArrowLeft, RefreshCw, 
  ExternalLink, Sparkles, Volume2, VolumeX, Maximize2, Minimize2, 
  UserX, Download, Check
} from 'lucide-react';
import { useQuizSound } from './hooks/useQuizSound';

interface Participant {
  studentId: string;
  name: string;
  candidateCode: string;
  score: number;
  streak: number;
  hearts: number;
  rank: number;
  isKnockedOut?: boolean;
}

interface Question {
  stt: number;
  content: string;
  options: string[];
  score: number;
  correctAnswer?: number;
  explanation?: string;
  imageUrl?: string;
}

export default function QuizArenaHost() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Socket & State
  const socketRef = useRef<Socket | null>(null);
  const [arenaState, setArenaState] = useState<any>(null);
  const [status, setStatus] = useState<'LOBBY' | 'QUESTION_ACTIVE' | 'QUESTION_REVEALED' | 'FINISHED'>('LOBBY');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [totalQ, setTotalQ] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isPaused, setIsPaused] = useState(false);
  const [pin, setPin] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  
  // Realtime Data
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [leaderboard, setLeaderboard] = useState<Participant[]>([]);
  const [distribution, setDistribution] = useState<{ [key: number]: number }>({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const [answeredCount, setAnsweredCount] = useState(0);
  const [podium, setPodium] = useState<any>(null);

  // Settings & Modes
  const [viewMode, setViewMode] = useState<'PROJECTOR' | 'COCKPIT'>('COCKPIT');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedHotfixOption, setSelectedHotfixOption] = useState<number | null>(null);

  const { playQuizSound } = useQuizSound(soundEnabled);

  // Load Initial REST Data
  useEffect(() => {
    if (!sessionId) return;

    axios.get(`/api/quiz-arena/state/${sessionId}`)
      .then(res => {
        if (res.data.success) {
          const d = res.data.data;
          setArenaState(d);
          setPin(d.quizPin);
          setStatus(d.arenaStatus);
          setCurrentIdx(d.currentQuestionIndex);
          setTotalQ(d.totalQuestions);
          if (d.topLeaderboard) setLeaderboard(d.topLeaderboard);
        }
      })
      .catch(err => {
        console.error('Lỗi tải trạng thái Arena:', err);
        toast.error('Không thể tải dữ liệu Đấu trường Quiz');
      });
  }, [sessionId]);

  // Connect Socket.IO
  useEffect(() => {
    if (!sessionId) return;

    const socket = io({
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.emit('arena:join', {
      sessionId,
      role: 'teacher',
      studentName: 'Giảng viên Chủ toạ'
    });

    socket.on('arena:sync_state', (data) => {
      setStatus(data.status);
      setPin(data.pin);
      setCurrentIdx(data.currentQuestionIndex);
      setTotalQ(data.totalQuestions);
      setTimeRemaining(data.timeRemaining);
      setIsPaused(data.isPaused);
      if (data.currentQuestion) setCurrentQuestion(data.currentQuestion);
    });

    socket.on('arena:participant_joined', (data) => {
      setParticipants(data.participants);
      playQuizSound('select');
    });

    socket.on('arena:state_changed', (data) => {
      setStatus(data.status);
      setCurrentIdx(data.currentQuestionIndex);
      setTotalQ(data.totalQuestions);
      setCurrentQuestion(data.currentQuestion);
      setTimeRemaining(data.timeRemaining);
      setDistribution({ 0: 0, 1: 0, 2: 0, 3: 0 });
      setAnsweredCount(0);
      playQuizSound('flag');
    });

    socket.on('arena:distribution_update', (data) => {
      setDistribution(data.distribution);
      setAnsweredCount(data.totalAnswered);
    });

    socket.on('arena:leaderboard_update', (newLeaderboard) => {
      setLeaderboard(newLeaderboard);
    });

    socket.on('arena:timer_tick', (data) => {
      setTimeRemaining(data.timeRemaining);
      if (data.timeRemaining <= 5 && data.timeRemaining > 0) {
        playQuizSound('tick');
      }
    });

    socket.on('arena:pause_toggled', (data) => {
      setIsPaused(data.isPaused);
      toast(data.isPaused ? '⏸️ Trận đấu đã tạm dừng' : '▶️ Tiếp tục trận đấu');
    });

    socket.on('arena:time_added', (data) => {
      setTimeRemaining(data.timeRemaining);
      toast.success(`⏱️ Đã cộng bù +${data.added}s cho cả lớp!`);
      playQuizSound('flag');
    });

    socket.on('arena:question_timeup', (data) => {
      setStatus('QUESTION_REVEALED');
      setDistribution(data.distribution);
      if (currentQuestion) {
        setCurrentQuestion({
          ...currentQuestion,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation
        });
      }
      playQuizSound('finish');
    });

    socket.on('arena:game_finished', (data) => {
      setStatus('FINISHED');
      setLeaderboard(data.leaderboard);
      setPodium(data.podium);
      playQuizSound('fanfare');
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    });

    return () => {
      socket.disconnect();
    };
  }, [sessionId, currentQuestion]);

  // Host Actions
  const handleStartGame = () => {
    socketRef.current?.emit('arena:host_start', { sessionId });
  };

  const handleNextQuestion = () => {
    socketRef.current?.emit('arena:host_next', { sessionId });
  };

  const handleTogglePause = () => {
    socketRef.current?.emit('arena:host_toggle_pause', { sessionId });
  };

  const handleAddTime = (extraSec = 15) => {
    socketRef.current?.emit('arena:host_add_time', { sessionId, extraSeconds: extraSec });
  };

  const handleHotfixAnswer = (optionIdx: number) => {
    socketRef.current?.emit('arena:host_hotfix_answer', {
      sessionId,
      questionIndex: currentIdx,
      validOptions: [currentQuestion?.correctAnswer, optionIdx].filter(v => v !== undefined)
    });
    toast.success(`Đã công nhận thêm phương án [${String.fromCharCode(65 + optionIdx)}] là đáp án hợp lệ!`);
    setSelectedHotfixOption(null);
  };

  const handleKickStudent = (studentId: string) => {
    if (window.confirm('Bạn có chắc muốn trục xuất sinh viên này khỏi đấu trường?')) {
      socketRef.current?.emit('arena:host_moderate_student', {
        sessionId,
        studentId,
        action: 'KICK'
      });
      toast.error('Đã trục xuất sinh viên khỏi phòng đấu!');
    }
  };

  const handleSyncOfficialGrades = async () => {
    try {
      const res = await axios.post(`/api/quiz-arena/sync-grades/${sessionId}`);
      if (res.data.success) {
        toast.success(res.data.message);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Lỗi đồng bộ điểm');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Option colors for vibrant gamified feel
  const OPTION_THEMES = [
    { bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300', bar: 'bg-rose-500', label: 'A' },
    { bg: 'bg-sky-500/15 border-sky-500/40 text-sky-300', bar: 'bg-sky-500', label: 'B' },
    { bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300', bar: 'bg-amber-500', label: 'C' },
    { bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300', bar: 'bg-emerald-500', label: 'D' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* ── TOP NAVIGATION BAR ── */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/exam-sessions')}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Quay lại danh sách ca thi"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-black bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400 bg-clip-text text-transparent">
                🏆 QUIZ ARENA HOST
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {arenaState?.title || 'Đấu trường Quiz Tương tác'} • {arenaState?.subject || 'Môn học'}
            </p>
          </div>
        </div>

        {/* PIN Badge & View Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-4 py-1.5 shadow-inner">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Mã PIN:</span>
            <span className="text-xl font-mono font-black text-cyan-400 tracking-widest">{pin || '------'}</span>
          </div>

          {/* Toggle Dual-Screen Mode */}
          <div className="bg-slate-800 p-1 rounded-xl flex gap-1 border border-slate-700">
            <button
              onClick={() => setViewMode('COCKPIT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'COCKPIT' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Bảng Điều Khiển
            </button>
            <button
              onClick={() => setViewMode('PROJECTOR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'PROJECTOR' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" /> Màn Hình Chiếu
            </button>
          </div>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-cyan-400" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT BASED ON STATUS ── */}
      <main className="flex-1 p-6 flex flex-col max-w-7xl mx-auto w-full">
        {/* 1. LOBBY STATUS */}
        {status === 'LOBBY' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm font-semibold mb-6 animate-pulse">
              <Sparkles className="w-4 h-4 text-cyan-400" /> Sảnh Chờ Đấu Trường Đang Mở
            </div>

            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-white">
              Sẵn sàng Khởi tranh Cuộc thi!
            </h1>
            <p className="text-slate-400 max-w-md mb-8 text-sm">
              Yêu cầu sinh viên truy cập cổng Quiz và nhập mã PIN dưới đây để cùng so tài:
            </p>

            {/* Giant PIN Banner */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-cyan-500/40 rounded-3xl p-8 mb-10 shadow-2xl shadow-cyan-500/10 flex flex-col items-center">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">GAME PIN</span>
              <span className="text-6xl md:text-7xl font-mono font-black text-cyan-400 tracking-widest select-all">
                {pin}
              </span>
              <span className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" /> Đã có {participants.length || arenaState?.participantsCount || 0} thí sinh vào phòng
              </span>
            </div>

            {/* Lobby Action Controls */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleStartGame}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-lg shadow-xl shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2"
              >
                <Play className="w-6 h-6 fill-slate-950" /> BẮT ĐẦU TRẬN ĐẤU
              </button>
            </div>
          </div>
        )}

        {/* 2. QUESTION ACTIVE OR REVEALED STATUS */}
        {(status === 'QUESTION_ACTIVE' || status === 'QUESTION_REVEALED') && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            {/* Left 2 Cols: Question & Distribution Bar Chart */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Question Header & Timer */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    CÂU {currentIdx + 1} TRÊN {totalQ}
                  </span>

                  {/* Circular Timer Display */}
                  <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full font-mono font-black text-lg border ${
                    timeRemaining <= 5 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  }`}>
                    <Clock className="w-4 h-4" /> {timeRemaining}s
                  </div>
                </div>

                {/* Question Text */}
                <h2 className="text-xl md:text-2xl font-bold text-white leading-relaxed mb-6">
                  {currentQuestion?.content || 'Đang tải câu hỏi...'}
                </h2>

                {/* 4 Interactive Answer Cards with Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(currentQuestion?.options || ['Lựa chọn A', 'Lựa chọn B', 'Lựa chọn C', 'Lựa chọn D']).map((opt, idx) => {
                    const theme = OPTION_THEMES[idx % OPTION_THEMES.length];
                    const isCorrect = status === 'QUESTION_REVEALED' && currentQuestion?.correctAnswer === idx;
                    const count = distribution[idx] || 0;
                    const totalAnsweredNow = Math.max(1, answeredCount);
                    const pct = Math.round((count / totalAnsweredNow) * 100);

                    return (
                      <div 
                        key={idx}
                        className={`p-4 rounded-xl border relative overflow-hidden transition-all flex flex-col justify-between min-h-[90px] ${
                          isCorrect 
                            ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/50' 
                            : theme.bg
                        }`}
                      >
                        {/* Distribution Progress Bar Fill */}
                        <div 
                          className={`absolute left-0 bottom-0 top-0 opacity-15 pointer-events-none transition-all duration-500 ${theme.bar}`}
                          style={{ width: `${pct}%` }}
                        />

                        <div className="flex items-start justify-between relative z-10">
                          <span className="text-sm font-bold flex-1 pr-2">
                            <span className="inline-block w-6 h-6 rounded-md bg-slate-800 text-center leading-6 text-xs font-black mr-2">
                              {theme.label}
                            </span>
                            {opt}
                          </span>
                          {isCorrect && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-black text-xs flex items-center gap-1 shadow">
                              <Check className="w-3.5 h-3.5 stroke-[3]" /> ĐÚNG
                            </span>
                          )}
                        </div>

                        {/* Answers Count Badge */}
                        <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-2 border-t border-slate-800/60 relative z-10">
                          <span>{count} sinh viên chọn</span>
                          <span className="font-mono font-bold">{pct}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation Box (when revealed) */}
                {status === 'QUESTION_REVEALED' && currentQuestion?.explanation && (
                  <div className="mt-5 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm">
                    <span className="font-bold flex items-center gap-1.5 mb-1 text-amber-300">
                      💡 Lời giải thích sư phạm:
                    </span>
                    {currentQuestion.explanation}
                  </div>
                )}
              </div>

              {/* Host Control Actions Bar (Visible in Cockpit Mode) */}
              {viewMode === 'COCKPIT' && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleTogglePause}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
                      {isPaused ? 'Tiếp tục' : 'Tạm dừng'}
                    </button>

                    <button
                      onClick={() => handleAddTime(15)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <Clock className="w-4 h-4 text-cyan-400" /> +15s Bù giờ
                    </button>

                    {/* Hotfix Option Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <select 
                        className="bg-slate-800 border border-slate-700 text-xs rounded-xl px-2.5 py-2 text-slate-200"
                        onChange={(e) => setSelectedHotfixOption(e.target.value === '' ? null : Number(e.target.value))}
                        value={selectedHotfixOption !== null ? selectedHotfixOption : ''}
                      >
                        <option value="">Công nhận thêm...</option>
                        <option value="0">Công nhận Đáp án A</option>
                        <option value="1">Công nhận Đáp án B</option>
                        <option value="2">Công nhận Đáp án C</option>
                        <option value="3">Công nhận Đáp án D</option>
                      </select>
                      {selectedHotfixOption !== null && (
                        <button
                          onClick={() => handleHotfixAnswer(selectedHotfixOption)}
                          className="px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                        >
                          Lưu
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleNextQuestion}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-sm flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition transform hover:-translate-y-0.5"
                  >
                    CÂU TIẾP THEO <FastForward className="w-4 h-4 fill-slate-950" />
                  </button>
                </div>
              )}
            </div>

            {/* Right 1 Col: Live Leaderboard Top 10 */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col h-full shadow-xl">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                <span className="text-sm font-black flex items-center gap-2 text-amber-400">
                  <Trophy className="w-4 h-4 text-amber-400" /> BẢNG XẾP HẠNG TOP 10
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {answeredCount}/{participants.length || arenaState?.participantsCount || 0} đã nộp
                </span>
              </div>

              <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Chưa có điểm số ghi nhận...
                  </div>
                ) : (
                  leaderboard.map((item, idx) => {
                    const isPodium = idx < 3;
                    return (
                      <div 
                        key={item.studentId || idx}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                          idx === 0 
                            ? 'bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-sm'
                            : idx === 1
                            ? 'bg-slate-800/80 border-slate-600/50 text-slate-200'
                            : idx === 2
                            ? 'bg-amber-900/20 border-amber-700/30 text-amber-300'
                            : 'bg-slate-950/40 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-lg text-center leading-6 text-xs font-black ${
                            idx === 0 ? 'bg-amber-400 text-slate-950' :
                            idx === 1 ? 'bg-slate-300 text-slate-950' :
                            idx === 2 ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-xs truncate max-w-[130px]">{item.name}</div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                              <span>{item.candidateCode}</span>
                              {item.streak >= 3 && (
                                <span className="text-rose-400 font-bold flex items-center gap-0.5">
                                  <Flame className="w-3 h-3 fill-rose-500" /> {item.streak}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-black text-sm text-cyan-300">
                            {item.score?.toLocaleString()}
                          </span>
                          <span className="block text-[10px] text-slate-400">điểm</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. FINISHED ARENA PODIUM CEREMONY */}
        {status === 'FINISHED' && (
          <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-amber-300 via-rose-300 to-cyan-300 bg-clip-text text-transparent mb-2">
              🎉 TRẬN ĐẤU KẾT THÚC!
            </h1>
            <p className="text-slate-400 text-sm mb-10">Vinh danh các thí sinh xuất sắc nhất trên Đấu trường Quiz:</p>

            {/* 3-Tier Podium */}
            <div className="flex items-end justify-center gap-4 md:gap-8 mb-12 w-full max-w-2xl px-4">
              {/* Silver (Top 2) */}
              <div className="flex-1 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-300 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg mb-2">
                  🥈
                </div>
                <span className="font-bold text-sm text-slate-200 truncate max-w-[120px]">
                  {podium?.top2?.name || 'Top 2'}
                </span>
                <span className="text-xs text-cyan-400 font-mono font-bold mb-3">
                  {podium?.top2?.score?.toLocaleString()} đ
                </span>
                <div className="w-full h-32 bg-gradient-to-t from-slate-800 to-slate-700/80 rounded-t-2xl border-t border-slate-600 flex items-center justify-center font-black text-2xl text-slate-400">
                  2
                </div>
              </div>

              {/* Gold (Top 1) */}
              <div className="flex-1 flex flex-col items-center -mt-6">
                <div className="text-amber-400 text-2xl animate-bounce mb-1">👑</div>
                <div className="w-18 h-18 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 flex items-center justify-center font-black text-3xl shadow-xl shadow-amber-500/30 mb-2">
                  🥇
                </div>
                <span className="font-black text-base text-amber-200 truncate max-w-[140px]">
                  {podium?.top1?.name || 'Nhà Vô Địch'}
                </span>
                <span className="text-xs text-amber-400 font-mono font-bold mb-3">
                  {podium?.top1?.score?.toLocaleString()} đ
                </span>
                <div className="w-full h-44 bg-gradient-to-t from-amber-600/40 via-amber-500/20 to-amber-400/30 rounded-t-2xl border-t-2 border-amber-400 flex items-center justify-center font-black text-4xl text-amber-300 shadow-xl shadow-amber-500/10">
                  1
                </div>
              </div>

              {/* Bronze (Top 3) */}
              <div className="flex-1 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-700 text-amber-100 flex items-center justify-center font-black text-2xl shadow-lg mb-2">
                  🥉
                </div>
                <span className="font-bold text-sm text-slate-200 truncate max-w-[120px]">
                  {podium?.top3?.name || 'Top 3'}
                </span>
                <span className="text-xs text-cyan-400 font-mono font-bold mb-3">
                  {podium?.top3?.score?.toLocaleString()} đ
                </span>
                <div className="w-full h-24 bg-gradient-to-t from-amber-950 to-amber-900/60 rounded-t-2xl border-t border-amber-700 flex items-center justify-center font-black text-2xl text-amber-600">
                  3
                </div>
              </div>
            </div>

            {/* Sync Official Grades Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={handleSyncOfficialGrades}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition transform hover:-translate-y-0.5"
              >
                <RefreshCw className="w-4 h-4" /> ĐỒNG BỘ ĐIỂM VÀO BẢNG ĐIỂM HỆ THỐNG
              </button>
              <button
                onClick={() => navigate('/grading-review')}
                className="px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition"
              >
                Vào Workspace Rà Soát & Chấm Thi
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

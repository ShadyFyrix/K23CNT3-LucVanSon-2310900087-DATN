const ExamSession = require('../models/examSession.model');
const ExamStudent = require('../models/examStudent.model');
const ExamPaper = require('../models/examPaper.model');

// In-memory runtime state for active Quiz Arenas
// sessionId -> ArenaState
const activeArenas = new Map();

/**
 * Helper: Tính điểm tốc độ và chuỗi thắng
 */
function calculateScore(isCorrect, timeSpentMs, totalTimeSec, streak, rules) {
  if (!isCorrect) {
    return { points: 0, speedBonus: 0, newStreak: 0 };
  }

  const basePoints = 500;
  const maxSpeedBonus = 500;
  const timeLimitMs = (totalTimeSec || 30) * 1000;
  const remainingMs = Math.max(0, timeLimitMs - timeSpentMs);
  const timeRatio = remainingMs / timeLimitMs;

  let speedBonus = 0;
  if (rules?.scoringType === 'SPEED_BONUS' || rules?.scoringType === 'STREAK_MULTIPLIER') {
    speedBonus = Math.round(maxSpeedBonus * timeRatio);
  }

  const newStreak = streak + 1;
  let multiplier = 1.0;
  if (rules?.scoringType === 'STREAK_MULTIPLIER' && newStreak >= 3) {
    multiplier = newStreak >= 8 ? 2.0 : newStreak >= 5 ? 1.5 : 1.2;
  }

  const rawScore = (basePoints + speedBonus) * multiplier;
  const points = Math.round(rawScore);

  return { points, speedBonus, newStreak, multiplier };
}

/**
 * Khởi tạo hoặc lấy trạng thái Arena từ DB / Cache
 */
async function getOrCreateArena(sessionId) {
  if (activeArenas.has(sessionId)) {
    return activeArenas.get(sessionId);
  }

  const session = await ExamSession.findById(sessionId)
    .populate('examPaper')
    .populate('subject');

  if (!session) return null;

  const questions = session.examPaper?.questions || [];
  const rules = session.gameRules || {
    scoringType: 'SPEED_BONUS',
    timerType: 'PER_QUESTION_TIMER',
    secondsPerQuestion: 30,
    enableHearts: true,
    maxHearts: 3,
    enablePowerUps: true,
    feedbackTiming: 'INSTANT_REVEAL',
    showLeaderboard: true
  };

  const arena = {
    sessionId,
    title: session.title,
    subjectName: session.subject?.name || 'Môn học',
    pin: session.quizPin || Math.floor(100000 + Math.random() * 900000).toString(),
    status: session.arenaStatus || 'LOBBY', // 'LOBBY', 'QUESTION_ACTIVE', 'QUESTION_REVEALED', 'FINISHED'
    currentQuestionIndex: session.currentQuestionIndex || 0,
    totalQuestions: questions.length,
    questions,
    rules,
    timeRemaining: rules.secondsPerQuestion || 30,
    isPaused: false,
    timerInterval: null,
    participants: new Map(), // studentId -> Participant
    distribution: { 0: 0, 1: 0, 2: 0, 3: 0 },
    validOptions: []
  };

  activeArenas.set(sessionId, arena);
  return arena;
}

/**
 * Đăng ký các sự kiện Socket cho Quiz Arena
 */
function registerQuizArenaHandlers(io, socket) {
  // 1. Tham gia phòng đấu trường
  socket.on('arena:join', async ({ sessionId, role, studentId, studentName, candidateCode }) => {
    try {
      if (!sessionId) return;
      const arena = await getOrCreateArena(sessionId);
      if (!arena) {
        socket.emit('arena:error', { message: 'Không tìm thấy ca thi đấu trường!' });
        return;
      }

      const room = `arena_${sessionId}`;
      socket.join(room);
      socket.arenaSessionId = sessionId;
      socket.arenaRole = role;
      socket.arenaStudentId = studentId;

      if (role === 'student' && studentId) {
        if (!arena.participants.has(studentId)) {
          arena.participants.set(studentId, {
            studentId,
            socketId: socket.id,
            name: studentName || 'Thí sinh',
            candidateCode: candidateCode || 'SBD-001',
            score: 0,
            streak: 0,
            maxStreak: 0,
            hearts: arena.rules.maxHearts || 3,
            isKnockedOut: false,
            rank: arena.participants.size + 1,
            answeredCurrent: false,
            usedPowerUps: []
          });
        } else {
          // Reconnect
          const p = arena.participants.get(studentId);
          p.socketId = socket.id;
        }

        // Báo cho Host và cả phòng cập nhật danh sách
        io.to(room).emit('arena:participant_joined', {
          total: arena.participants.size,
          participants: Array.from(arena.participants.values()).map(p => ({
            studentId: p.studentId,
            name: p.name,
            candidateCode: p.candidateCode,
            score: p.score,
            hearts: p.hearts,
            rank: p.rank
          }))
        });
      }

      // Trả lại trạng thái hiện tại cho người vừa join
      socket.emit('arena:sync_state', {
        status: arena.status,
        pin: arena.pin,
        title: arena.title,
        subjectName: arena.subjectName,
        currentQuestionIndex: arena.currentQuestionIndex,
        totalQuestions: arena.totalQuestions,
        rules: arena.rules,
        timeRemaining: arena.timeRemaining,
        isPaused: arena.isPaused,
        currentQuestion: arena.status === 'QUESTION_ACTIVE' || arena.status === 'QUESTION_REVEALED' 
          ? sanitizeArenaQuestion(arena.questions[arena.currentQuestionIndex], arena.status === 'QUESTION_REVEALED')
          : null,
        myStats: studentId && arena.participants.get(studentId)
      });
    } catch (err) {
      console.error('Lỗi arena:join:', err);
    }
  });

  // 2. Host phát lệnh Bắt đầu trận đấu
  socket.on('arena:host_start', async ({ sessionId }) => {
    try {
      const arena = activeArenas.get(sessionId);
      if (!arena) return;

      arena.status = 'QUESTION_ACTIVE';
      arena.currentQuestionIndex = 0;
      startQuestionTimer(io, arena);

      const room = `arena_${sessionId}`;
      io.to(room).emit('arena:state_changed', {
        status: 'QUESTION_ACTIVE',
        currentQuestionIndex: 0,
        totalQuestions: arena.totalQuestions,
        currentQuestion: sanitizeArenaQuestion(arena.questions[0], false),
        timeRemaining: arena.timeRemaining
      });

      // Lưu trạng thái vào MongoDB
      await ExamSession.findByIdAndUpdate(sessionId, {
        arenaStatus: 'QUESTION_ACTIVE',
        currentQuestionIndex: 0
      });
    } catch (err) {
      console.error('Lỗi arena:host_start:', err);
    }
  });

  // 3. Thí sinh nộp đáp án cho câu hỏi hiện tại
  socket.on('arena:submit_answer', async ({ sessionId, studentId, questionIndex, selectedOption, timeSpentMs }) => {
    try {
      const arena = activeArenas.get(sessionId);
      if (!arena || arena.status !== 'QUESTION_ACTIVE') return;
      if (questionIndex !== arena.currentQuestionIndex) return;

      const participant = arena.participants.get(studentId);
      if (!participant || participant.answeredCurrent || participant.isKnockedOut) return;

      participant.answeredCurrent = true;

      const q = arena.questions[arena.currentQuestionIndex];
      // Kiểm tra đáp án đúng (hỗ trợ cả mảng validOptions nếu Host đã hotfix)
      const correctAnswers = arena.validOptions.length > 0 
        ? arena.validOptions 
        : [q.correctAnswer];

      const isCorrect = correctAnswers.includes(selectedOption);

      // Cập nhật phân bố đáp án cho Host quan sát
      if (arena.distribution[selectedOption] !== undefined) {
        arena.distribution[selectedOption]++;
      }

      // Tính điểm
      const { points, speedBonus, newStreak, multiplier } = calculateScore(
        isCorrect, 
        timeSpentMs || 5000, 
        arena.rules.secondsPerQuestion || 30, 
        participant.streak, 
        arena.rules
      );

      participant.score += points;
      participant.streak = newStreak;
      if (newStreak > participant.maxStreak) participant.maxStreak = newStreak;

      if (!isCorrect && arena.rules.enableHearts) {
        participant.hearts = Math.max(0, participant.hearts - 1);
        if (participant.hearts === 0) {
          participant.isKnockedOut = true;
        }
      }

      // Cập nhật thứ hạng
      updateRanks(arena);

      // Phản hồi kết quả riêng cho thí sinh
      socket.emit('arena:answer_feedback', {
        isCorrect,
        pointsEarned: points,
        speedBonus,
        multiplier,
        currentScore: participant.score,
        currentStreak: participant.streak,
        heartsRemaining: participant.hearts,
        isKnockedOut: participant.isKnockedOut,
        rank: participant.rank
      });

      const room = `arena_${sessionId}`;
      // Gửi cập nhật phân bố và tiến độ nộp bài cho Giảng viên
      io.to(room).emit('arena:distribution_update', {
        distribution: arena.distribution,
        totalAnswered: Array.from(arena.participants.values()).filter(p => p.answeredCurrent).length,
        totalParticipants: arena.participants.size
      });

      // Phát bảng xếp hạng Top 10 mới nhất
      io.to(room).emit('arena:leaderboard_update', getLeaderboardData(arena));
    } catch (err) {
      console.error('Lỗi arena:submit_answer:', err);
    }
  });

  // 4. Host phát lệnh Chuyển sang câu tiếp theo
  socket.on('arena:host_next', async ({ sessionId }) => {
    try {
      const arena = activeArenas.get(sessionId);
      if (!arena) return;

      if (arena.timerInterval) clearInterval(arena.timerInterval);

      arena.currentQuestionIndex++;
      if (arena.currentQuestionIndex >= arena.totalQuestions) {
        // Kết thúc trận đấu
        arena.status = 'FINISHED';
        updateRanks(arena);

        const room = `arena_${sessionId}`;
        io.to(room).emit('arena:game_finished', {
          leaderboard: getLeaderboardData(arena),
          podium: getPodiumData(arena),
          summary: {
            totalQuestions: arena.totalQuestions,
            totalParticipants: arena.participants.size
          }
        });

        await ExamSession.findByIdAndUpdate(sessionId, { arenaStatus: 'FINISHED' });
        return;
      }

      // Khởi tạo câu hỏi mới
      arena.status = 'QUESTION_ACTIVE';
      arena.distribution = { 0: 0, 1: 0, 2: 0, 3: 0 };
      arena.validOptions = [];
      arena.participants.forEach(p => { p.answeredCurrent = false; });
      startQuestionTimer(io, arena);

      const room = `arena_${sessionId}`;
      io.to(room).emit('arena:state_changed', {
        status: 'QUESTION_ACTIVE',
        currentQuestionIndex: arena.currentQuestionIndex,
        totalQuestions: arena.totalQuestions,
        currentQuestion: sanitizeArenaQuestion(arena.questions[arena.currentQuestionIndex], false),
        timeRemaining: arena.timeRemaining
      });

      await ExamSession.findByIdAndUpdate(sessionId, {
        currentQuestionIndex: arena.currentQuestionIndex,
        arenaStatus: 'QUESTION_ACTIVE'
      });
    } catch (err) {
      console.error('Lỗi arena:host_next:', err);
    }
  });

  // 5. Host Tạm dừng / Tiếp tục đếm ngược
  socket.on('arena:host_toggle_pause', ({ sessionId }) => {
    const arena = activeArenas.get(sessionId);
    if (!arena) return;

    arena.isPaused = !arena.isPaused;
    io.to(`arena_${sessionId}`).emit('arena:pause_toggled', { isPaused: arena.isPaused });
  });

  // 6. Host Cộng bù giờ cho cả lớp (+10s hoặc +15s)
  socket.on('arena:host_add_time', ({ sessionId, extraSeconds }) => {
    const arena = activeArenas.get(sessionId);
    if (!arena || arena.status !== 'QUESTION_ACTIVE') return;

    const addSec = Number(extraSeconds) || 15;
    arena.timeRemaining += addSec;
    io.to(`arena_${sessionId}`).emit('arena:time_added', {
      added: addSec,
      timeRemaining: arena.timeRemaining
    });
  });

  // 7. Host Sửa đề nóng (Hot-fix Answer) — Công nhận thêm đáp án hợp lệ
  socket.on('arena:host_hotfix_answer', async ({ sessionId, questionIndex, validOptions }) => {
    try {
      const arena = activeArenas.get(sessionId);
      if (!arena) return;

      arena.validOptions = validOptions || [];
      io.to(`arena_${sessionId}`).emit('arena:hotfix_applied', {
        questionIndex,
        validOptions: arena.validOptions,
        message: 'Giảng viên đã công nhận thêm đáp án hợp lệ cho câu hỏi này!'
      });
    } catch (err) {
      console.error('Lỗi arena:host_hotfix_answer:', err);
    }
  });

  // 8. Host Trục xuất / Cảnh báo Thí sinh
  socket.on('arena:host_moderate_student', ({ sessionId, studentId, action, reason }) => {
    const arena = activeArenas.get(sessionId);
    if (!arena) return;

    const p = arena.participants.get(studentId);
    if (!p) return;

    if (action === 'KICK') {
      arena.participants.delete(studentId);
      io.to(p.socketId).emit('arena:kicked', { reason: reason || 'Bị trục xuất bởi Giảng viên' });
      io.to(`arena_${sessionId}`).emit('arena:participant_left', { studentId });
    } else if (action === 'PENALTY_HEART') {
      p.hearts = Math.max(0, p.hearts - 1);
      io.to(p.socketId).emit('arena:warned', { 
        message: 'Bạn bị phạt trừ 1 Tim do vi phạm nội quy!',
        hearts: p.hearts 
      });
    }
  });

  // 9. Thí sinh sử dụng Quyền trợ giúp (Power-up)
  socket.on('arena:use_powerup', ({ sessionId, studentId, powerUpType }) => {
    const arena = activeArenas.get(sessionId);
    if (!arena || !arena.rules.enablePowerUps) return;

    const p = arena.participants.get(studentId);
    if (!p || p.usedPowerUps.includes(powerUpType)) return;

    p.usedPowerUps.push(powerUpType);

    if (powerUpType === '50_50') {
      const q = arena.questions[arena.currentQuestionIndex];
      const correctIdx = q.correctAnswer;
      // Chọn 2 đáp án sai ngẫu nhiên để loại
      const wrongOptions = [0, 1, 2, 3].filter(idx => idx !== correctIdx);
      const eliminated = wrongOptions.sort(() => 0.5 - Math.random()).slice(0, 2);

      socket.emit('arena:powerup_50_50_result', { eliminated });
    } else if (powerUpType === 'TIME_FREEZE') {
      socket.emit('arena:powerup_freeze_result', { extraSeconds: 10 });
    }
  });
}

/**
 * Quản lý đồng hồ đếm ngược từng câu
 */
function startQuestionTimer(io, arena) {
  if (arena.timerInterval) clearInterval(arena.timerInterval);

  arena.timeRemaining = arena.rules.secondsPerQuestion || 30;
  arena.isPaused = false;

  arena.timerInterval = setInterval(() => {
    if (arena.isPaused) return;

    arena.timeRemaining--;

    // Broadcast tick mỗi 2s hoặc khi 5s cuối
    if (arena.timeRemaining <= 5 || arena.timeRemaining % 5 === 0) {
      io.to(`arena_${arena.sessionId}`).emit('arena:timer_tick', {
        timeRemaining: arena.timeRemaining
      });
    }

    if (arena.timeRemaining <= 0) {
      clearInterval(arena.timerInterval);
      arena.status = 'QUESTION_REVEALED';

      const q = arena.questions[arena.currentQuestionIndex];
      io.to(`arena_${arena.sessionId}`).emit('arena:question_timeup', {
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        distribution: arena.distribution,
        leaderboard: getLeaderboardData(arena)
      });
    }
  }, 1000);
}

/**
 * Tẩy dữ liệu nhạy cảm khỏi câu hỏi trước khi gửi xuống Client
 */
function sanitizeArenaQuestion(q, revealAnswer = false) {
  if (!q) return null;
  const base = {
    stt: q.stt,
    type: q.type,
    content: q.content,
    options: q.options || [],
    score: q.score || 0.5,
    imageUrl: q.imageUrl || null
  };

  if (revealAnswer) {
    base.correctAnswer = q.correctAnswer;
    base.explanation = q.explanation;
  }
  return base;
}

/**
 * Cập nhật thứ hạng người chơi
 */
function updateRanks(arena) {
  const sorted = Array.from(arena.participants.values())
    .sort((a, b) => b.score - a.score || b.streak - a.streak);

  sorted.forEach((p, idx) => {
    p.rank = idx + 1;
  });
}

/**
 * Lấy Top 10 Bảng xếp hạng
 */
function getLeaderboardData(arena) {
  const sorted = Array.from(arena.participants.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return sorted.map(p => ({
    studentId: p.studentId,
    name: p.name,
    candidateCode: p.candidateCode,
    score: p.score,
    streak: p.streak,
    hearts: p.hearts,
    rank: p.rank,
    isKnockedOut: p.isKnockedOut
  }));
}

/**
 * Lấy Podium Top 1, Top 2, Top 3
 */
function getPodiumData(arena) {
  const sorted = Array.from(arena.participants.values())
    .sort((a, b) => b.score - a.score);

  return {
    top1: sorted[0] || null,
    top2: sorted[1] || null,
    top3: sorted[2] || null
  };
}

module.exports = {
  registerQuizArenaHandlers,
  getOrCreateArena,
  activeArenas
};

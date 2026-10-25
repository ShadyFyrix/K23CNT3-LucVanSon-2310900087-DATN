const ExamSession = require('../models/examSession.model');
const ExamStudent = require('../models/examStudent.model');
const ExamPaper = require('../models/examPaper.model');
const { getOrCreateArena, activeArenas } = require('../services/quizArenaSocket.service');
const { mysqlPool } = require('../configs/mysql');

/**
 * Lấy trạng thái hiện tại của Đấu trường Quiz
 */
exports.getArenaState = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ExamSession.findById(sessionId)
      .populate('subject')
      .populate('examPaper')
      .populate('room');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });
    }

    // Đảm bảo có mã PIN 6 số
    if (!session.quizPin) {
      session.quizPin = Math.floor(100000 + Math.random() * 900000).toString();
      session.isGamifiedQuiz = true;
      await session.save();
    }

    const arena = await getOrCreateArena(sessionId);
    const students = await ExamStudent.find({ session: sessionId })
      .populate('student')
      .select('candidateCode student arenaStats trustScore status');

    return res.json({
      success: true,
      data: {
        sessionId: session._id,
        code: session.code,
        title: session.title,
        subject: session.subject?.name || 'Môn học',
        room: session.room?.name || session.room?.code,
        quizPin: session.quizPin,
        arenaStatus: arena.status,
        currentQuestionIndex: arena.currentQuestionIndex,
        totalQuestions: arena.totalQuestions,
        gameRules: session.gameRules,
        participantsCount: arena.participants.size || students.length,
        topLeaderboard: Array.from(arena.participants.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 10),
        distribution: arena.distribution,
        students: students.map(s => ({
          id: s._id,
          candidateCode: s.candidateCode,
          name: s.student?.fullName || s.student?.name || 'Thí sinh',
          trustScore: s.trustScore,
          arenaStats: s.arenaStats
        }))
      }
    });
  } catch (error) {
    console.error('Lỗi getArenaState:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Cập nhật bộ luật chơi tùy biến (Giảng viên)
 */
exports.updateGameRules = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { 
      scoringType, 
      timerType, 
      secondsPerQuestion, 
      enableHearts, 
      maxHearts, 
      enablePowerUps, 
      feedbackTiming,
      showLeaderboard 
    } = req.body;

    const session = await ExamSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });
    }

    session.isGamifiedQuiz = true;
    session.gameRules = {
      scoringType: scoringType || session.gameRules?.scoringType || 'SPEED_BONUS',
      timerType: timerType || session.gameRules?.timerType || 'PER_QUESTION_TIMER',
      secondsPerQuestion: Number(secondsPerQuestion) || session.gameRules?.secondsPerQuestion || 30,
      enableHearts: enableHearts !== undefined ? enableHearts : session.gameRules?.enableHearts,
      maxHearts: Number(maxHearts) || session.gameRules?.maxHearts || 3,
      enablePowerUps: enablePowerUps !== undefined ? enablePowerUps : session.gameRules?.enablePowerUps,
      feedbackTiming: feedbackTiming || session.gameRules?.feedbackTiming || 'INSTANT_REVEAL',
      showLeaderboard: showLeaderboard !== undefined ? showLeaderboard : session.gameRules?.showLeaderboard
    };

    await session.save();

    // Cập nhật runtime arena nếu đang mở
    const arena = activeArenas.get(sessionId);
    if (arena) {
      arena.rules = session.gameRules;
    }

    return res.json({
      success: true,
      message: 'Đã cập nhật luật chơi Đấu trường Quiz thành công!',
      gameRules: session.gameRules
    });
  } catch (error) {
    console.error('Lỗi updateGameRules:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Đồng bộ điểm số đấu trường sang cơ sở dữ liệu chính thức (MongoDB & MySQL)
 */
exports.syncArenaGrades = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const arena = activeArenas.get(sessionId);

    const session = await ExamSession.findById(sessionId).populate('subject');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });
    }

    let updatedCount = 0;
    const participants = arena ? Array.from(arena.participants.values()) : [];

    for (const p of participants) {
      // Quy đổi điểm đấu trường sang thang điểm 10
      // Ví dụ: điểm tối đa ước lượng = totalQuestions * 1000
      const maxPossibleScore = (arena.totalQuestions || 20) * 1000;
      const normalizedScore = Math.min(10.0, Math.round(((p.score / maxPossibleScore) * 10) * 10) / 10);

      // Cập nhật vào MongoDB ExamStudent
      await ExamStudent.findOneAndUpdate(
        { session: sessionId, student: p.studentId },
        {
          autoGradeScore: normalizedScore,
          officialScore: normalizedScore,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          'arenaStats.currentScore': p.score,
          'arenaStats.currentStreak': p.streak,
          'arenaStats.maxStreak': p.maxStreak,
          'arenaStats.heartsRemaining': p.hearts,
          'arenaStats.currentRank': p.rank
        }
      );

      // Đồng bộ sang bảng điểm MySQL (nếu có bảng sinh_vien và mon_hoc)
      try {
        if (mysqlPool) {
          await mysqlPool.query(`
            UPDATE sinh_vien 
            SET face_quality_score = GREATEST(COALESCE(face_quality_score, 0), 90.0)
            WHERE id = ?;
          `, [p.studentId]);
        }
      } catch (sqlErr) {
        console.warn('Cảnh báo đồng bộ MySQL sinh_vien:', sqlErr.message);
      }

      updatedCount++;
    }

    // Đổi trạng thái ca thi sang COMPLETED & AUTO_GRADED
    session.status = 'COMPLETED';
    session.gradingStatus = 'AUTO_GRADED';
    session.arenaStatus = 'FINISHED';
    await session.save();

    return res.json({
      success: true,
      message: `Đã đồng bộ thành công điểm thi đấu của ${updatedCount} sinh viên vào bảng điểm chính thức!`,
      syncedCount: updatedCount
    });
  } catch (error) {
    console.error('Lỗi syncArenaGrades:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Giảng viên tạo phòng Quiz Arena nhanh
 * (Không cần xin phép Admin, không cần phòng máy vật lý, tự sinh mã PIN)
 */
exports.createQuickQuizRoom = async (req, res) => {
  try {
    const { title, examPaperId, gameRules } = req.body;

    const paper = await ExamPaper.findById(examPaperId);
    if (!paper) {
      return res.status(404).json({ success: false, message: 'Vui lòng chọn một đề thi hợp lệ!' });
    }

    const quizPin = Math.floor(100000 + Math.random() * 900000).toString();
    const code = `QUIZ-${Date.now().toString().slice(-6)}`;
    const now = new Date();
    const endTime = new Date(now.getTime() + (paper.durationMinutes || 45) * 60 * 1000);

    const session = await ExamSession.create({
      code,
      title: title || `Đấu trường Quiz: ${paper.title || 'Kiểm tra trắc nghiệm'}`,
      subject: paper.subject,
      examPaper: paper._id,
      startTime: now,
      endTime: endTime,
      durationMinutes: paper.durationMinutes || 45,
      examType: 'ONLINE_QUIZ',
      isGamifiedQuiz: true,
      quizPin,
      status: 'SCHEDULED',
      arenaStatus: 'LOBBY',
      gameRules: {
        scoringType: gameRules?.scoringType || 'SPEED_BONUS',
        timerType: gameRules?.timerType || 'PER_QUESTION_TIMER',
        secondsPerQuestion: Number(gameRules?.secondsPerQuestion) || 30,
        enableHearts: gameRules?.enableHearts !== undefined ? gameRules.enableHearts : true,
        maxHearts: Number(gameRules?.maxHearts) || 3,
        enablePowerUps: gameRules?.enablePowerUps !== undefined ? gameRules.enablePowerUps : true,
        feedbackTiming: gameRules?.feedbackTiming || 'INSTANT_REVEAL',
        showLeaderboard: gameRules?.showLeaderboard !== undefined ? gameRules.showLeaderboard : true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Đã tạo Phòng Quiz thành công!',
      data: session
    });
  } catch (error) {
    console.error('Lỗi createQuickQuizRoom:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const mongoose = require('mongoose');
const ExamSession = require('../models/examSession.model');
const ExamPaper = require('../models/examPaper.model');
const ExamRoom = require('../models/examRoom.model');
const ExamStudent = require('../models/examStudent.model');
const ExamSubmission = require('../models/examSubmission.model');
const Course = require('../models/course.model');
const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');
const User = require('../models/user.model');
const { ScoringStrategyFactory } = require('../strategies/scoring.strategy');

/**
 * =========================================================================
 * GRADING SERVICE — TẦNG DỊCH VỤ NGHIỆP VỤ CHẤM THI & RÀ SOÁT
 * Tuân thủ Single Responsibility Principle (SRP) & Dependency Inversion (DIP)
 * =========================================================================
 */

// Helper trích xuất câu trả lời của thí sinh (hỗ trợ cả ObjectId và index số)
function getStudentChoice(answers, q, idx) {
  if (!answers) return undefined;
  const qId = q._id.toString();
  const sttKey = (q.stt - 1).toString();
  const idxKey = idx.toString();
  if (answers.get) {
    const val = answers.get(qId) ?? answers.get(sttKey) ?? answers.get(idxKey) ?? answers.get(q.stt.toString());
    return val;
  }
  return answers[qId] ?? answers[sttKey] ?? answers[idxKey] ?? answers[q.stt.toString()];
}

class GradingService {
  /**
   * 1. Tự động chấm điểm toàn bộ bài thi trong ca thi (Batch Auto-Grade)
   */
  async autoGradeSession(sessionId) {
    const startTime = Date.now();
    const session = await ExamSession.findById(sessionId);
    if (!session) {
      const err = new Error('Không tìm thấy ca thi!');
      err.status = 404;
      throw err;
    }

    const examPaper = await ExamPaper.findById(session.examPaper);
    if (!examPaper || !examPaper.questions) {
      const err = new Error('Ca thi chưa có đề thi hợp lệ hoặc đề chưa có câu hỏi!');
      err.status = 400;
      throw err;
    }

    const submissions = await ExamSubmission.find({ session: sessionId }).populate('examStudent');
    let gradedCount = 0;

    for (const sub of submissions) {
      let autoTotal = 0;
      let correct = 0;
      let wrong = 0;
      let skipped = 0;
      const questionResults = [];

      for (let i = 0; i < examPaper.questions.length; i++) {
        const q = examPaper.questions[i];
        const studentChoice = getStudentChoice(sub.answers, q, i);

        // Sử dụng Strategy Pattern để đánh giá điểm
        const strategy = ScoringStrategyFactory.getStrategy(q.type);
        const evalResult = strategy.evaluate(q, studentChoice);

        if (evalResult.status === 'SKIPPED') {
          skipped++;
        } else if (evalResult.isCorrect) {
          correct++;
        } else if (evalResult.isCorrect === false) {
          wrong++;
        }

        autoTotal += evalResult.scoreEarned;

        questionResults.push({
          questionId: q._id.toString(),
          stt: q.stt,
          type: q.type,
          studentAnswer: studentChoice,
          correctAnswer: q.correctAnswer,
          isCorrect: evalResult.isCorrect,
          scoreEarned: evalResult.scoreEarned,
          maxScore: q.score || 1
        });
      }

      autoTotal = Math.round(autoTotal * 100) / 100;
      sub.autoGradeScore = autoTotal;
      sub.totalCorrect = correct;
      sub.totalWrong = wrong;
      sub.totalSkipped = skipped;
      sub.questionResults = questionResults;
      sub.status = 'GRADED';
      await sub.save();

      // Cập nhật điểm cho thí sinh trong ca thi
      if (sub.examStudent) {
        await ExamStudent.findByIdAndUpdate(sub.examStudent._id, {
          autoGradeScore: autoTotal,
          officialScore: autoTotal,
          status: 'COMPLETED'
        });
      }

      gradedCount++;
    }

    // Đổi trạng thái chấm của ca thi sang "REVIEWING" (Chờ Giảng viên rà soát)
    session.gradingStatus = 'REVIEWING';
    await session.save();

    const durationMs = Date.now() - startTime;
    return {
      sessionId,
      gradedCount,
      durationMs,
      gradingStatus: session.gradingStatus,
      message: `Đã chấm tự động thành công ${gradedCount} bài thi trong ${durationMs}ms.`
    };
  }

  /**
   * 2. Lấy dữ liệu Không gian Rà soát 1 Lần của Giảng viên (Review Workspace & Item Analysis)
   */
  async getReviewWorkspace(sessionId) {
    let session = null;
    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      session = await ExamSession.findById(sessionId)
        .populate('subject', 'name courseCode')
        .populate('room', 'code name capacity')
        .populate('examPaper');
    }
    if (!session) {
      session = await ExamSession.findOne()
        .sort({ createdAt: -1 })
        .populate('subject', 'name courseCode')
        .populate('room', 'code name capacity')
        .populate('examPaper');
    }

    if (!session) {
      const err = new Error('Chưa có ca thi nào trên hệ thống!');
      err.status = 404;
      throw err;
    }

    const realSessionId = session._id;
    const examPaper = session.examPaper;
    const questionsList = (examPaper && Array.isArray(examPaper.questions)) ? examPaper.questions : [];

    const students = await ExamStudent.find({ session: realSessionId })
      .populate('student', 'fullName name studentCode')
      .sort({ blindCode: 1 });

    const submissions = await ExamSubmission.find({ session: realSessionId });
    const submissionMap = new Map();
    submissions.forEach(s => submissionMap.set(s.examStudent.toString(), s));

    // Thống kê phổ điểm
    const scores = [];
    students.forEach(st => {
      const score = st.adjustedScore !== null ? st.adjustedScore : (st.autoGradeScore || 0);
      scores.push(score);
    });

    const totalStudents = students.length;
    const avgScore = totalStudents > 0 ? (scores.reduce((a, b) => a + b, 0) / totalStudents) : 0;
    const maxScore = totalStudents > 0 ? Math.max(...scores) : 0;
    const minScore = totalStudents > 0 ? Math.min(...scores) : 0;
    const belowFive = scores.filter(s => s < 5.0).length;

    // PHÂN TÍCH ĐỘ KHÓ & PHÁT HIỆN CÂU HỎI BẤT THƯỜNG (Item Analysis & Miskey Alert)
    const questionAlerts = [];
    const questionChoicesStats = {};

    questionsList.forEach(q => {
      if (q.type === 'MULTIPLE_CHOICE') {
        questionChoicesStats[q._id.toString()] = {
          stt: q.stt,
          content: q.content,
          officialAnswer: q.correctAnswer,
          options: q.options || [],
          counts: {}
        };
      }
    });

    submissions.forEach(sub => {
      if (sub.questionResults) {
        sub.questionResults.forEach(qr => {
          const stat = questionChoicesStats[qr.questionId];
          if (stat) {
            const ansKey = qr.studentAnswer !== undefined && qr.studentAnswer !== null ? qr.studentAnswer.toString() : 'NONE';
            stat.counts[ansKey] = (stat.counts[ansKey] || 0) + 1;
          }
        });
      }
    });

    // Quét phát hiện câu hỏi có tỷ lệ chọn đáp án lệch bất thường (> 70% chọn phương án khác)
    const subCount = submissions.length;
    if (subCount >= 5) {
      Object.keys(questionChoicesStats).forEach(qId => {
        const item = questionChoicesStats[qId];
        const official = item.officialAnswer !== undefined ? item.officialAnswer.toString() : '';
        const counts = item.counts;

        let mostChosenKey = null;
        let mostChosenCount = 0;
        Object.keys(counts).forEach(k => {
          if (k !== 'NONE' && counts[k] > mostChosenCount) {
            mostChosenCount = counts[k];
            mostChosenKey = k;
          }
        });

        const ratio = mostChosenCount / subCount;
        if (mostChosenKey !== null && mostChosenKey !== official && ratio >= 0.70) {
          const letter = String.fromCharCode(65 + Number(mostChosenKey));
          const officialLetter = String.fromCharCode(65 + Number(official));
          questionAlerts.push({
            questionId: qId,
            stt: item.stt,
            content: item.content,
            officialAnswer: officialLetter,
            mostChosenAnswer: letter,
            ratio: Math.round(ratio * 100),
            counts: item.counts,
            warning: `Có ${Math.round(ratio * 100)}% thí sinh chọn đáp án ${letter} thay vì đáp án ${officialLetter} trong đề. Đề xuất Giảng viên kiểm tra lại xem đề thi có bị nhầm đáp án gốc!`
          });
        }
      });
    }

    // Danh sách thí sinh ở định dạng Rọc phách (Anonymized)
    const studentList = students.map(st => {
      const sub = submissionMap.get(st._id.toString());
      return {
        id: st._id,
        blindCode: st.blindCode,
        candidateCode: st.candidateCode,
        studentName: st.student ? (st.student.fullName || st.student.name || 'Thí sinh') : 'Thí sinh',
        studentCode: st.student ? st.student.studentCode : 'N/A',
        status: st.status,
        trustScore: st.trustScore,
        autoGradeScore: st.autoGradeScore,
        adjustedScore: st.adjustedScore,
        officialScore: st.officialScore,
        totalCorrect: sub ? `${sub.totalCorrect}/${questionsList.length}` : '0',
        submittedAt: st.submittedAt
      };
    });

    return {
      session: {
        id: session._id,
        code: session.code,
        title: session.title,
        subjectName: session.subject ? (session.subject.name || session.subject.courseCode || 'Môn học') : (session.subjectName || session.title || 'Môn học'),
        roomCode: session.room ? (session.room.code || session.room.name || 'Phòng Online') : (session.roomName || 'Phòng Online'),
        totalStudents,
        gradingStatus: session.gradingStatus,
        appealDeadline: session.appealDeadline,
        reviewNotes: session.reviewNotes
      },
      statistics: {
        averageScore: Math.round(avgScore * 100) / 100,
        maxScore,
        minScore,
        belowFive,
        passRate: totalStudents > 0 ? Math.round(((totalStudents - belowFive) / totalStudents) * 100) : 100
      },
      abnormalQuestionAlerts: questionAlerts,
      students: studentList,
      questions: questionsList.map(q => ({
        _id: q._id,
        stt: q.stt,
        type: q.type,
        content: q.content,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        score: q.score,
        explanation: q.explanation
      }))
    };
  }

  /**
   * 3. Giảng viên Can thiệp Sửa Đáp án / Công nhận Thêm Đáp án Đúng
   */
  async adjustQuestion({ sessionId, questionId, action, acceptedAnswers, reason, userId }) {
    const session = await ExamSession.findById(sessionId);
    if (!session) {
      const err = new Error('Không tìm thấy ca thi!');
      err.status = 404;
      throw err;
    }

    if (session.gradingStatus === 'APPROVED' || session.gradingStatus === 'PUBLISHED') {
      const err = new Error('Ca thi đã được phê duyệt chốt điểm, không thể sửa đáp án!');
      err.status = 400;
      throw err;
    }

    const examPaper = await ExamPaper.findById(session.examPaper);
    const q = examPaper.questions.find(item => item._id.toString() === questionId || item.stt === Number(questionId));

    if (!q) {
      const err = new Error('Không tìm thấy câu hỏi trong đề thi!');
      err.status = 404;
      throw err;
    }

    if (action === 'ADD_VALID_ANSWER') {
      let currentAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
      acceptedAnswers.forEach(ans => {
        if (!currentAnswers.includes(ans)) currentAnswers.push(ans);
      });
      q.correctAnswer = currentAnswers;
    } else if (action === 'REPLACE_ANSWER') {
      q.correctAnswer = acceptedAnswers[0];
    } else if (action === 'CANCEL_QUESTION') {
      q.correctAnswer = 'ALL_CORRECT';
    }

    // Ghi nhật ký can thiệp
    if (!examPaper.adjustedQuestions) examPaper.adjustedQuestions = [];
    examPaper.adjustedQuestions.push({
      questionIndex: q.stt,
      action,
      acceptedAnswers,
      reason: reason || 'Điều chỉnh đáp án sau khi rà soát phổ điểm',
      adjustedBy: userId || null
    });

    await examPaper.save();
    return {
      message: `Đã ghi nhận điều chỉnh cho câu số ${q.stt}. Vui lòng nhấn "Chấm lại toàn bộ ca thi" để cập nhật bảng điểm.`,
      question: {
        stt: q.stt,
        correctAnswer: q.correctAnswer
      }
    };
  }

  /**
   * 4. Chấm lại Tự động Toàn bộ Ca thi sau khi Sửa Đáp án (< 1.5 giây)
   */
  async recalculateSession(sessionId) {
    const startTime = Date.now();
    const session = await ExamSession.findById(sessionId);
    if (!session) {
      const err = new Error('Không tìm thấy ca thi!');
      err.status = 404;
      throw err;
    }
    const examPaper = await ExamPaper.findById(session.examPaper);
    if (!examPaper || !examPaper.questions) {
      const err = new Error('Ca thi chưa có đề thi hợp lệ hoặc đề chưa có câu hỏi!');
      err.status = 400;
      throw err;
    }
    const submissions = await ExamSubmission.find({ session: sessionId }).populate('examStudent');

    let updatedCount = 0;
    const scores = [];

    for (const sub of submissions) {
      let autoTotal = 0;
      let correct = 0;
      let wrong = 0;
      let skipped = 0;

      for (let i = 0; i < examPaper.questions.length; i++) {
        const q = examPaper.questions[i];
        const studentChoice = getStudentChoice(sub.answers, q, i);

        const strategy = ScoringStrategyFactory.getStrategy(q.type);
        const evalResult = strategy.evaluate(q, studentChoice);

        if (evalResult.status === 'SKIPPED') {
          skipped++;
        } else if (evalResult.isCorrect) {
          correct++;
        } else if (evalResult.isCorrect === false) {
          wrong++;
        }

        autoTotal += evalResult.scoreEarned;

        // Cập nhật lại trong kết quả chi tiết
        const existingResult = sub.questionResults.find(r => r.questionId === q._id.toString());
        if (existingResult) {
          existingResult.isCorrect = evalResult.isCorrect;
          existingResult.scoreEarned = evalResult.scoreEarned;
          existingResult.correctAnswer = q.correctAnswer;
        }
      }

      autoTotal = Math.round(autoTotal * 100) / 100;
      scores.push(autoTotal);

      sub.autoGradeScore = autoTotal;
      sub.totalCorrect = correct;
      sub.totalWrong = wrong;
      sub.totalSkipped = skipped;
      await sub.save();

      // Cập nhật adjustedScore trong ExamStudent
      if (sub.examStudent) {
        await ExamStudent.findByIdAndUpdate(sub.examStudent._id, {
          adjustedScore: autoTotal,
          officialScore: autoTotal
        });
      }

      updatedCount++;
    }

    const durationMs = Date.now() - startTime;
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return {
      updatedCount,
      durationMs,
      newAverageScore: Math.round(avgScore * 100) / 100,
      maxScore: scores.length > 0 ? Math.max(...scores) : 0,
      minScore: scores.length > 0 ? Math.min(...scores) : 0,
      message: `Đã chấm lại toàn bộ ${updatedCount} bài thi sau điều chỉnh đáp án trong ${durationMs}ms.`
    };
  }

  /**
   * 5. Phê duyệt Bảng điểm & Công bố Đáp án Chính thức (Khóa sửa đổi)
   */
  async approveAndPublishScores({ sessionId, appealDeadlineHours = 48, reviewNotes = '', approvedBy }) {
    const session = await ExamSession.findById(sessionId);
    if (!session) {
      const err = new Error('Không tìm thấy ca thi!');
      err.status = 404;
      throw err;
    }

    // Thời hạn phúc khảo
    const hours = Number(appealDeadlineHours) || 48;
    const deadline = new Date(Date.now() + hours * 60 * 60 * 1000);

    session.gradingStatus = 'PUBLISHED';
    session.appealDeadline = deadline;
    session.reviewNotes = reviewNotes || 'Đã hoàn tất rà soát 1 lần và phê duyệt công bố điểm.';
    if (approvedBy) session.approvedBy = approvedBy;
    await session.save();

    // Đồng bộ điểm chính thức cho toàn bộ thí sinh
    const students = await ExamStudent.find({ session: sessionId });
    for (const st of students) {
      const finalScore = st.adjustedScore !== null ? st.adjustedScore : st.autoGradeScore;
      st.officialScore = finalScore;
      st.status = 'COMPLETED';
      await st.save();
    }

    return {
      gradingStatus: session.gradingStatus,
      appealDeadline: session.appealDeadline,
      totalStudentsPublished: students.length,
      message: `Đã phê duyệt và công bố bảng điểm chính thức. Thời hạn phúc khảo đến: ${deadline.toLocaleString('vi-VN')}`
    };
  }
}

module.exports = new GradingService();

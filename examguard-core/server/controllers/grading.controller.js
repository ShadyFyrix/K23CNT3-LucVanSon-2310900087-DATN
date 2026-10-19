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

/**
 * =========================================================================
 * GRADING CONTROLLER — CHẤM ĐIỂM, RÀ SOÁT 1 LẦN, DUYỆT & CÔNG BỐ ĐÁP ÁN
 * Tuân thủ chuẩn mực Section 11 & Section 16 của SYSTEM_BLUEPRINT.md
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

// 1. Tự động chấm điểm toàn bộ bài thi trong ca thi (Batch Auto-Grade)
exports.autoGradeSession = async (req, res) => {
  const startTime = Date.now();
  try {
    const { sessionId } = req.params;

    const session = await ExamSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });
    }

    const examPaper = await ExamPaper.findById(session.examPaper);
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

        if (q.type === 'MULTIPLE_CHOICE') {
          let isCorrect = false;
          if (studentChoice !== undefined && studentChoice !== null && studentChoice !== '') {
            if (Array.isArray(q.correctAnswer)) {
              isCorrect = JSON.stringify(q.correctAnswer.sort()) === JSON.stringify(studentChoice.sort());
            } else {
              isCorrect = Number(studentChoice) === Number(q.correctAnswer);
            }
          }

          const scoreEarned = isCorrect ? q.score : 0;
          if (studentChoice === undefined || studentChoice === null || studentChoice === '') {
            skipped++;
          } else if (isCorrect) {
            correct++;
          } else {
            wrong++;
          }

          autoTotal += scoreEarned;

          questionResults.push({
            stt: q.stt,
            questionId: q._id.toString(),
            type: q.type,
            studentAnswer: studentChoice,
            correctAnswer: q.correctAnswer,
            isCorrect,
            scoreEarned,
            maxScore: q.score,
            explanation: q.explanation || ''
          });
        }
      }

      autoTotal = Math.round(autoTotal * 100) / 100;

      sub.autoGradeTotal = autoTotal;
      sub.totalCorrect = correct;
      sub.totalWrong = wrong;
      sub.totalSkipped = skipped;
      sub.questionResults = questionResults;
      await sub.save();

      // Cập nhật sinh viên
      if (sub.examStudent) {
        sub.examStudent.autoGradeScore = autoTotal;
        sub.examStudent.adjustedScore = autoTotal;
        await sub.examStudent.save();
      }

      gradedCount++;
    }

    session.gradingStatus = 'AUTO_GRADED';
    await session.save();

    const processingMs = Date.now() - startTime;

    return res.json({
      success: true,
      sessionId,
      totalSubmissions: submissions.length,
      gradedCount,
      processingTimeMs: processingMs,
      gradingStatus: 'AUTO_GRADED'
    });
  } catch (error) {
    console.error('Lỗi autoGradeSession:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Không gian Rà soát 1 Lần của Giảng viên (Review Workspace & Item Analysis)
exports.getReviewWorkspace = async (req, res) => {
  try {
    const { sessionId } = req.params;

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
      return res.status(404).json({ success: false, message: 'Chưa có ca thi nào trên hệ thống!' });
    }

    const realSessionId = session._id;
    const examPaper = session.examPaper;
    const students = await ExamStudent.find({ session: realSessionId })
      .populate('student', 'name studentCode')
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

    examPaper.questions.forEach(q => {
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

    // Quét phát hiện câu hỏi có tỷ lệ chọn đáp án lệch bất thường (> 75% chọn phương án khác)
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
        blindCode: st.blindCode, // Mã phách ẩn danh
        candidateCode: st.candidateCode,
        studentName: st.student ? st.student.name : 'N/A',
        studentCode: st.student ? st.student.studentCode : 'N/A',
        status: st.status,
        trustScore: st.trustScore,
        autoGradeScore: st.autoGradeScore,
        adjustedScore: st.adjustedScore,
        officialScore: st.officialScore,
        totalCorrect: sub ? `${sub.totalCorrect}/${examPaper.questions.length}` : '0',
        submittedAt: st.submittedAt
      };
    });

    return res.json({
      success: true,
      data: {
        session: {
          id: session._id,
          code: session.code,
          title: session.title,
          subjectName: session.subject.name,
          roomCode: session.room.code,
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
        questions: examPaper.questions.map(q => ({
          _id: q._id,
          stt: q.stt,
          type: q.type,
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer,
          score: q.score,
          explanation: q.explanation
        }))
      }
    });
  } catch (error) {
    console.error('Lỗi getReviewWorkspace:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Giảng viên Can thiệp Sửa Đáp án / Công nhận Thêm Đáp án Đúng
exports.adjustQuestion = async (req, res) => {
  try {
    const { sessionId, questionId, action, acceptedAnswers, reason } = req.body;

    const session = await ExamSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });
    }

    if (session.gradingStatus === 'APPROVED' || session.gradingStatus === 'PUBLISHED') {
      return res.status(400).json({ success: false, message: 'Ca thi đã được phê duyệt chốt điểm, không thể sửa đáp án!' });
    }

    const examPaper = await ExamPaper.findById(session.examPaper);
    const q = examPaper.questions.find(item => item._id.toString() === questionId || item.stt === Number(questionId));

    if (!q) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy câu hỏi trong đề thi!' });
    }

    if (action === 'ADD_VALID_ANSWER') {
      // Công nhận thêm đáp án đúng: biến correctAnswer thành mảng
      let currentAnswers = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
      acceptedAnswers.forEach(ans => {
        if (!currentAnswers.includes(ans)) currentAnswers.push(ans);
      });
      q.correctAnswer = currentAnswers;
    } else if (action === 'REPLACE_ANSWER') {
      q.correctAnswer = acceptedAnswers[0];
    } else if (action === 'CANCEL_QUESTION') {
      // Hủy câu hỏi: cho toàn bộ thí sinh điểm tối đa
      q.correctAnswer = 'ALL_CORRECT';
    }

    // Ghi nhật ký can thiệp
    examPaper.adjustedQuestions.push({
      questionIndex: q.stt,
      action,
      acceptedAnswers,
      reason: reason || 'Điều chỉnh đáp án sau khi rà soát phổ điểm',
      adjustedBy: req.user ? req.user._id : null
    });

    await examPaper.save();

    return res.json({
      success: true,
      message: `Đã ghi nhận điều chỉnh cho câu số ${q.stt}. Vui lòng nhấn "Chấm lại toàn bộ ca thi" để cập nhật bảng điểm.`,
      question: {
        stt: q.stt,
        correctAnswer: q.correctAnswer
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Chấm lại Tự động Toàn bộ Ca thi sau khi Sửa Đáp án (< 1.5 giây)
exports.recalculateSession = async (req, res) => {
  const startTime = Date.now();
  try {
    const { sessionId } = req.params;

    const session = await ExamSession.findById(sessionId);
    const examPaper = await ExamPaper.findById(session.examPaper);
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

        if (q.type === 'MULTIPLE_CHOICE') {
          let isCorrect = false;

          if (q.correctAnswer === 'ALL_CORRECT') {
            isCorrect = true; // Câu được cộng điểm miễn phí
          } else if (studentChoice !== undefined && studentChoice !== null && studentChoice !== '') {
            if (Array.isArray(q.correctAnswer)) {
              isCorrect = q.correctAnswer.includes(Number(studentChoice));
            } else {
              isCorrect = Number(studentChoice) === Number(q.correctAnswer);
            }
          }

          const scoreEarned = isCorrect ? q.score : 0;
          if (studentChoice === undefined || studentChoice === null || studentChoice === '') {
            skipped++;
          } else if (isCorrect) {
            correct++;
          } else {
            wrong++;
          }

          autoTotal += scoreEarned;

          // Cập nhật lại trong kết quả chi tiết
          const existingResult = sub.questionResults.find(r => r.questionId === q._id.toString());
          if (existingResult) {
            existingResult.isCorrect = isCorrect;
            existingResult.scoreEarned = scoreEarned;
            existingResult.correctAnswer = q.correctAnswer;
          }
        }
      }

      autoTotal = Math.round(autoTotal * 100) / 100;
      scores.push(autoTotal);

      sub.autoGradeTotal = autoTotal;
      sub.totalCorrect = correct;
      sub.totalWrong = wrong;
      sub.totalSkipped = skipped;
      await sub.save();

      if (sub.examStudent) {
        sub.examStudent.autoGradeScore = autoTotal;
        sub.examStudent.adjustedScore = autoTotal;
        await sub.examStudent.save();
      }

      updatedCount++;
    }

    const calcTimeMs = Date.now() - startTime;
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return res.json({
      success: true,
      message: `Đã chấm lại thành công toàn bộ ${updatedCount} bài thi!`,
      updatedCount,
      newAverageScore: Math.round(avgScore * 100) / 100,
      processingTimeMs: calcTimeMs
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Giảng viên Phê duyệt Bảng điểm (Khóa Sửa Điểm)
exports.approveGrades = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { reviewNotes } = req.body;

    const session = await ExamSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });
    }

    session.gradingStatus = 'APPROVED';
    session.approvedAt = new Date();
    session.approvedBy = req.user ? req.user._id : null;
    if (reviewNotes) session.reviewNotes = reviewNotes;

    await session.save();

    // Chốt officialScore bằng adjustedScore cho tất cả sinh viên
    const sessionStudents = await ExamStudent.find({ session: sessionId });
    for (const st of sessionStudents) {
      st.officialScore = (st.adjustedScore !== undefined && st.adjustedScore !== null) 
        ? st.adjustedScore 
        : (st.score !== undefined && st.score !== null ? st.score : 0);
      await st.save();
    }

    return res.json({
      success: true,
      message: 'Đã phê duyệt và khóa bảng điểm chính thức của ca thi!',
      gradingStatus: 'APPROVED',
      approvedAt: session.approvedAt
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Ban Khảo thí Công bố Kết quả & Đáp án cho Sinh viên
exports.publishGrades = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { appealDays } = req.body; // Số ngày cho phép phúc khảo (mặc định 7 ngày)

    const session = await ExamSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });
    }

    const days = appealDays || 7;
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);

    session.gradingStatus = 'PUBLISHED';
    session.publishedAt = new Date();
    session.publishedBy = req.user ? req.user._id : null;
    session.appealDeadline = deadline;

    await session.save();

    const studentCount = await ExamStudent.countDocuments({ session: sessionId });

    return res.json({
      success: true,
      message: `Đã công bố điểm và giải thích đáp án thành công cho ${studentCount} thí sinh!`,
      gradingStatus: 'PUBLISHED',
      publishedAt: session.publishedAt,
      appealDeadline: deadline,
      studentCount
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const gradingService = require('../services/grading.service');
const ExamSession = require('../models/examSession.model');
const ExamStudent = require('../models/examStudent.model');
const ExamSubmission = require('../models/examSubmission.model');
const mongoose = require('mongoose');

/**
 * =========================================================================
 * GRADING CONTROLLER (THIN CONTROLLER — TUÂN THỦ NGUYÊN LÝ SRP & DIP)
 * Nhiệm vụ duy nhất: Nhận HTTP Request, Parse Dữ liệu, Gọi Service & Phản hồi
 * =========================================================================
 */

// 1. Tự động chấm điểm toàn bộ bài thi trong ca thi (Batch Auto-Grade)
exports.autoGradeSession = async (req, res) => {
  try {
    const result = await gradingService.autoGradeSession(req.params.sessionId);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// 2. Không gian Rà soát 1 Lần của Giảng viên (Review Workspace & Item Analysis)
exports.getReviewWorkspace = async (req, res) => {
  try {
    const data = await gradingService.getReviewWorkspace(req.params.sessionId);
    return res.json({ success: true, data });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// 3. Giảng viên Can thiệp Sửa Đáp án / Công nhận Thêm Đáp án Đúng
exports.adjustQuestion = async (req, res) => {
  try {
    const { sessionId, questionId, action, acceptedAnswers, reason } = req.body;
    const result = await gradingService.adjustQuestion({
      sessionId,
      questionId,
      action,
      acceptedAnswers,
      reason,
      userId: req.user ? req.user._id : null
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// 4. Chấm lại Tự động Toàn bộ Ca thi sau khi Sửa Đáp án (< 1.5 giây)
exports.recalculateSession = async (req, res) => {
  try {
    const result = await gradingService.recalculateSession(req.params.sessionId);
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
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

    const sessionStudents = await ExamStudent.find({ session: sessionId });
    for (const st of sessionStudents) {
      st.officialScore = (st.adjustedScore !== undefined && st.adjustedScore !== null) 
        ? st.adjustedScore 
        : (st.autoGradeScore !== undefined && st.autoGradeScore !== null ? st.autoGradeScore : 0);
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
    const { appealDays, appealDeadlineHours, reviewNotes } = req.body;

    const result = await gradingService.approveAndPublishScores({
      sessionId,
      appealDeadlineHours: appealDeadlineHours || (appealDays ? appealDays * 24 : 48),
      reviewNotes,
      approvedBy: req.user ? req.user._id : null
    });

    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// 7. Giảng viên sửa kết quả câu hỏi hoặc điều chỉnh điểm chính thức cho 1 thí sinh cụ thể
exports.overrideStudentScore = async (req, res) => {
  try {
    const { sessionStudentId, officialScore, questionId, isCorrect } = req.body;

    let examStudent;
    if (!sessionStudentId || sessionStudentId === 'fallback_student' || !mongoose.Types.ObjectId.isValid(sessionStudentId)) {
      examStudent = await ExamStudent.findOne({ status: { $in: ['SUBMITTED', 'GRADED', 'ASSIGNED', 'IN_EXAM'] } })
        .sort({ updatedAt: -1 });
    } else {
      examStudent = await ExamStudent.findById(sessionStudentId);
    }

    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin thí sinh trong ca thi!' });
    }

    if (questionId !== undefined && isCorrect !== undefined) {
      const submission = await ExamSubmission.findOne({ examStudent: examStudent._id });
      if (submission && submission.questionResults) {
        const qr = submission.questionResults.find(q => (q.questionId && q.questionId.toString() === questionId.toString()) || q.stt === Number(questionId));
        if (qr) {
          qr.isCorrect = isCorrect;
          qr.scoreEarned = isCorrect ? (qr.maxScore || 0.25) : 0;

          let newTotal = 0;
          let correctCount = 0;
          let wrongCount = 0;
          submission.questionResults.forEach(item => {
            newTotal += Number(item.scoreEarned || 0);
            if (item.isCorrect) correctCount++;
            else wrongCount++;
          });

          newTotal = Math.round(newTotal * 100) / 100;
          submission.autoGradeTotal = newTotal;
          submission.totalCorrect = correctCount;
          submission.totalWrong = wrongCount;
          await submission.save();

          examStudent.adjustedScore = newTotal;
          examStudent.officialScore = newTotal;
          await examStudent.save();

          return res.json({
            success: true,
            message: `Đã sửa câu hỏi sang ${isCorrect ? 'ĐÚNG' : 'SAI'}! Điểm tổng mới: ${newTotal}đ (Đúng ${correctCount} câu)`,
            officialScore: newTotal,
            totalCorrect: correctCount,
            totalWrong: wrongCount
          });
        }
      }
    }

    if (officialScore !== undefined && officialScore !== null) {
      const parsed = Math.max(0, Math.min(10, parseFloat(officialScore)));
      examStudent.adjustedScore = parsed;
      examStudent.officialScore = parsed;
      await examStudent.save();

      return res.json({
        success: true,
        message: `Đã cập nhật điểm chính thức của thí sinh thành công: ${parsed}đ!`,
        officialScore: parsed
      });
    }

    return res.status(400).json({ success: false, message: 'Thiếu dữ liệu điều chỉnh điểm!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

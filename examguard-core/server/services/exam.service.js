const mongoose = require('mongoose');
const ExamPaper = require('../models/examPaper.model');
const ExamSession = require('../models/examSession.model');
const ExamRoom = require('../models/examRoom.model');
const ExamStudent = require('../models/examStudent.model');
const ExamSubmission = require('../models/examSubmission.model');
const Student = require('../models/student.model');
const Course = require('../models/course.model');
const User = require('../models/user.model');
const Teacher = require('../models/teacher.model');
const { ScoringStrategyFactory } = require('../strategies/scoring.strategy');

// Helper sinh mã số báo danh ngẫu nhiên
function generateCode(prefix = 'PHACH', len = 6) {
  const chars = '0123456789ABCDEF';
  let res = '';
  for (let i = 0; i < len; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}_${res}`;
}

function generatePin() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * =========================================================================
 * EXAM SERVICE — TẦNG DỊCH VỤ QUẢN LÝ ĐỀ THI, PHÒNG THI & KHẢO THÍ
 * Tuân thủ Single Responsibility Principle (SRP) & Dependency Inversion (DIP)
 * =========================================================================
 */
class ExamService {
  /**
   * 1. Tạo đề thi mới
   */
  async createExamPaper(data, user) {
    const {
      code,
      title,
      subject,
      durationMinutes,
      totalScore = 10.0,
      shuffleQuestions,
      shuffleOptions,
      questions,
      paperType = 'STRUCTURED_QUIZ',
      structureType = 'PURE_MCQ',
      mcqCount = 0,
      essayCount = 0,
      fileUrl = null,
      fileName = null,
      fileSize = 0,
      totalQuestions = 0,
      submissionMode = 'OMR_BUBBLE_SHEET',
      answerKeyString = '',
      answerKey = []
    } = data;

    const existing = await ExamPaper.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      const err = new Error(`Mã đề thi "${code}" đã tồn tại trên hệ thống!`);
      err.status = 400;
      throw err;
    }

    let courseDoc = null;
    if (subject && mongoose.Types.ObjectId.isValid(subject)) {
      courseDoc = await Course.findById(subject);
    }
    if (!courseDoc && subject) {
      const escapedSubject = String(subject).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      courseDoc = await Course.findOne({
        $or: [
          { name: subject },
          { courseCode: subject },
          { name: { $regex: new RegExp(escapedSubject, 'i') } }
        ]
      });
    }
    if (!courseDoc) {
      courseDoc = await Course.findOne();
    }
    if (!courseDoc) {
      courseDoc = await Course.create({
        courseCode: 'INT101',
        name: 'Kỹ thuật lập trình C',
        credits: 3
      });
    }

    let createdByUserId = user ? user._id : null;
    if (!createdByUserId || !mongoose.Types.ObjectId.isValid(createdByUserId)) {
      const adminUser = await User.findOne({ email: 'admin@examguard.edu.vn' }) || await User.findOne();
      if (adminUser) {
        createdByUserId = adminUser._id;
      }
    }

    let finalQuestions = [];

    if (Array.isArray(questions) && questions.length > 0) {
      finalQuestions = questions.map((q, idx) => {
        const isEssay = q.type === 'ESSAY' || q.type === 'CODING_PROBLEM';
        const corrAns = isEssay ? null : (q.correctAnswer !== undefined ? q.correctAnswer : 0);
        const corrList = Array.isArray(corrAns)
          ? corrAns.map(Number)
          : (corrAns !== null && corrAns !== undefined ? [Number(corrAns)] : []);

        return {
          stt: q.stt || (idx + 1),
          type: q.type || 'MULTIPLE_CHOICE',
          content: q.content || `Câu ${idx + 1}`,
          image: q.image || null,
          options: isEssay ? [] : (q.options || ['A', 'B', 'C', 'D']),
          correctAnswer: corrAns,
          correctAnswers: corrList,
          selectionMode: q.selectionMode || (corrList.length > 1 ? 'MULTIPLE' : 'SINGLE'),
          scoringMode: q.scoringMode || 'ALL_OR_NOTHING',
          score: Number(q.score) > 0 ? Number(q.score) : 0.5,
          minWords: q.minWords || 0,
          submissionMethod: q.submissionMethod || 'TEXT_EDITOR',
          allowAttachment: Boolean(q.allowAttachment),
          explanation: q.explanation || (isEssay ? 'Câu hỏi tự luận' : `Đáp án câu số ${idx + 1}`)
        };
      });
    } else if (paperType === 'FILE_ATTACHED' && Number(totalQuestions) > 0) {
      const qCount = Number(totalQuestions);
      const scorePerQ = Math.round((Number(totalScore) / qCount) * 100) / 100;
      for (let i = 1; i <= qCount; i++) {
        let corrAns = 0;
        if (Array.isArray(answerKey) && answerKey[i - 1] !== undefined) {
          corrAns = answerKey[i - 1];
        }
        const isMulti = Array.isArray(corrAns) && corrAns.length > 1;
        finalQuestions.push({
          stt: i,
          type: 'MULTIPLE_CHOICE',
          content: `Câu ${i}`,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: corrAns,
          correctAnswers: Array.isArray(corrAns) ? corrAns.map(Number) : [Number(corrAns)],
          selectionMode: isMulti ? 'MULTIPLE' : 'SINGLE',
          scoringMode: 'ALL_OR_NOTHING',
          score: scorePerQ,
          explanation: `Đáp án câu số ${i} theo file đề thi.`
        });
      }
    }

    const hasMCQ = finalQuestions.some(q => q.type === 'MULTIPLE_CHOICE');
    const hasEssay = finalQuestions.some(q => q.type === 'ESSAY' || q.type === 'CODING_PROBLEM');
    let effectiveSubmissionMode = submissionMode;
    let effectiveStructureType = structureType;

    if (hasMCQ && hasEssay) {
      effectiveSubmissionMode = 'HYBRID';
      effectiveStructureType = 'HYBRID';
    } else if (!hasMCQ && hasEssay) {
      effectiveSubmissionMode = 'ESSAY_TEXT';
      effectiveStructureType = 'PURE_ESSAY';
    } else {
      effectiveStructureType = 'PURE_MCQ';
    }

    const calculatedMcqCount = finalQuestions.filter(q => q.type === 'MULTIPLE_CHOICE').length;
    const calculatedEssayCount = finalQuestions.filter(q => q.type === 'ESSAY' || q.type === 'CODING_PROBLEM').length;

    const newPaper = await ExamPaper.create({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      subject: courseDoc._id,
      subjectName: courseDoc ? courseDoc.name : '',
      createdBy: createdByUserId,
      durationMinutes: durationMinutes || 60,
      totalScore: totalScore || 10.0,
      shuffleQuestions: shuffleQuestions !== undefined ? shuffleQuestions : false,
      shuffleOptions: shuffleOptions !== undefined ? shuffleOptions : false,
      paperType,
      structureType: effectiveStructureType,
      mcqCount: calculatedMcqCount,
      essayCount: calculatedEssayCount,
      fileUrl,
      fileName,
      fileSize,
      totalQuestions: finalQuestions.length,
      submissionMode: effectiveSubmissionMode,
      answerKeyString,
      questions: finalQuestions,
      status: 'APPROVED'
    });

    return newPaper;
  }

  /**
   * 2. Lấy danh sách đề thi
   */
  async getExamPapers(query = {}) {
    const { subject, status, search } = query;
    const filter = {};
    if (subject) filter.subject = subject;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }
    return ExamPaper.find(filter)
      .populate('subject', 'courseCode name')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });
  }

  /**
   * 3. Chi tiết đề thi
   */
  async getExamPaperDetail(id) {
    const paper = await ExamPaper.findById(id)
      .populate('subject', 'courseCode name')
      .populate('createdBy', 'fullName email');
    if (!paper) {
      const err = new Error('Không tìm thấy đề thi!');
      err.status = 404;
      throw err;
    }
    return paper;
  }

  /**
   * 4. Quản lý phòng thi
   */
  async getExamRooms() {
    return ExamRoom.find().sort({ code: 1 });
  }

  async createExamRoom(data) {
    const { code, name, capacity, rows = 5, cols = 6, cameraIp, labIpRange } = data;
    const existing = await ExamRoom.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      const err = new Error(`Phòng thi ${code} đã tồn tại!`);
      err.status = 400;
      throw err;
    }
    return ExamRoom.create({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      capacity: capacity || (rows * cols),
      rows,
      cols,
      cameraIp,
      labIpRange
    });
  }

  /**
   * 5. Quản lý ca thi (Exam Sessions)
   */
  async getExamSessions(query = {}) {
    const { status, subject, room, fromDate, toDate } = query;
    const filter = {};
    if (status) filter.status = status;
    if (subject) filter.subject = subject;
    if (room) filter.room = room;
    if (fromDate || toDate) {
      filter.startTime = {};
      if (fromDate) filter.startTime.$gte = new Date(fromDate);
      if (toDate) filter.startTime.$lte = new Date(toDate);
    }
    return ExamSession.find(filter)
      .populate('subject', 'courseCode name')
      .populate('room', 'code name capacity')
      .populate('examPaper', 'code title totalQuestions durationMinutes')
      .populate('proctors', 'fullName email')
      .sort({ startTime: -1 });
  }

  async getExamSessionDetail(id) {
    const session = await ExamSession.findById(id)
      .populate('subject', 'courseCode name')
      .populate('room', 'code name capacity rows cols')
      .populate('examPaper')
      .populate('proctors', 'fullName email phone');

    if (!session) {
      const err = new Error('Không tìm thấy ca thi!');
      err.status = 404;
      throw err;
    }

    const students = await ExamStudent.find({ session: id })
      .populate('student', 'studentCode name email')
      .sort({ seatRow: 1, seatCol: 1 });

    return { session, students };
  }

  /**
   * 6. Nộp bài thi của thí sinh (Tuân thủ Strategy Pattern OCP)
   */
  async submitExam(sessionStudentId, answers) {
    const examStudent = await ExamStudent.findById(sessionStudentId).populate('session');
    if (!examStudent) {
      const err = new Error('Không tìm thấy thí sinh!');
      err.status = 404;
      throw err;
    }

    if (examStudent.status === 'SUBMITTED') {
      return { success: true, message: 'Bài thi đã được nộp trước đó!', alreadySubmitted: true };
    }

    const session = await ExamSession.findById(examStudent.session._id);
    const examPaper = await ExamPaper.findById(session.examPaper);

    const submittedAnswers = answers || {};

    let autoGradeTotal = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalSkipped = 0;
    const questionResults = [];

    for (let i = 0; i < examPaper.questions.length; i++) {
      const q = examPaper.questions[i];
      const qKey = q._id.toString();
      const studentChoice = submittedAnswers[qKey] !== undefined 
        ? submittedAnswers[qKey] 
        : submittedAnswers[i];

      // Đánh giá điểm qua Strategy Pattern
      const strategy = ScoringStrategyFactory.getStrategy(q.type);
      const evalResult = strategy.evaluate(q, studentChoice);

      if (evalResult.status === 'SKIPPED') {
        totalSkipped++;
      } else if (evalResult.isCorrect) {
        totalCorrect++;
      } else if (evalResult.isCorrect === false) {
        totalWrong++;
      }

      autoGradeTotal += evalResult.scoreEarned;

      questionResults.push({
        stt: q.stt,
        questionId: q._id.toString(),
        type: q.type,
        studentAnswer: studentChoice,
        correctAnswer: q.type === 'MULTIPLE_CHOICE' ? q.correctAnswer : null,
        isCorrect: evalResult.isCorrect,
        scoreEarned: evalResult.scoreEarned,
        maxScore: q.score,
        explanation: evalResult.feedback || q.explanation || ''
      });
    }

    autoGradeTotal = Math.round(autoGradeTotal * 100) / 100;

    let submission = await ExamSubmission.findOne({ examStudent: examStudent._id });
    if (!submission) {
      submission = new ExamSubmission({
        examStudent: examStudent._id,
        session: session._id,
        student: examStudent.student,
        answers: submittedAnswers,
        autoGradeTotal,
        totalCorrect,
        totalWrong,
        totalSkipped,
        questionResults,
        submittedAt: new Date()
      });
    } else {
      submission.answers = submittedAnswers;
      submission.autoGradeTotal = autoGradeTotal;
      submission.totalCorrect = totalCorrect;
      submission.totalWrong = totalWrong;
      submission.totalSkipped = totalSkipped;
      submission.questionResults = questionResults;
      submission.submittedAt = new Date();
    }
    await submission.save();

    examStudent.status = 'SUBMITTED';
    examStudent.autoGradeScore = autoGradeTotal;
    examStudent.adjustedScore = autoGradeTotal;
    examStudent.submittedAt = new Date();
    await examStudent.save();

    return {
      success: true,
      message: 'Nộp bài thi thành công!',
      autoGradeTotal,
      totalCorrect,
      totalWrong,
      totalSkipped,
      trustScore: examStudent.trustScore
    };
  }
}

module.exports = new ExamService();

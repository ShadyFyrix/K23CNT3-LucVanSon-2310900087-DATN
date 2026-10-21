const mongoose = require('mongoose');
const ExamPaper = require('../models/examPaper.model');
const ExamSession = require('../models/examSession.model');
const ExamRoom = require('../models/examRoom.model');
const ExamStudent = require('../models/examStudent.model');
const ExamSubmission = require('../models/examSubmission.model');
const Student = require('../models/student.model');
const Course = require('../models/course.model');
const User = require('../models/user.model');
const { parseExamFile } = require('../utils/examFileParser');
const examService = require('../services/exam.service');

// Helper sinh mã ngẫu nhiên
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
 * ==========================================
 * 1. QUẢN LÝ ĐỀ THI (EXAM PAPERS)
 * ==========================================
 */

// Tải lên file đề thi (PDF, DOCX, Ảnh) kèm phân tích câu hỏi & ma trận đáp án tự động
exports.uploadPaperFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Chưa có file đề thi nào được tải lên!' });
    }
    const fileUrl = `/uploads/exam-papers/${req.file.filename}`;

    // Tự động phân tích câu hỏi & đáp án đúng từ file
    let parsedData = null;
    try {
      parsedData = await parseExamFile(req.file.path, req.file.originalname);
    } catch (parseErr) {
      console.warn('Lỗi phân tích file đề thi tự động:', parseErr.message);
    }

    const hasParsedQuestions = parsedData && parsedData.canParseText && parsedData.detectedQuestionsCount > 0;

    return res.json({
      success: true,
      message: hasParsedQuestions
        ? `Đã nhận diện tự động ${parsedData.detectedQuestionsCount} câu hỏi (${parsedData.mcqCount} trắc nghiệm, ${parsedData.essayCount} tự luận)!`
        : 'Tải lên file đề thi thành công!',
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        parsed: parsedData
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Tạo đề thi mới (Thủ công hoặc kèm File đề thi)
exports.createExamPaper = async (req, res) => {
  try {
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
      answerKey = [] // mảng đáp án index [0, 1, 2, 3...] hoặc mảng các đáp án [[0], [1, 2], ...]
    } = req.body;

    // Kiểm tra mã trùng
    const existing = await ExamPaper.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Mã đề thi "${code}" đã tồn tại trên hệ thống!` });
    }

    // 1. Giải quyết Course / Subject an toàn tuyệt đối (tránh CastError khi truyền string name)
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

    // 2. Giải quyết createdBy an toàn
    let createdByUserId = req.user ? req.user._id : null;
    if (!createdByUserId || !mongoose.Types.ObjectId.isValid(createdByUserId)) {
      const adminUser = await User.findOne({ email: 'admin@examguard.edu.vn' }) || await User.findOne();
      if (adminUser) {
        createdByUserId = adminUser._id;
      }
    }

    let finalQuestions = [];

    if (Array.isArray(questions) && questions.length > 0) {
      // Đã có danh sách câu hỏi chi tiết từ client (hỗ trợ cả trắc nghiệm đơn, nhiều đáp án đúng, và tự luận)
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
      // Sinh câu hỏi tự động cho đề thi đính kèm file
      const qCount = Number(totalQuestions);
      const scorePerQ = Math.round((Number(totalScore) / qCount) * 100) / 100;
      for (let i = 1; i <= qCount; i++) {
        let corrAns = 0;
        if (Array.isArray(answerKey) && answerKey[i - 1] !== undefined) {
          corrAns = answerKey[i - 1]; // có thể là số hoặc mảng [0, 2]
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

    // Tự động suy luận submissionMode nếu là đề hỗn hợp
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

    return res.status(201).json({
      success: true,
      message: 'Tạo đề thi thành công!',
      data: newPaper
    });
  } catch (error) {
    console.error('Lỗi createExamPaper:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy danh sách đề thi
exports.getExamPapers = async (req, res) => {
  try {
    const { subject, status, search } = req.query;
    const filter = {};
    if (subject) filter.subject = subject;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const papers = await ExamPaper.find(filter)
      .populate('subject', 'name courseCode')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: papers.length, data: papers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy chi tiết đề thi (Dành cho Giảng viên/Admin soạn đề)
exports.getExamPaperDetail = async (req, res) => {
  try {
    const paper = await ExamPaper.findById(req.params.id)
      .populate('subject', 'name courseCode')
      .populate('createdBy', 'fullName email');

    if (!paper) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi!' });
    }

    return res.json({ success: true, data: paper });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ==========================================
 * 2. QUẢN LÝ PHÒNG THI & CA THI (SESSIONS)
 * ==========================================
 */

// Lấy danh sách phòng thi
exports.getExamRooms = async (req, res) => {
  try {
    const rooms = await ExamRoom.find({ isActive: true }).sort({ code: 1 });
    return res.json({ success: true, data: rooms });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Tạo phòng thi mới
exports.createExamRoom = async (req, res) => {
  try {
    const { code, name, roomType, rows, cols, allowedIpSubnet, rtspCameraUrl } = req.body;
    const existing = await ExamRoom.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Mã phòng "${code}" đã tồn tại!` });
    }

    const room = await ExamRoom.create({
      code: code.toUpperCase(),
      name,
      roomType: roomType || 'LAB_PC',
      rows: rows || 5,
      cols: cols || 8,
      allowedIpSubnet: allowedIpSubnet || '',
      rtspCameraUrl: rtspCameraUrl || ''
    });

    return res.status(201).json({ success: true, message: 'Tạo phòng thi thành công!', data: room });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Tạo ca thi mới
exports.createExamSession = async (req, res) => {
  try {
    const { 
      code, 
      title, 
      subject, 
      examPaper, 
      room, 
      startTime, 
      endTime, 
      durationMinutes, 
      examType, 
      proctor1, 
      proctor2, 
      inspector 
    } = req.body;

    const existing = await ExamSession.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Mã ca thi "${code}" đã tồn tại!` });
    }

    const session = await ExamSession.create({
      code: code.toUpperCase(),
      title,
      subject,
      examPaper,
      room,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      durationMinutes: durationMinutes || 60,
      examType: examType || 'LAB_PC',
      proctor1: proctor1 || null,
      proctor2: proctor2 || null,
      inspector: inspector || null,
      status: 'SCHEDULED',
      gradingStatus: 'NOT_GRADED'
    });

    return res.status(201).json({ success: true, message: 'Lên lịch ca thi thành công!', data: session });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Helper tự động thu bài và chấm trắc nghiệm cho tất cả thí sinh còn lại trong ca thi
async function autoSubmitRemainingStudents(sessionId) {
  try {
    const session = await ExamSession.findById(sessionId);
    if (!session) return;
    const examPaper = await ExamPaper.findById(session.examPaper);
    if (!examPaper || !examPaper.questions) return;

    const pendingStudents = await ExamStudent.find({
      session: sessionId,
      status: { $in: ['IN_EXAM', 'ASSIGNED', 'CHECKED_IN'] }
    });

    for (const examStudent of pendingStudents) {
      let existingSub = await ExamSubmission.findOne({ examStudent: examStudent._id });
      let submittedAnswers = {};
      if (existingSub && existingSub.answers) {
        if (existingSub.answers instanceof Map) {
          existingSub.answers.forEach((v, k) => { submittedAnswers[k] = v; });
        } else {
          submittedAnswers = existingSub.answers;
        }
      }

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

        if (q.type === 'MULTIPLE_CHOICE') {
          let isCorrect = false;
          if (studentChoice !== undefined && studentChoice !== null && studentChoice !== '') {
            if (q.correctAnswer === 'ALL_CORRECT') {
              isCorrect = true;
            } else if (Array.isArray(q.correctAnswer)) {
              if (Array.isArray(studentChoice)) {
                isCorrect = JSON.stringify([...q.correctAnswer].sort()) === JSON.stringify([...studentChoice].sort());
              } else {
                isCorrect = q.correctAnswer.map(Number).includes(Number(studentChoice));
              }
            } else {
              isCorrect = Number(studentChoice) === Number(q.correctAnswer);
            }
          }

          const scoreEarned = isCorrect ? (q.score || 1) : 0;
          if (studentChoice === undefined || studentChoice === null || studentChoice === '') {
            totalSkipped++;
          } else if (isCorrect) {
            totalCorrect++;
          } else {
            totalWrong++;
          }

          autoGradeTotal += scoreEarned;

          questionResults.push({
            stt: q.stt || (i + 1),
            questionId: q._id.toString(),
            type: q.type,
            studentAnswer: studentChoice,
            correctAnswer: q.correctAnswer,
            isCorrect,
            scoreEarned,
            maxScore: q.score || 1,
            explanation: q.explanation || ''
          });
        } else {
          questionResults.push({
            stt: q.stt || (i + 1),
            questionId: q._id.toString(),
            type: q.type,
            studentAnswer: studentChoice || '',
            correctAnswer: null,
            isCorrect: null,
            scoreEarned: 0,
            maxScore: q.score || 1,
            explanation: q.gradingGuide || ''
          });
        }
      }

      autoGradeTotal = Math.round(autoGradeTotal * 100) / 100;

      if (!existingSub) {
        existingSub = new ExamSubmission({
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
        existingSub.autoGradeTotal = autoGradeTotal;
        existingSub.totalCorrect = totalCorrect;
        existingSub.totalWrong = totalWrong;
        existingSub.totalSkipped = totalSkipped;
        existingSub.questionResults = questionResults;
        existingSub.submittedAt = new Date();
      }
      await existingSub.save();

      examStudent.status = 'SUBMITTED';
      examStudent.submittedAt = new Date();
      examStudent.autoGradeScore = autoGradeTotal;
      examStudent.adjustedScore = autoGradeTotal;
      await examStudent.save();
    }
  } catch (err) {
    console.error('Lỗi autoSubmitRemainingStudents:', err.message);
  }
}

// Lấy danh sách ca thi kèm tự động đánh giá vòng đời ca thi (Lifecycle Evaluation)
exports.getExamSessions = async (req, res) => {
  try {
    const { status, gradingStatus, search } = req.query;
    const filter = {};
    if (status && status !== 'ALL') filter.status = status;
    if (gradingStatus && gradingStatus !== 'ALL') filter.gradingStatus = gradingStatus;
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const sessions = await ExamSession.find(filter)
      .populate('subject', 'name courseCode')
      .populate('examPaper', 'code title durationMinutes totalScore')
      .populate({ path: 'room', populate: { path: 'campus', select: 'name address' } })
      .populate('proctor1', 'fullName email')
      .populate('proctor2', 'fullName email')
      .populate('inspector', 'fullName email')
      .sort({ startTime: -1 });

    const now = new Date();
    // Tự động kiểm tra thời gian ca thi: nếu quá endTime -> COMPLETED & auto-submit
    for (const session of sessions) {
      const startTime = session.startTime ? new Date(session.startTime) : new Date();
      const durationMs = (session.durationMinutes || 60) * 60 * 1000;
      const endTime = session.endTime ? new Date(session.endTime) : new Date(startTime.getTime() + durationMs);

      if (session.status !== 'COMPLETED' && session.status !== 'CANCELLED') {
        if (now.getTime() > endTime.getTime()) {
          session.status = 'COMPLETED';
          if (session.gradingStatus === 'NOT_GRADED') {
            session.gradingStatus = 'AUTO_GRADED';
          }
          await ExamSession.findByIdAndUpdate(session._id, {
            status: 'COMPLETED',
            gradingStatus: session.gradingStatus
          });
          await autoSubmitRemainingStudents(session._id);
        } else if (now.getTime() >= startTime.getTime() && now.getTime() <= endTime.getTime() && session.status === 'SCHEDULED') {
          session.status = 'IN_PROGRESS';
          await ExamSession.findByIdAndUpdate(session._id, { status: 'IN_PROGRESS' });
        }
      }
    }

    // Đếm số thí sinh của từng ca thi
    const enriched = await Promise.all(sessions.map(async (s) => {
      const count = await ExamStudent.countDocuments({ session: s._id });
      const plain = s.toObject();
      plain.studentCount = count;
      return plain;
    }));

    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Kết thúc ca thi & Đóng buồng thi thủ công (Manual End Session & Close Room)
exports.endExamSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await ExamSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });
    }

    const now = new Date();
    session.status = 'COMPLETED';
    session.endTime = now;
    if (session.gradingStatus === 'NOT_GRADED') {
      session.gradingStatus = 'AUTO_GRADED';
    }
    await session.save();

    // Thu bài và chấm trắc nghiệm tự động cho tất cả thí sinh còn lại
    await autoSubmitRemainingStudents(sessionId);

    // Phát sự kiện Socket.IO đóng buồng thi
    try {
      const io = req.app.get('io') || global.io;
      if (io) {
        io.to(`session:${sessionId}`).emit('session:ended', {
          sessionId,
          status: 'COMPLETED',
          endedAt: now.toISOString(),
          message: 'Cán bộ coi thi đã KẾT THÚC ca thi và đóng buồng làm bài. Toàn bộ bài thi đã được thu và tự động chấm điểm!'
        });
        io.emit('session:status_changed', {
          sessionId,
          status: 'COMPLETED'
        });
      }
    } catch (sockErr) {
      console.warn('Lỗi emit socket session:ended:', sockErr.message);
    }

    return res.json({
      success: true,
      message: `Đã kết thúc ca thi ${session.code} thành công! Toàn bộ bài thi đã được thu nhận và chấm tự động.`,
      data: session
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy chi tiết ca thi kèm danh sách thí sinh và chỗ ngồi
exports.getExamSessionDetail = async (req, res) => {
  try {
    const session = await ExamSession.findById(req.params.id)
      .populate('subject', 'name courseCode')
      .populate('examPaper', 'code title durationMinutes totalScore questions.stt questions.type questions.score')
      .populate('room', 'code name capacity rows cols allowedIpSubnet rtspCameraUrl roomType')
      .populate('proctor1', 'fullName email')
      .populate('proctor2', 'fullName email')
      .populate('inspector', 'fullName email');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });
    }

    const students = await ExamStudent.find({ session: session._id })
      .populate('student', 'fullName name studentCode email phone faceImage isFaceKyc avatar')
      .sort({ seatRow: 1, seatCol: 1 });

    return res.json({ 
      success: true, 
      data: {
        session,
        students
      } 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Xếp chỗ sinh viên vào ca thi (Tự động hoặc thủ công)
exports.assignStudentsToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { studentIds } = req.body; // Danh sách ID sinh viên

    const session = await ExamSession.findById(sessionId).populate('room');
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });
    }

    const room = session.room;
    const maxCapacity = room.rows * room.cols;
    if (studentIds.length > maxCapacity) {
      return res.status(400).json({ 
        success: false, 
        message: `Phòng ${room.code} có sức chứa tối đa ${maxCapacity} bàn, danh sách chọn có ${studentIds.length} sinh viên!` 
      });
    }

    // Xóa phân công cũ nếu có
    await ExamStudent.deleteMany({ session: sessionId });

    const assigned = [];
    let curRow = 1;
    let curCol = 1;

    for (let i = 0; i < studentIds.length; i++) {
      const sId = studentIds[i];
      const studentDoc = await Student.findById(sId);
      const candidateCode = `${session.code}-${String(i + 1).padStart(3, '0')}`;
      const blindCode = generateCode('PHACH', 6);
      const seatPin = generatePin();

      const item = await ExamStudent.create({
        session: sessionId,
        student: sId,
        candidateCode,
        blindCode,
        seatRow: curRow,
        seatCol: curCol,
        seatPin,
        status: 'ASSIGNED',
        trustScore: 100
      });

      assigned.push(item);

      // Nhảy sang cột tiếp theo, hết hàng thì xuống dòng
      curCol++;
      if (curCol > room.cols) {
        curCol = 1;
        curRow++;
      }
    }

    return res.json({
      success: true,
      message: `Đã xếp chỗ thành công cho ${assigned.length} sinh viên vào phòng ${room.code}!`,
      count: assigned.length,
      data: assigned
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Cập nhật Số Báo Danh (SBD) hoặc chỗ ngồi của thí sinh trong ca thi
exports.updateExamStudent = async (req, res) => {
  try {
    const { sessionId, examStudentId } = req.params;
    const { candidateCode, seatRow, seatCol, status } = req.body;

    const examStudent = await ExamStudent.findOne({ _id: examStudentId, session: sessionId });
    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thí sinh trong ca thi!' });
    }

    if (candidateCode && candidateCode.trim() !== examStudent.candidateCode) {
      // Kiểm tra trùng SBD trong cùng ca thi
      const existed = await ExamStudent.findOne({
        session: sessionId,
        candidateCode: candidateCode.trim(),
        _id: { $ne: examStudentId }
      });
      if (existed) {
        return res.status(400).json({ success: false, message: `Số báo danh "${candidateCode.trim()}" đã được sử dụng bởi thí sinh khác trong ca thi này!` });
      }
      examStudent.candidateCode = candidateCode.trim();
    }

    if (seatRow !== undefined) examStudent.seatRow = Number(seatRow);
    if (seatCol !== undefined) examStudent.seatCol = Number(seatCol);
    if (status) examStudent.status = status;

    await examStudent.save();

    const populated = await ExamStudent.findById(examStudent._id).populate('student', 'fullName name studentCode email phone faceImage isFaceKyc avatar');

    return res.json({
      success: true,
      message: `Đã cập nhật Số Báo Danh (${examStudent.candidateCode}) thành công!`,
      data: populated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Giảng viên sinh Số Báo Danh (SBD) hàng loạt theo quy tắc tùy chọn
exports.bulkGenerateCandidateCodes = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { prefix, startNum = 1, padding = 3, sortBy = 'seat' } = req.body;

    const session = await ExamSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });
    }

    const defaultPrefix = prefix || `${session.code}-`;

    const examStudents = await ExamStudent.find({ session: sessionId })
      .populate('student', 'fullName name studentCode');

    // Sắp xếp theo lựa chọn của Giảng viên
    if (sortBy === 'name') {
      examStudents.sort((a, b) => {
        const nameA = (a.student?.fullName || a.student?.name || '').toLowerCase();
        const nameB = (b.student?.fullName || b.student?.name || '').toLowerCase();
        return nameA.localeCompare(nameB, 'vi');
      });
    } else if (sortBy === 'studentCode') {
      examStudents.sort((a, b) => {
        const codeA = (a.student?.studentCode || '').toLowerCase();
        const codeB = (b.student?.studentCode || '').toLowerCase();
        return codeA.localeCompare(codeB);
      });
    } else {
      // Mặc định: theo hàng và cột bàn thi (seatRow, seatCol)
      examStudents.sort((a, b) => {
        if (a.seatRow !== b.seatRow) return a.seatRow - b.seatRow;
        return a.seatCol - b.seatCol;
      });
    }

    const updatedList = [];
    for (let i = 0; i < examStudents.length; i++) {
      const st = examStudents[i];
      const seq = startNum + i;
      const newSbd = `${defaultPrefix}${String(seq).padStart(Number(padding), '0')}`;
      st.candidateCode = newSbd;
      await st.save();
      updatedList.push({
        _id: st._id,
        candidateCode: newSbd,
        studentName: st.student?.fullName || st.student?.name,
        seat: `R${st.seatRow}-C${st.seatCol}`
      });
    }

    return res.json({
      success: true,
      message: `Đã sinh thành công ${updatedList.length} Số Báo Danh theo quy tắc tiền tố "${defaultPrefix}"!`,
      data: updatedList
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Thêm sinh viên đơn lẻ vào ca thi
exports.addStudentToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { studentId, candidateCode, seatRow, seatCol } = req.body;

    const session = await ExamSession.findById(sessionId).populate('room');
    if (!session) return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });

    const existed = await ExamStudent.findOne({ session: sessionId, student: studentId });
    if (existed) {
      return res.status(400).json({ success: false, message: 'Sinh viên này đã có trong danh sách ca thi!' });
    }

    // Kiểm tra chống trùng lịch thi: Không cho phép 1 sinh viên thi 2 môn cùng một thời điểm
    const sessionStart = new Date(session.startTime).getTime();
    const sessionDurationMs = (session.durationMinutes || 60) * 60000;
    const sessionEnd = session.endTime ? new Date(session.endTime).getTime() : (sessionStart + sessionDurationMs);

    const studentOtherSessions = await ExamStudent.find({ student: studentId }).populate('session');
    for (const es of studentOtherSessions) {
      if (es.session && es.session._id.toString() !== sessionId.toString() && es.session.status !== 'CANCELLED') {
        const oStart = new Date(es.session.startTime).getTime();
        const oDurationMs = (es.session.durationMinutes || 60) * 60000;
        const oEnd = es.session.endTime ? new Date(es.session.endTime).getTime() : (oStart + oDurationMs);

        // Hai ca thi trùng khung giờ khi: (sessionStart < oEnd && sessionEnd > oStart)
        if (sessionStart < oEnd && sessionEnd > oStart) {
          const oStartStr = new Date(oStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          const oEndStr = new Date(oEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          return res.status(400).json({
            success: false,
            message: `Xung đột lịch thi! Thí sinh đã được xếp ca thi "${es.session.title}" (${oStartStr} - ${oEndStr}) trùng khung giờ này. Quy chế khảo thí chỉ cho phép sinh viên thi 1 bài trong cùng một khoảng thời gian!`
          });
        }
      }
    }

    // Tự tìm bàn trống nếu chưa có seatRow/seatCol
    let row = seatRow ? Number(seatRow) : 1;
    let col = seatCol ? Number(seatCol) : 1;
    if (!seatRow || !seatCol) {
      const allAssigned = await ExamStudent.find({ session: sessionId });
      const occupied = new Set(allAssigned.map(s => `${s.seatRow}-${s.seatCol}`));
      let found = false;
      for (let r = 1; r <= (session.room?.rows || 5); r++) {
        for (let c = 1; c <= (session.room?.cols || 8); c++) {
          if (!occupied.has(`${r}-${c}`)) {
            row = r; col = c; found = true; break;
          }
        }
        if (found) break;
      }
    }

    const sbd = candidateCode?.trim() || `${session.code}-${String(await ExamStudent.countDocuments({ session: sessionId }) + 1).padStart(3, '0')}`;

    const newExamStudent = await ExamStudent.create({
      session: sessionId,
      student: studentId,
      candidateCode: sbd,
      blindCode: generateCode('PHACH', 6),
      seatRow: row,
      seatCol: col,
      seatPin: generatePin(),
      status: 'ASSIGNED',
      trustScore: 100
    });

    const populated = await ExamStudent.findById(newExamStudent._id).populate('student', 'fullName name studentCode email phone faceImage isFaceKyc avatar');

    return res.json({
      success: true,
      message: `Đã thêm thí sinh ${populated.student?.fullName || 'thí sinh'} (SBD: ${sbd}) vào ca thi!`,
      data: populated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Thêm danh sách nhiều sinh viên (hoặc cả lớp) vào ca thi mà không xóa các thí sinh hiện tại
exports.bulkAddStudentsToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Danh sách sinh viên không hợp lệ!' });
    }

    const session = await ExamSession.findById(sessionId).populate('room');
    if (!session) return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });

    const maxRows = session.room?.rows || 5;
    const maxCols = session.room?.cols || 8;
    const maxCapacity = maxRows * maxCols;

    const existingStudents = await ExamStudent.find({ session: sessionId });
    const existingStudentIds = new Set(existingStudents.map(s => s.student.toString()));
    const occupiedSeats = new Set(existingStudents.map(s => `${s.seatRow}-${s.seatCol}`));

    // Lọc ra các sinh viên chưa có trong ca
    const newStudentIds = studentIds.filter(id => !existingStudentIds.has(id.toString()));

    if (newStudentIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Tất cả sinh viên được chọn đều đã có mặt trong ca thi này!' });
    }

    // Kiểm tra xung đột lịch thi: Lọc và cảnh báo sinh viên bị trùng giờ thi với môn khác
    const sessionStart = new Date(session.startTime).getTime();
    const sessionDurationMs = (session.durationMinutes || 60) * 60000;
    const sessionEnd = session.endTime ? new Date(session.endTime).getTime() : (sessionStart + sessionDurationMs);

    const validStudentIds = [];
    const conflictStudentNames = [];

    for (const sId of newStudentIds) {
      const otherSessions = await ExamStudent.find({ student: sId }).populate('session').populate('student');
      let hasConflict = false;
      for (const es of otherSessions) {
        if (es.session && es.session._id.toString() !== sessionId.toString() && es.session.status !== 'CANCELLED') {
          const oStart = new Date(es.session.startTime).getTime();
          const oDurationMs = (es.session.durationMinutes || 60) * 60000;
          const oEnd = es.session.endTime ? new Date(es.session.endTime).getTime() : (oStart + oDurationMs);
          if (sessionStart < oEnd && sessionEnd > oStart) {
            hasConflict = true;
            conflictStudentNames.push(`${es.student?.fullName || sId} (trùng với ca "${es.session.title}")`);
            break;
          }
        }
      }
      if (!hasConflict) {
        validStudentIds.push(sId);
      }
    }

    if (validStudentIds.length === 0 && conflictStudentNames.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xếp lịch! Tất cả sinh viên được chọn đều bị trùng giờ thi với môn khác: ${conflictStudentNames.join(', ')}`
      });
    }

    if (existingStudents.length + validStudentIds.length > maxCapacity) {
      return res.status(400).json({
        success: false,
        message: `Phòng ${session.room?.code || 'thi'} chỉ còn ${maxCapacity - existingStudents.length} chỗ trống, không đủ cho ${validStudentIds.length} sinh viên mới!`
      });
    }

    // Tìm bàn trống cho từng sinh viên mới
    const freeSeats = [];
    for (let r = 1; r <= maxRows; r++) {
      for (let c = 1; c <= maxCols; c++) {
        if (!occupiedSeats.has(`${r}-${c}`)) {
          freeSeats.push({ row: r, col: c });
        }
      }
    }

    let currentCount = existingStudents.length;
    const addedList = [];

    for (let i = 0; i < validStudentIds.length; i++) {
      const sId = validStudentIds[i];
      const seat = freeSeats[i] || { row: 1, col: 1 };
      currentCount++;
      const candidateCode = `${session.code}-${String(currentCount).padStart(3, '0')}`;
      const blindCode = generateCode('PHACH', 6);
      const seatPin = generatePin();

      const item = await ExamStudent.create({
        session: sessionId,
        student: sId,
        candidateCode,
        blindCode,
        seatRow: seat.row,
        seatCol: seat.col,
        seatPin,
        status: 'ASSIGNED',
        trustScore: 100
      });

      addedList.push(item);
    }

    return res.json({
      success: true,
      message: `Đã thêm thành công ${addedList.length} sinh viên vào ca thi!`,
      count: addedList.length,
      data: addedList
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Xóa sinh viên khỏi ca thi
exports.removeStudentFromSession = async (req, res) => {
  try {
    const { sessionId, examStudentId } = req.params;
    await ExamStudent.findOneAndDelete({ _id: examStudentId, session: sessionId });
    return res.json({ success: true, message: 'Đã xóa thí sinh khỏi danh sách ca thi!' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * ==========================================================
 * 3. CANDIDATE WORKSPACE & ĐỀ THI BẢO MẬT (ZERO-KNOWLEDGE)
 * ==========================================================
 */

// Lấy đề thi đã bảo mật (Sanitization Pipeline: XÓA ĐÁP ÁN ĐÚNG & LỜI GIẢI THÍCH)
exports.getSanitizedQuestions = async (req, res) => {
  try {
    const { sessionStudentId } = req.params;
    const now = new Date();

    let examStudent = null;
    if (mongoose.Types.ObjectId.isValid(sessionStudentId)) {
      examStudent = await ExamStudent.findById(sessionStudentId)
        .populate('session')
        .populate({ path: 'student', populate: { path: 'class' } });
    } else {
      // Khi không truyền sessionStudentId cụ thể (truy cập /exam/take)
      // Tìm sinh viên theo User đăng nhập (nếu có)
      let studentFilter = {};
      if (req.user && req.user.email) {
        const Student = mongoose.model('Student');
        const st = await Student.findOne({ email: req.user.email });
        if (st) studentFilter = { student: st._id };
      }

      // Lấy toàn bộ các ca thi của thí sinh
      const candidates = await ExamStudent.find(studentFilter)
        .populate('session')
        .populate({ path: 'student', populate: { path: 'class' } });

      // Ưu tiên 1: Ca thi ĐANG DIỄN RA (chưa nộp bài và now nằm trong thời gian thi)
      const happeningCandidate = candidates.find(c => {
        if (!c.session || c.session.status === 'COMPLETED' || c.session.status === 'CANCELLED') return false;
        if (c.status === 'SUBMITTED') return false;
        const sStart = new Date(c.session.startTime);
        const sEnd = c.session.endTime ? new Date(c.session.endTime) : new Date(sStart.getTime() + (c.session.durationMinutes || 60) * 60000);
        return now.getTime() <= sEnd.getTime();
      });

      if (happeningCandidate) {
        examStudent = happeningCandidate;
      } else {
        // Ưu tiên 2: Ca thi SẮP DIỄN RA tiếp theo (UPCOMING)
        const upcomingCandidate = candidates
          .filter(c => {
            if (!c.session || c.session.status === 'COMPLETED' || c.session.status === 'CANCELLED') return false;
            if (c.status === 'SUBMITTED') return false;
            const sStart = new Date(c.session.startTime);
            return now.getTime() < sStart.getTime();
          })
          .sort((a, b) => new Date(a.session.startTime).getTime() - new Date(b.session.startTime).getTime())[0];

        if (upcomingCandidate) {
          examStudent = upcomingCandidate;
        } else {
          // Fallback: Lấy ca thi cập nhật gần nhất
          examStudent = await ExamStudent.findOne(studentFilter)
            .sort({ updatedAt: -1, createdAt: -1 })
            .populate('session')
            .populate({ path: 'student', populate: { path: 'class' } });
        }
      }
    }

    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin thí sinh ca thi!' });
    }

    const session = await ExamSession.findById(examStudent.session._id)
      .populate('room')
      .populate('subject');
    const examPaper = await ExamPaper.findById(session.examPaper);

    if (!examPaper) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi của ca này!' });
    }

    const startTime = session.startTime ? new Date(session.startTime) : new Date();
    const durationMinutes = (session.durationMinutes || 60) + (examStudent.extraTimeMinutes || 0);
    const durationMs = durationMinutes * 60 * 1000;
    const endTime = session.endTime ? new Date(session.endTime) : new Date(startTime.getTime() + durationMs);

    // TÍNH TOÁN DANH SÁCH TẤT CẢ CA THI CỦA THÍ SINH ĐỂ HỖ TRỢ XỬ LÝ 2 MÔN LIÊN TIẾP & SẢNH CHỜ
    const studentId = examStudent.student?._id || examStudent.student;
    const allStudentExams = await ExamStudent.find({ student: studentId })
      .populate({ path: 'session', populate: { path: 'room subject' } });

    const todaySessions = allStudentExams.map(item => {
      const s = item.session;
      if (!s) return null;
      const sStart = s.startTime ? new Date(s.startTime) : new Date();
      const sEnd = s.endTime ? new Date(s.endTime) : new Date(sStart.getTime() + (s.durationMinutes || 60) * 60000);
      const isEnded = s.status === 'COMPLETED' || now.getTime() > sEnd.getTime() || item.status === 'SUBMITTED';
      const isUpcoming = now.getTime() < sStart.getTime() && item.status !== 'SUBMITTED';
      const isHappening = !isEnded && !isUpcoming && item.status !== 'SUBMITTED';

      return {
        id: item._id,
        candidateCode: item.candidateCode,
        seatRow: item.seatRow,
        seatCol: item.seatCol,
        seatPin: item.seatPin,
        status: item.status,
        trustScore: item.trustScore,
        session: {
          id: s._id,
          code: s.code,
          title: s.title,
          subjectName: s.subject?.name || s.title,
          roomName: s.room?.name || 'Phòng P302',
          startTime: sStart.toISOString(),
          endTime: sEnd.toISOString(),
          durationMinutes: s.durationMinutes || 60,
          status: s.status,
          gradingStatus: s.gradingStatus
        },
        isEnded,
        isUpcoming,
        isHappening,
        countdownSeconds: isUpcoming ? Math.max(0, Math.floor((sStart.getTime() - now.getTime()) / 1000)) : 0
      };
    }).filter(Boolean).sort((a, b) => new Date(a.session.startTime).getTime() - new Date(b.session.startTime).getTime());

    // Tìm môn thi kế tiếp
    const nextSession = todaySessions.find(ts => 
      ts.id.toString() !== examStudent._id.toString() && !ts.isEnded
    ) || null;
    const hasActiveExamNow = todaySessions.some(ts => ts.isHappening);

    // 0. KIỂM TRA CA THI ĐÃ KẾT THÚC / ĐÓNG BUỒNG THI (session.status === 'COMPLETED' hoặc now > endTime)
    const isSessionEnded = session.status === 'COMPLETED' || (now.getTime() > endTime.getTime());
    if (isSessionEnded) {
      if (examStudent.status !== 'SUBMITTED') {
        examStudent.status = 'SUBMITTED';
        examStudent.submittedAt = now;
        await examStudent.save();
        await autoSubmitRemainingStudents(session._id);
      }

      return res.json({
        success: true,
        data: {
          isSessionEnded: true,
          hasActiveExamNow,
          todaySessions,
          nextSession,
          endedAt: (session.endTime || endTime).toISOString(),
          serverTime: now.toISOString(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          message: 'Ca thi đã kết thúc và đóng buồng làm bài. Toàn bộ bài thi đã được niêm phong để chuyển sang hội đồng rà soát & chấm điểm.',
          examStudent: {
            id: examStudent._id,
            candidateCode: examStudent.candidateCode,
            seatRow: examStudent.seatRow,
            seatCol: examStudent.seatCol,
            seatPin: examStudent.seatPin,
            trustScore: examStudent.trustScore !== undefined ? examStudent.trustScore : 100,
            status: 'SUBMITTED',
            submittedAt: examStudent.submittedAt || now
          },
          student: {
            id: examStudent.student._id,
            name: examStudent.student.fullName || examStudent.student.name || 'Lục Văn Sơn',
            studentCode: examStudent.student.studentCode,
            email: examStudent.student.email,
            className: examStudent.student.class?.name || examStudent.student.class?.code || 'K23CNT3'
          },
          session: {
            id: session._id,
            code: session.code,
            title: session.title,
            subjectName: session.subject?.name || session.title,
            roomCode: session.room?.code || 'P302',
            roomName: session.room?.name || 'Phòng P302',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            durationMinutes,
            status: 'COMPLETED',
            gradingStatus: session.gradingStatus
          },
          savedAnswers: {},
          questions: [] // ZERO-KNOWLEDGE: Giữ bí mật đề thi tuyệt đối khi ca thi đã kết thúc
        }
      });
    }

    // 1. KIỂM TRA ĐẾM NGƯỢC GIỜ VÀO THI (Chưa đến giờ bắt đầu: now < startTime)
    if (now.getTime() < startTime.getTime()) {
      const countdownSeconds = Math.max(0, Math.floor((startTime.getTime() - now.getTime()) / 1000));
      return res.json({
        success: true,
        data: {
          isPreExamWaiting: true,
          todaySessions,
          nextSession,
          hasActiveExamNow,
          countdownSeconds,
          serverTime: now.toISOString(),
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          examStudent: {
            id: examStudent._id,
            candidateCode: examStudent.candidateCode,
            seatRow: examStudent.seatRow,
            seatCol: examStudent.seatCol,
            seatPin: examStudent.seatPin,
            trustScore: examStudent.trustScore !== undefined ? examStudent.trustScore : 100,
            status: examStudent.status,
            isLateUnlocked: examStudent.isLateUnlocked || false
          },
          student: {
            id: examStudent.student._id,
            name: examStudent.student.fullName || examStudent.student.name || 'Lục Văn Sơn',
            studentCode: examStudent.student.studentCode,
            email: examStudent.student.email,
            className: examStudent.student.class?.name || examStudent.student.class?.code || 'K23CNT3'
          },
          session: {
            id: session._id,
            code: session.code,
            title: session.title,
            subjectName: session.subject?.name || session.title,
            durationMinutes,
            roomCode: session.room?.code || 'P302',
            roomName: session.room?.name || 'Phòng P302',
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString()
          },
          examPaper: {
            id: examPaper._id,
            code: examPaper.code,
            title: examPaper.title,
            paperType: examPaper.paperType || 'STRUCTURED_QUIZ',
            structureType: examPaper.structureType || 'PURE_MCQ',
            totalQuestions: examPaper.totalQuestions || (examPaper.questions ? examPaper.questions.length : 0),
            submissionMode: examPaper.submissionMode || 'OMR_BUBBLE_SHEET'
          },
          savedAnswers: {},
          questions: [] // ZERO-KNOWLEDGE: Giữ bí mật đề thi tuyệt đối cho đến khi hết countdown
        }
      });
    }

    // 2. KIỂM TRA CHẶN VÀO THI KHI ĐI MUỘN QUÁ 15 PHÚT
    // Điều kiện: now > startTime + 15 phút, thí sinh chưa bắt đầu làm bài trước đó, và chưa được Giám thị mở bàn đặc cách
    const lateThresholdMs = 15 * 60 * 1000;
    const isPast15Minutes = now.getTime() > (startTime.getTime() + lateThresholdMs);
    const hasStartedBefore = examStudent.status === 'IN_EXAM' || examStudent.status === 'SUBMITTED';

    if (isPast15Minutes && !hasStartedBefore && !examStudent.isLateUnlocked) {
      const lateMinutes = Math.floor((now.getTime() - startTime.getTime()) / 60000);
      return res.json({
        success: true,
        data: {
          isLateBlocked: true,
          lateMinutes,
          serverTime: now.toISOString(),
          startTime: startTime.toISOString(),
          message: `BÀN THI ĐÃ BỊ KHÓA! Thí sinh đã đến muộn ${lateMinutes} phút (vượt quá 15 phút cho phép theo Quy chế coi thi). Vui lòng báo cáo Cán bộ coi thi tại phòng để được mở bàn đặc cách.`,
          examStudent: {
            id: examStudent._id,
            candidateCode: examStudent.candidateCode,
            seatRow: examStudent.seatRow,
            seatCol: examStudent.seatCol,
            trustScore: examStudent.trustScore !== undefined ? examStudent.trustScore : 100,
            status: examStudent.status,
            isLateUnlocked: false
          },
          student: {
            id: examStudent.student._id,
            name: examStudent.student.fullName || examStudent.student.name || 'Lục Văn Sơn',
            studentCode: examStudent.student.studentCode,
            email: examStudent.student.email,
            className: examStudent.student.class?.name || examStudent.student.class?.code || 'K23CNT3'
          },
          session: {
            id: session._id,
            code: session.code,
            title: session.title,
            subjectName: session.subject?.name || session.title,
            roomCode: session.room?.code || 'P302',
            roomName: session.room?.name || 'Phòng P302',
            startTime: startTime.toISOString()
          },
          questions: []
        }
      });
    }

    // Pipeline bảo mật: Xóa tuyệt đối đáp án đúng & lời giải thích
    let questionsPayload = examPaper.questions.map((q, idx) => {
      const sanitized = {
        stt: q.stt || (idx + 1),
        _id: q._id,
        type: q.type,
        content: q.content,
        image: q.image,
        score: q.score,
        options: q.options || [],
        selectionMode: q.selectionMode || 'SINGLE',
        minWords: q.minWords,
        submissionMethod: q.submissionMethod || 'TEXT_EDITOR',
        allowAttachment: Boolean(q.allowAttachment),
        languages: q.languages,
        templateCode: q.templateCode,
        // Chỉ để lại test case public (không ẩn) nếu có
        testCases: (q.testCases || []).filter(tc => !tc.isHidden).map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput
        }))
        // ĐÃ LỌC BỎ: correctAnswer, explanation, gradingGuide, hidden test cases
      };
      return sanitized;
    });

    // Cập nhật trạng thái bắt đầu làm nếu đang là CHECKED_IN hoặc ASSIGNED
    if (examStudent.status === 'ASSIGNED' || examStudent.status === 'CHECKED_IN') {
      examStudent.status = 'IN_EXAM';
      examStudent.startedAt = new Date();
      await examStudent.save();
    }

    // Lấy bài làm dở đã lưu trước đó nếu có
    const existingSubmission = await ExamSubmission.findOne({ examStudent: examStudent._id });

    return res.json({
      success: true,
      data: {
        todaySessions,
        nextSession,
        hasActiveExamNow,
        examStudent: {
          id: examStudent._id,
          candidateCode: examStudent.candidateCode,
          seatRow: examStudent.seatRow,
          seatCol: examStudent.seatCol,
          seatPin: examStudent.seatPin,
          trustScore: examStudent.trustScore !== undefined ? examStudent.trustScore : 100,
          startedAt: examStudent.startedAt,
          extraTimeMinutes: examStudent.extraTimeMinutes,
          isLateUnlocked: examStudent.isLateUnlocked || false
        },
        student: {
          id: examStudent.student._id,
          name: examStudent.student.fullName || examStudent.student.name || 'Lục Văn Sơn',
          studentCode: examStudent.student.studentCode,
          email: examStudent.student.email,
          className: examStudent.student.class?.name || examStudent.student.class?.code || 'K23CNT3'
        },
        session: {
          id: session._id,
          code: session.code,
          title: session.title,
          subjectName: session.subject?.name || session.title,
          durationMinutes: session.durationMinutes + examStudent.extraTimeMinutes,
          roomCode: session.room?.code || 'P302',
          roomName: session.room?.name || 'Phòng P302',
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        },
        examPaper: {
          id: examPaper._id,
          code: examPaper.code,
          title: examPaper.title,
          paperType: examPaper.paperType || 'STRUCTURED_QUIZ',
          structureType: examPaper.structureType || 'PURE_MCQ',
          mcqCount: examPaper.mcqCount || 0,
          essayCount: examPaper.essayCount || 0,
          fileUrl: examPaper.fileUrl || null,
          fileName: examPaper.fileName || null,
          fileSize: examPaper.fileSize || 0,
          totalQuestions: examPaper.totalQuestions || (examPaper.questions ? examPaper.questions.length : 0),
          submissionMode: examPaper.submissionMode || 'OMR_BUBBLE_SHEET'
        },
        savedAnswers: existingSubmission ? Object.fromEntries(existingSubmission.answers || []) : {},
        questions: questionsPayload
      }
    });
  } catch (error) {
    console.error('Lỗi getSanitizedQuestions:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Thí sinh auto-save tiến độ bài làm
exports.saveProgress = async (req, res) => {
  try {
    const { sessionStudentId, answers } = req.body;

    const examStudent = await ExamStudent.findById(sessionStudentId);
    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Thí sinh không hợp lệ!' });
    }

    if (examStudent.status === 'SUBMITTED' || examStudent.status === 'SUSPENDED') {
      return res.status(400).json({ success: false, message: 'Bài thi đã nộp hoặc bị khóa!' });
    }

    let submission = await ExamSubmission.findOne({ examStudent: sessionStudentId });
    if (!submission) {
      submission = new ExamSubmission({
        examStudent: sessionStudentId,
        session: examStudent.session,
        student: examStudent.student,
        answers: answers || {}
      });
    } else {
      submission.answers = answers || {};
    }

    await submission.save();

    return res.json({ success: true, message: 'Đã tự động lưu bài làm', savedAt: new Date() });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Nộp bài thi & Kích hoạt Chấm Tự Động Trắc Nghiệm Tức Thì (Ủy quyền cho ExamService - SRP & Strategy Pattern)
exports.submitExam = async (req, res) => {
  try {
    const { sessionStudentId, answers } = req.body;
    const result = await examService.submitExam(sessionStudentId, answers);
    return res.json(result);
  } catch (error) {
    console.error('Lỗi submitExam:', error);
    return res.status(error.status || 500).json({ success: false, message: error.message });
  }
};

// Sinh viên xem kết quả và đối chiếu đáp án sau khi được Công bố
exports.getStudentExamResult = async (req, res) => {
  try {
    const { sessionStudentId } = req.params;

    let examStudent;
    if (!sessionStudentId || sessionStudentId === 'fallback_student' || !mongoose.Types.ObjectId.isValid(sessionStudentId)) {
      examStudent = await ExamStudent.findOne({ status: { $in: ['SUBMITTED', 'GRADED', 'ASSIGNED', 'IN_EXAM'] } })
        .sort({ updatedAt: -1 })
        .populate('session')
        .populate('student');
    } else {
      examStudent = await ExamStudent.findById(sessionStudentId)
        .populate('session')
        .populate('student');
    }

    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin bài thi của thí sinh!' });
    }

    const sessionId = examStudent.session?._id || examStudent.session;
    const session = sessionId ? await ExamSession.findById(sessionId)
      .populate('subject', 'name courseCode')
      .populate('examPaper') : null;

    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi tương ứng!' });
    }

    // Kiểm tra quyền công bố hoặc quyền Giảng viên xem trước
    const isPublished = session.gradingStatus === 'PUBLISHED';
    const asLecturer = req.query.asLecturer === 'true' || (req.user && ['teacher', 'admin', 'superadmin', 'giảng viên', 'quản trị viên'].includes((req.user.role?.name || req.user.role || '').toLowerCase()));
    const submission = await ExamSubmission.findOne({ examStudent: examStudent._id });

    const studentDisplayName = examStudent.student?.fullName || examStudent.student?.name || 'Thí sinh';
    const subjectName = session.subject?.name || 'Kỹ thuật lập trình';

    // Nếu là sinh viên thông thường và ca thi chưa công bố -> Chặn xem chi tiết
    if (!isPublished && !asLecturer) {
      return res.json({
        success: true,
        isPublished: false,
        asLecturer: false,
        message: 'Điểm số của ca thi đang trong giai đoạn rà soát và đối soát bảo mật. Vui lòng quay lại sau khi Ban Khảo thí công bố!',
        session: {
          code: session.code,
          title: session.title,
          subjectName: subjectName
        },
        student: {
          name: studentDisplayName,
          candidateCode: examStudent.candidateCode,
          trustScore: examStudent.trustScore,
          submittedAt: examStudent.submittedAt
        }
      });
    }

    // ĐÃ CÔNG BỐ HOẶC GIẢNG VIÊN XEM TRƯỚC: Trả về kết quả đầy đủ kèm từng câu và lời giải thích!
    const examPaper = session.examPaper;
    let questionsWithFeedback = [];

    if (submission && submission.questionResults && submission.questionResults.length > 0) {
      questionsWithFeedback = submission.questionResults.map(qr => {
        const originalQ = (examPaper?.questions || []).find(q => q._id && q._id.toString() === (qr.questionId ? qr.questionId.toString() : ''));
        return {
          stt: qr.stt,
          questionId: qr.questionId || (originalQ?._id ? originalQ._id.toString() : ''),
          type: qr.type,
          content: originalQ ? originalQ.content : '',
          options: originalQ ? originalQ.options : [],
          studentAnswer: qr.studentAnswer,
          correctAnswer: qr.correctAnswer,
          isCorrect: qr.isCorrect,
          scoreEarned: qr.scoreEarned,
          maxScore: qr.maxScore,
          explanation: qr.explanation || (originalQ ? originalQ.explanation : '')
        };
      });
    } else if (examPaper && examPaper.questions && examPaper.questions.length > 0) {
      // Fallback: Tự động đối chiếu từ câu hỏi đề thi và mảng answers của thí sinh
      const subAnswers = submission?.answers || {};
      questionsWithFeedback = examPaper.questions.map((q, idx) => {
        const qId = q._id.toString();
        const studentChoice = subAnswers[qId] ?? subAnswers[idx.toString()] ?? subAnswers[(q.stt || idx + 1).toString()];
        let isCorrect = false;
        let scoreEarned = 0;
        if (q.type === 'MULTIPLE_CHOICE') {
          if (Array.isArray(q.correctAnswer)) {
            isCorrect = q.correctAnswer.includes(Number(studentChoice));
          } else {
            isCorrect = studentChoice !== undefined && studentChoice !== null && Number(studentChoice) === Number(q.correctAnswer);
          }
          scoreEarned = isCorrect ? (q.score || 0.25) : 0;
        }

        return {
          stt: q.stt || idx + 1,
          questionId: qId,
          type: q.type,
          content: q.content,
          options: q.options || [],
          studentAnswer: studentChoice,
          correctAnswer: q.correctAnswer,
          isCorrect,
          scoreEarned,
          maxScore: q.score || 0.25,
          explanation: q.explanation || ''
        };
      });
    }

    return res.json({
      success: true,
      isPublished: true,
      data: {
        session: {
          code: session.code,
          title: session.title,
          subjectName: subjectName,
          appealDeadline: session.appealDeadline
        },
        student: {
          name: studentDisplayName,
          candidateCode: examStudent.candidateCode,
          trustScore: examStudent.trustScore,
          submittedAt: examStudent.submittedAt
        },
        scores: {
          officialScore: examStudent.officialScore !== null ? examStudent.officialScore : examStudent.adjustedScore,
          autoGradeScore: examStudent.autoGradeScore,
          trustScore: examStudent.trustScore,
          totalCorrect: submission ? submission.totalCorrect : 0,
          totalWrong: submission ? submission.totalWrong : 0,
          totalQuestions: examPaper?.questions?.length || 0
        },
        questions: questionsWithFeedback
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Lấy toàn bộ lịch thi & tiến độ các môn thi của thí sinh (Hỗ trợ Sảnh thi & 2 môn liên tiếp)
exports.getStudentExamSchedule = async (req, res) => {
  try {
    const now = new Date();
    let studentId = req.query.studentId;

    if (!studentId && req.user && req.user.email) {
      const Student = mongoose.model('Student');
      const st = await Student.findOne({ email: req.user.email });
      if (st) studentId = st._id;
    }

    let filter = {};
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
      filter = { student: studentId };
    }

    const candidateExams = await ExamStudent.find(filter)
      .populate({ path: 'session', populate: { path: 'room subject examPaper' } })
      .populate('student');

    const formattedSessions = candidateExams.map(item => {
      const s = item.session;
      if (!s) return null;
      const sStart = s.startTime ? new Date(s.startTime) : new Date();
      const sEnd = s.endTime ? new Date(s.endTime) : new Date(sStart.getTime() + (s.durationMinutes || 60) * 60000);
      const isEnded = s.status === 'COMPLETED' || now.getTime() > sEnd.getTime() || item.status === 'SUBMITTED';
      const isUpcoming = now.getTime() < sStart.getTime() && item.status !== 'SUBMITTED';
      const isHappening = !isEnded && !isUpcoming && item.status !== 'SUBMITTED';

      return {
        id: item._id,
        candidateCode: item.candidateCode,
        seatRow: item.seatRow,
        seatCol: item.seatCol,
        seatPin: item.seatPin,
        status: item.status,
        trustScore: item.trustScore,
        officialScore: item.officialScore !== null ? item.officialScore : item.adjustedScore,
        session: {
          id: s._id,
          code: s.code,
          title: s.title,
          subjectName: s.subject?.name || s.title,
          roomName: s.room?.name || 'Phòng P302',
          startTime: sStart.toISOString(),
          endTime: sEnd.toISOString(),
          durationMinutes: s.durationMinutes || 60,
          status: s.status,
          gradingStatus: s.gradingStatus
        },
        isEnded,
        isUpcoming,
        isHappening,
        countdownSeconds: isUpcoming ? Math.max(0, Math.floor((sStart.getTime() - now.getTime()) / 1000)) : 0
      };
    }).filter(Boolean).sort((a, b) => new Date(a.session.startTime).getTime() - new Date(b.session.startTime).getTime());

    const activeSession = formattedSessions.find(s => s.isHappening) || null;
    const nextUpcomingSession = formattedSessions.find(s => s.isUpcoming) || null;

    return res.json({
      success: true,
      activeSession,
      nextUpcomingSession,
      sessions: formattedSessions
    });
  } catch (error) {
    console.error('Lỗi getStudentExamSchedule:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


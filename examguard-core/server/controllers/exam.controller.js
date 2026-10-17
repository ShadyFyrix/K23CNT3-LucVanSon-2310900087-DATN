const mongoose = require('mongoose');
const ExamPaper = require('../models/examPaper.model');
const ExamSession = require('../models/examSession.model');
const ExamRoom = require('../models/examRoom.model');
const ExamStudent = require('../models/examStudent.model');
const ExamSubmission = require('../models/examSubmission.model');
const Student = require('../models/student.model');
const Course = require('../models/course.model');

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

// Tải lên file đề thi (PDF, DOCX, Ảnh)
exports.uploadPaperFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Chưa có file đề thi nào được tải lên!' });
    }
    const fileUrl = `/uploads/exam-papers/${req.file.filename}`;
    return res.json({
      success: true,
      message: 'Tải lên file đề thi thành công!',
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
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

    const courseDoc = await Course.findById(subject);

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
          options: isEssay ? [] : (q.options || ['A', 'B', 'C', 'D']),
          correctAnswer: corrAns,
          correctAnswers: corrList,
          selectionMode: q.selectionMode || (corrList.length > 1 ? 'MULTIPLE' : 'SINGLE'),
          scoringMode: q.scoringMode || 'ALL_OR_NOTHING',
          score: Number(q.score) > 0 ? Number(q.score) : 0.5,
          minWords: q.minWords || 0,
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
      subject,
      subjectName: courseDoc ? courseDoc.name : '',
      createdBy: req.user ? req.user._id : null,
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

// Lấy danh sách ca thi
exports.getExamSessions = async (req, res) => {
  try {
    const { status, gradingStatus, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (gradingStatus) filter.gradingStatus = gradingStatus;
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const sessions = await ExamSession.find(filter)
      .populate('subject', 'name courseCode')
      .populate('examPaper', 'code title durationMinutes totalScore')
      .populate('room', 'code name capacity rows cols roomType')
      .populate('proctor1', 'fullName email')
      .populate('proctor2', 'fullName email')
      .populate('inspector', 'fullName email')
      .sort({ startTime: -1 });

    return res.json({ success: true, count: sessions.length, data: sessions });
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

    const examStudent = await ExamStudent.findById(sessionStudentId)
      .populate('session')
      .populate('student');

    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thông tin thí sinh ca thi!' });
    }

    const session = await ExamSession.findById(examStudent.session._id).populate('room');
    const examPaper = await ExamPaper.findById(session.examPaper);

    if (!examPaper) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi của ca này!' });
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
        examStudent: {
          id: examStudent._id,
          candidateCode: examStudent.candidateCode,
          seatRow: examStudent.seatRow,
          seatCol: examStudent.seatCol,
          trustScore: examStudent.trustScore,
          startedAt: examStudent.startedAt,
          extraTimeMinutes: examStudent.extraTimeMinutes
        },
        student: {
          id: examStudent.student._id,
          name: examStudent.student.name,
          studentCode: examStudent.student.studentCode,
          email: examStudent.student.email
        },
        session: {
          id: session._id,
          code: session.code,
          title: session.title,
          durationMinutes: session.durationMinutes + examStudent.extraTimeMinutes,
          roomCode: session.room?.code || 'P302',
          roomName: session.room?.name || 'Phòng thi'
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

// Nộp bài thi & Kích hoạt Chấm Tự Động Trắc Nghiệm Tức Thì
exports.submitExam = async (req, res) => {
  try {
    const { sessionStudentId, answers } = req.body;

    const examStudent = await ExamStudent.findById(sessionStudentId).populate('session');
    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thí sinh!' });
    }

    if (examStudent.status === 'SUBMITTED') {
      return res.json({ success: true, message: 'Bài thi đã được nộp trước đó!' });
    }

    const session = await ExamSession.findById(examStudent.session._id);
    const examPaper = await ExamPaper.findById(session.examPaper);

    const submittedAnswers = answers || {};

    // 1. Chấm điểm trắc nghiệm tự động (Auto-Grading Engine)
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
          // So khớp đáp án (hỗ trợ số index hoặc mảng chấp nhận nhiều đáp án)
          if (q.correctAnswer === 'ALL_CORRECT') {
            isCorrect = true;
          } else if (Array.isArray(q.correctAnswer)) {
            if (Array.isArray(studentChoice)) {
              isCorrect = JSON.stringify([...q.correctAnswer].sort()) === JSON.stringify([...studentChoice].sort());
            } else {
              // Nếu đề có nhiều đáp án chấp nhận (VD: GV công nhận cả B và C), thí sinh chọn 1 trong các đáp án đó là đạt điểm
              isCorrect = q.correctAnswer.map(Number).includes(Number(studentChoice));
            }
          } else {
            isCorrect = Number(studentChoice) === Number(q.correctAnswer);
          }
        }

        const scoreEarned = isCorrect ? q.score : 0;
        if (studentChoice === undefined || studentChoice === null || studentChoice === '') {
          totalSkipped++;
        } else if (isCorrect) {
          totalCorrect++;
        } else {
          totalWrong++;
        }

        autoGradeTotal += scoreEarned;

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
      } else {
        // Tự luận hoặc Coding: Chờ giảng viên chấm
        questionResults.push({
          stt: q.stt,
          questionId: q._id.toString(),
          type: q.type,
          studentAnswer: studentChoice || '',
          correctAnswer: null,
          isCorrect: null,
          scoreEarned: 0,
          maxScore: q.score,
          explanation: q.gradingGuide || ''
        });
      }
    }

    // Làm tròn 2 chữ số thập phân
    autoGradeTotal = Math.round(autoGradeTotal * 100) / 100;

    // 2. Lưu hoặc Cập nhật Bài nộp trong MongoDB
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

    // 3. Cập nhật trạng thái Thí sinh trong ca thi
    examStudent.status = 'SUBMITTED';
    examStudent.submittedAt = new Date();
    examStudent.autoGradeScore = autoGradeTotal;
    examStudent.adjustedScore = autoGradeTotal; // Khởi tạo bằng điểm tự động
    await examStudent.save();

    // Cập nhật trạng thái ca thi sang AUTO_GRADED nếu chưa
    if (session.gradingStatus === 'NOT_GRADED') {
      session.gradingStatus = 'AUTO_GRADED';
      await session.save();
    }

    return res.json({
      success: true,
      message: 'Nộp bài thi thành công! Hệ thống đã tự động chấm bài của bạn.',
      data: {
        candidateCode: examStudent.candidateCode,
        submittedAt: examStudent.submittedAt,
        trustScore: examStudent.trustScore,
        autoGradeTotal,
        totalCorrect,
        totalWrong,
        totalSkipped
      }
    });
  } catch (error) {
    console.error('Lỗi submitExam:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Sinh viên xem kết quả và đối chiếu đáp án sau khi được Công bố
exports.getStudentExamResult = async (req, res) => {
  try {
    const { sessionStudentId } = req.params;

    const examStudent = await ExamStudent.findById(sessionStudentId)
      .populate('session')
      .populate('student');

    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài thi!' });
    }

    const session = await ExamSession.findById(examStudent.session._id)
      .populate('subject', 'name courseCode')
      .populate('examPaper');

    // Kiểm tra quyền công bố
    const isPublished = session.gradingStatus === 'PUBLISHED';

    const submission = await ExamSubmission.findOne({ examStudent: examStudent._id });

    if (!isPublished) {
      return res.json({
        success: true,
        isPublished: false,
        message: 'Điểm số của ca thi đang trong giai đoạn rà soát và đối soát bảo mật. Vui lòng quay lại sau khi Ban Khảo thí công bố!',
        session: {
          code: session.code,
          title: session.title,
          subjectName: session.subject.name
        },
        student: {
          name: examStudent.student.name,
          candidateCode: examStudent.candidateCode,
          trustScore: examStudent.trustScore,
          submittedAt: examStudent.submittedAt
        }
      });
    }

    // ĐÃ CÔNG BỐ: Trả về kết quả đầy đủ kèm từng câu và lời giải thích!
    const examPaper = session.examPaper;
    const questionsWithFeedback = (submission ? submission.questionResults : []).map(qr => {
      const originalQ = examPaper.questions.find(q => q._id.toString() === qr.questionId);
      return {
        stt: qr.stt,
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

    return res.json({
      success: true,
      isPublished: true,
      data: {
        session: {
          code: session.code,
          title: session.title,
          subjectName: session.subject.name,
          appealDeadline: session.appealDeadline
        },
        student: {
          name: examStudent.student.name,
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
          totalQuestions: examPaper.questions.length
        },
        questions: questionsWithFeedback
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

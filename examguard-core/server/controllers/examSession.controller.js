/**
 * =========================================================================
 * EXAM SESSION CONTROLLER (Tuân thủ Single Responsibility Principle - SRP)
 * Quản lý vòng đời Ca thi, sơ đồ phòng thi, danh sách thí sinh, gán chỗ ngồi,
 * sinh Số Báo Danh (SBD), phân bổ bàn thi và kết thúc ca thi.
 * =========================================================================
 */

const mongoose = require('mongoose');
const ExamSession = require('../models/examSession.model');
const ExamRoom = require('../models/examRoom.model');
const ExamStudent = require('../models/examStudent.model');
const ExamSubmission = require('../models/examSubmission.model');
const ExamPaper = require('../models/examPaper.model');
const Student = require('../models/student.model');
const { toSessionDetailDTO, toCandidateSeatDTO } = require('../dtos/examSession.dto');

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
                const s1 = [...q.correctAnswer].map(Number).sort((a,b)=>a-b);
                const s2 = [...studentChoice].map(Number).sort((a,b)=>a-b);
                isCorrect = JSON.stringify(s1) === JSON.stringify(s2);
              } else {
                isCorrect = q.correctAnswer.map(Number).includes(Number(studentChoice));
              }
            } else {
              isCorrect = Number(studentChoice) === Number(q.correctAnswer);
            }
          }

          const qScore = Number(q.score) || 1;
          const scoreEarned = isCorrect ? qScore : 0;
          autoGradeTotal += scoreEarned;

          if (isCorrect) totalCorrect++;
          else if (studentChoice === undefined || studentChoice === null || studentChoice === '') totalSkipped++;
          else totalWrong++;

          questionResults.push({
            questionId: q._id,
            questionNumber: i + 1,
            studentAnswer: studentChoice !== undefined ? studentChoice : null,
            correctAnswer: q.correctAnswer,
            isCorrect,
            scoreEarned,
            maxScore: qScore
          });
        }
      }

      const calculatedScore = parseFloat(autoGradeTotal.toFixed(2));

      if (!existingSub) {
        existingSub = new ExamSubmission({
          examStudent: examStudent._id,
          session: sessionId,
          student: examStudent.student,
          answers: submittedAnswers,
          submittedAt: new Date(),
          isAutoSubmitted: true,
          autoGradedScore: calculatedScore,
          finalScore: calculatedScore,
          totalCorrect,
          totalWrong,
          totalSkipped,
          questionResults,
          status: 'AUTO_SUBMITTED'
        });
      } else {
        existingSub.submittedAt = existingSub.submittedAt || new Date();
        existingSub.isAutoSubmitted = true;
        existingSub.autoGradedScore = calculatedScore;
        existingSub.finalScore = calculatedScore;
        existingSub.totalCorrect = totalCorrect;
        existingSub.totalWrong = totalWrong;
        existingSub.totalSkipped = totalSkipped;
        existingSub.questionResults = questionResults;
        existingSub.status = 'AUTO_SUBMITTED';
      }
      await existingSub.save();

      examStudent.status = 'SUBMITTED';
      examStudent.officialScore = calculatedScore;
      await examStudent.save();
    }
  } catch (err) {
    console.error('Lỗi autoSubmitRemainingStudents:', err.message);
  }
}

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

// Lấy danh sách ca thi kèm tự động đánh giá vòng đời ca thi (Lifecycle Evaluation)
exports.getExamSessions = async (req, res) => {
  try {
    const { status, gradingStatus, search, proctorId } = req.query;
    const filter = {};
    if (status && status !== 'ALL') filter.status = status;
    if (gradingStatus && gradingStatus !== 'ALL') filter.gradingStatus = gradingStatus;
    if (proctorId) {
      filter.$or = [
        { proctor1: proctorId },
        { proctor2: proctorId }
      ];
    }
    if (search) {
      const searchConditions = [
        { code: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
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
      .populate('room', 'code name capacity rows cols allowedIpSubnet rtspCameraUrl roomType layoutConfig roomPhoto viewMode')
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

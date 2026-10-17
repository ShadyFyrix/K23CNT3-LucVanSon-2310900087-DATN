const mongoose = require('mongoose');
const ExamSession = require('../models/examSession.model');
const ExamStudent = require('../models/examStudent.model');
const ExamViolation = require('../models/examViolation.model');
const faceAiService = require('../services/faceAi.service');
const socketService = require('../services/socket.service');
const User = require('../models/user.model');

/**
 * =========================================================================
 * PROCTOR CONTROLLER — GIÁM SÁT REALTIME, FACE AI & XỬ LÝ GIÁM THỊ ĐI LẠI
 * Nâng cấp Tuân thủ Section 13 của SYSTEM_BLUEPRINT.md
 * Hỗ trợ Socket.IO Realtime, Debounce vi phạm 30s, Phân loại Severity
 * =========================================================================
 */

// 1. Lấy trạng thái Realtime Phòng thi (Sơ đồ bàn, thí sinh & vi phạm)
exports.getLiveRoomState = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await ExamSession.findById(sessionId)
      .populate('room')
      .populate('subject', 'name courseCode')
      .populate('proctor1', 'fullName email')
      .populate('proctor2', 'fullName email')
      .populate('inspector', 'fullName email');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy ca thi!' });
    }

    const students = await ExamStudent.find({ session: sessionId })
      .populate('student', 'fullName name studentCode email phone faceImage')
      .sort({ seatRow: 1, seatCol: 1 });

    const recentViolations = await ExamViolation.find({ session: sessionId })
      .populate('examStudent', 'candidateCode seatRow seatCol')
      .populate('student', 'fullName name studentCode')
      .sort({ createdAt: -1 })
      .limit(30);

    return res.json({
      success: true,
      data: {
        session,
        room: session.room,
        students,
        recentViolations
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Nhận frame từ camera thí sinh & Phân tích AI (Xác thực Giám thị vs Người lạ & Debounce)
exports.inspectCameraFrame = async (req, res) => {
  try {
    const { sessionStudentId } = req.body;
    const file = req.file;

    const examStudent = await ExamStudent.findById(sessionStudentId)
      .populate('session')
      .populate('student');

    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Thí sinh không tồn tại!' });
    }

    // Kiểm tra Proctor Override: Nếu Giám thị đang đứng tại bàn trong khoảng thời gian override -> Miễn trừ AI
    if (examStudent.proctorOverrideUntil && new Date(examStudent.proctorOverrideUntil) > new Date()) {
      return res.json({
        success: true,
        proctorOverrideActive: true,
        trustScore: examStudent.trustScore,
        message: 'Bàn đang được Giám thị kiểm tra trực tiếp (Proctor Override Active).'
      });
    }

    let detectedEvent = null;
    let severity = 'LOW';
    let penalty = 0;
    let isProctorPresence = false;
    let proctorName = '';
    let aiMetadata = {};

    if (file) {
      try {
        let proctorAnalysis = null;
        try {
          proctorAnalysis = await faceAiService.inspectProctorFrame(file.buffer, examStudent.student?.studentCode, file.originalname);
        } catch (inspectErr) {
          console.warn('inspectProctorFrame fallback to detectPose:', inspectErr.message);
        }

        if (proctorAnalysis) {
          aiMetadata = proctorAnalysis.result || {};
          const violations = proctorAnalysis.violations || [];
          severity = proctorAnalysis.severity || 'LOW';

          if (violations.includes('NO_FACE') || !proctorAnalysis.face_detected) {
            detectedEvent = 'NO_FACE';
            penalty = 10;
            severity = 'MEDIUM';
          } else if (proctorAnalysis.num_faces > 1 || violations.includes('MULTIPLE_FACES')) {
            // CÓ NHIỀU HƠN 1 KHUÔN MẶT: So khớp với Giám thị / Thanh tra
            let recognizedAsStaff = false;
            const session = await ExamSession.findById(examStudent.session._id)
              .populate('proctor1')
              .populate('proctor2')
              .populate('inspector');

            try {
              const recognizeResult = await faceAiService.recognizeFace({
                imageBuffer: file.buffer,
                threshold: 0.65,
                checkLiveness: false
              });

              if (recognizeResult && recognizeResult.matched) {
                const matchedId = recognizeResult.employee_id || recognizeResult.user_id;
                const staffIds = [
                  session.proctor1 ? session.proctor1._id.toString() : null,
                  session.proctor2 ? session.proctor2._id.toString() : null,
                  session.inspector ? session.inspector._id.toString() : null
                ].filter(Boolean);

                if (staffIds.includes(matchedId) || recognizeResult.role === 'teacher' || recognizeResult.department === 'teacher') {
                  recognizedAsStaff = true;
                  proctorName = recognizeResult.full_name || 'Cán bộ coi thi';
                }
              }
            } catch (recErr) {
              console.warn('Face recognize proctor fallback:', recErr.message);
            }

            if (recognizedAsStaff) {
              detectedEvent = 'PROCTOR_INSPECTION';
              penalty = 0;
              severity = 'NONE';
              isProctorPresence = true;
            } else {
              detectedEvent = 'MULTIPLE_FACES';
              penalty = 15;
              severity = 'HIGH';
            }
          } else if (violations.includes('PHONE_DETECTED')) {
            detectedEvent = 'PHONE_DETECTED';
            penalty = 20;
            severity = 'HIGH';
          } else if (violations.includes('LOOK_AWAY')) {
            detectedEvent = 'LOOK_AWAY';
            penalty = proctorAnalysis.suggested_penalty || 5;
            severity = proctorAnalysis.severity || 'LOW';
          }
        } else {
          // Fallback sang detectPose
          const poseData = await faceAiService.detectPose(file.buffer, file.originalname);

          if (!poseData || !poseData.faces || poseData.faces.length === 0) {
            detectedEvent = 'NO_FACE';
            penalty = 10;
            severity = 'MEDIUM';
          } else if (poseData.faces.length > 1) {
            detectedEvent = 'MULTIPLE_FACES';
            penalty = 15;
            severity = 'HIGH';
          } else {
            const face = poseData.faces[0];
            const yaw = Math.abs(face.yaw || 0);
            const pitch = Math.abs(face.pitch || 0);

            if (yaw > 28 || pitch > 25) {
              detectedEvent = 'LOOK_AWAY';
              penalty = 5;
              severity = 'LOW';
            }
          }
        }
      } catch (aiErr) {
        console.warn('Inspect frame AI call error:', aiErr.message);
      }
    }

    // Nếu phát hiện Giám thị đi ngang qua
    if (detectedEvent === 'PROCTOR_INSPECTION') {
      return res.json({
        success: true,
        detectedEvent: 'PROCTOR_INSPECTION',
        severity: 'NONE',
        penalty: 0,
        isProctorPresence: true,
        proctorName,
        trustScore: examStudent.trustScore,
        message: 'Phát hiện Giám thị kiểm tra bàn (Miễn trừ phạt)'
      });
    }

    // Nếu có sự kiện vi phạm được phát hiện
    if (detectedEvent) {
      // DEBOUNCE: Kiểm tra xem vi phạm cùng loại có xảy ra trong 30s qua không
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000);
      const recentDup = await ExamViolation.findOne({
        examStudent: examStudent._id,
        type: detectedEvent,
        createdAt: { $gte: thirtySecondsAgo }
      });

      if (recentDup) {
        return res.json({
          success: true,
          detectedEvent,
          penalty: 0,
          severity,
          debounced: true,
          trustScore: examStudent.trustScore,
          message: `Vi phạm ${detectedEvent} đã được ghi nhận trong 30 giây gần nhất (Debounced).`
        });
      }

      const newScore = Math.max(0, examStudent.trustScore - penalty);
      examStudent.trustScore = newScore;
      await examStudent.save();

      const violation = await ExamViolation.create({
        session: examStudent.session._id,
        examStudent: examStudent._id,
        student: examStudent.student._id,
        type: detectedEvent,
        severity,
        penalty,
        isProctorPresence: false,
        proctorName: '',
        snapshotUrl: file ? `/uploads/${file.filename}` : '',
        metadata: aiMetadata,
        timestamp: new Date()
      });

      // Bắn Socket.IO realtime cho Giám thị trong phòng thi
      const violationPayload = {
        violationId: violation._id,
        examStudentId: examStudent._id,
        studentId: examStudent.student._id,
        candidateCode: examStudent.candidateCode,
        studentName: examStudent.student?.fullName || examStudent.student?.name || 'Thí sinh',
        seatRow: examStudent.seatRow,
        seatCol: examStudent.seatCol,
        type: detectedEvent,
        severity,
        penalty,
        newTrustScore: newScore,
        snapshotUrl: violation.snapshotUrl,
        createdAt: violation.createdAt
      };

      socketService.emitViolation(examStudent.session._id, violationPayload);
      socketService.emitStudentUpdate(examStudent.session._id, {
        examStudentId: examStudent._id,
        candidateCode: examStudent.candidateCode,
        trustScore: newScore,
        status: examStudent.status
      });

      return res.json({
        success: true,
        detectedEvent,
        severity,
        penalty,
        isProctorPresence: false,
        trustScore: newScore,
        violationId: violation._id
      });
    }

    return res.json({
      success: true,
      detectedEvent: 'NORMAL',
      severity: 'NONE',
      penalty: 0,
      trustScore: examStudent.trustScore
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Giám thị gửi Cảnh báo nhắc nhở đến màn hình Thí sinh
exports.sendWarning = async (req, res) => {
  try {
    const { sessionStudentId, message } = req.body;

    const examStudent = await ExamStudent.findById(sessionStudentId).populate('student');
    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thí sinh!' });
    }

    // Trừ 5 điểm cảnh báo
    examStudent.trustScore = Math.max(0, examStudent.trustScore - 5);
    await examStudent.save();

    const violation = await ExamViolation.create({
      session: examStudent.session,
      examStudent: examStudent._id,
      student: examStudent.student._id,
      type: 'MANUAL_WARNING',
      severity: 'MEDIUM',
      penalty: 5,
      metadata: { proctorMessage: message || 'Yêu cầu tập trung làm bài, nhìn thẳng vào màn hình.' }
    });

    const warningText = message || 'Yêu cầu tập trung làm bài, nhìn thẳng vào màn hình.';

    // Gửi trực tiếp tới thí sinh qua Socket.IO
    socketService.emitDirectWarning(examStudent.session, examStudent.student._id, {
      violationId: violation._id,
      message: warningText,
      penalty: 5,
      newTrustScore: examStudent.trustScore,
      timestamp: new Date()
    });

    // Cập nhật cho toàn bộ Giám thị
    socketService.emitStudentUpdate(examStudent.session, {
      examStudentId: examStudent._id,
      candidateCode: examStudent.candidateCode,
      trustScore: examStudent.trustScore
    });

    return res.json({
      success: true,
      message: `Đã gửi cảnh báo tới thí sinh ${examStudent.candidateCode}!`,
      trustScore: examStudent.trustScore
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Giám thị Tạm dừng Giám sát Bàn (Proctor Override khi đứng kiểm tra)
exports.setProctorOverride = async (req, res) => {
  try {
    const { sessionStudentId, durationMinutes } = req.body;
    const minutes = durationMinutes || 2;

    const examStudent = await ExamStudent.findById(sessionStudentId);
    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thí sinh!' });
    }

    const overrideUntil = new Date(Date.now() + minutes * 60 * 1000);
    examStudent.proctorOverrideUntil = overrideUntil;
    await examStudent.save();

    // Thông báo realtime cho UI giám thị
    socketService.emitRoomBroadcast(examStudent.session, 'proctor:override_update', {
      examStudentId: examStudent._id,
      candidateCode: examStudent.candidateCode,
      seatRow: examStudent.seatRow,
      seatCol: examStudent.seatCol,
      overrideUntil
    });

    return res.json({
      success: true,
      message: `Đã tạm dừng giám sát AI cho bàn ${examStudent.seatRow}-${examStudent.seatCol} trong ${minutes} phút.`,
      overrideUntil
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Giám thị Cộng bù giờ (Extra Time) cho Thí sinh gặp sự cố mạng
exports.addExtraTime = async (req, res) => {
  try {
    const { sessionStudentId, extraMinutes, reason } = req.body;

    const examStudent = await ExamStudent.findById(sessionStudentId);
    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thí sinh!' });
    }

    const minutesToAdd = Math.min(15, Number(extraMinutes) || 5);
    examStudent.extraTimeMinutes = (examStudent.extraTimeMinutes || 0) + minutesToAdd;
    await examStudent.save();

    socketService.emitRoomBroadcast(examStudent.session, 'student:extra_time', {
      examStudentId: examStudent._id,
      candidateCode: examStudent.candidateCode,
      extraMinutes: minutesToAdd,
      totalExtraMinutes: examStudent.extraTimeMinutes,
      reason: reason || 'Sự cố đường truyền'
    });

    return res.json({
      success: true,
      message: `Đã cộng bù ${minutesToAdd} phút làm bài cho thí sinh ${examStudent.candidateCode}.`,
      totalExtraMinutes: examStudent.extraTimeMinutes
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Giám thị Bỏ qua Vi phạm Bắt nhầm (Dismiss Violation & Phục hồi điểm uy tín)
exports.dismissViolation = async (req, res) => {
  try {
    const { violationId, reason } = req.body;

    const violation = await ExamViolation.findById(violationId).populate('examStudent');
    if (!violation) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy vi phạm!' });
    }

    if (violation.isDismissed) {
      return res.json({ success: true, message: 'Vi phạm này đã được bỏ qua trước đó.' });
    }

    violation.isDismissed = true;
    violation.dismissReason = reason || 'Giám thị xác nhận bắt nhầm / không gian lận';
    await violation.save();

    // Khôi phục lại điểm uy tín đã bị trừ
    if (violation.examStudent && violation.penalty > 0) {
      violation.examStudent.trustScore = Math.min(100, violation.examStudent.trustScore + violation.penalty);
      await violation.examStudent.save();

      socketService.emitStudentUpdate(violation.session, {
        examStudentId: violation.examStudent._id,
        candidateCode: violation.examStudent.candidateCode,
        trustScore: violation.examStudent.trustScore
      });
    }

    socketService.emitRoomBroadcast(violation.session, 'proctor:violation_dismissed', {
      violationId: violation._id,
      examStudentId: violation.examStudent?._id,
      newTrustScore: violation.examStudent ? violation.examStudent.trustScore : 100
    });

    return res.json({
      success: true,
      message: 'Đã hủy bỏ vi phạm và phục hồi điểm uy tín cho thí sinh.',
      newTrustScore: violation.examStudent ? violation.examStudent.trustScore : 100
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Giám thị Đình chỉ Thi (Suspend Candidate & Khóa bài làm)
exports.suspendCandidate = async (req, res) => {
  try {
    const { sessionStudentId, reason } = req.body;

    const examStudent = await ExamStudent.findById(sessionStudentId);
    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thí sinh!' });
    }

    examStudent.status = 'SUSPENDED';
    examStudent.trustScore = 0;
    examStudent.gradingNotes = `ĐÌNH CHỈ THI: ${reason || 'Vi phạm quy chế thi nghiêm trọng'}`;
    await examStudent.save();

    socketService.emitRoomBroadcast(examStudent.session, 'student:suspended', {
      examStudentId: examStudent._id,
      studentId: examStudent.student,
      candidateCode: examStudent.candidateCode,
      reason: reason || 'Vi phạm quy chế thi nghiêm trọng'
    });

    return res.json({
      success: true,
      message: `Đã đình chỉ thi và khóa bài làm của thí sinh ${examStudent.candidateCode}!`,
      status: 'SUSPENDED'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Ghi nhận vi phạm trình duyệt (Anti-Cheat Event: TAB_SWITCH, COPY_PASTE, DEVTOOLS, etc.)
exports.logAntiCheatEvent = async (req, res) => {
  try {
    const { sessionStudentId, eventType, details } = req.body;

    const examStudent = await ExamStudent.findById(sessionStudentId)
      .populate('session')
      .populate('student');

    if (!examStudent) {
      return res.status(404).json({ success: false, message: 'Thí sinh không tồn tại!' });
    }

    if (examStudent.status !== 'IN_PROGRESS') {
      return res.json({ success: true, message: 'Thí sinh hiện không trong trạng thái làm bài.' });
    }

    // Debounce check 15s cho cùng loại sự kiện trình duyệt
    const fifteenSecAgo = new Date(Date.now() - 15 * 1000);
    const recentEvent = await ExamViolation.findOne({
      examStudent: examStudent._id,
      type: eventType,
      createdAt: { $gte: fifteenSecAgo }
    });

    if (recentEvent) {
      return res.json({
        success: true,
        debounced: true,
        message: 'Sự kiện đã được ghi nhận gần đây.',
        trustScore: examStudent.trustScore
      });
    }

    let severity = 'LOW';
    let penalty = 5;
    let message = 'Hành vi bất thường trên trình duyệt';

    try {
      const evalRes = await faceAiService.evaluateAntiCheat({
        sessionId: examStudent.session._id.toString(),
        studentId: examStudent.student._id.toString(),
        eventType,
        details
      });
      severity = evalRes.severity || 'LOW';
      penalty = evalRes.suggested_penalty || 5;
      message = evalRes.message || message;
    } catch (aiErr) {
      const fallbackMap = {
        'DEVTOOLS_OPEN': { severity: 'CRITICAL', penalty: 30 },
        'TAB_SWITCH': { severity: 'MEDIUM', penalty: 10 },
        'COPY_PASTE': { severity: 'MEDIUM', penalty: 10 },
        'FULLSCREEN_EXIT': { severity: 'MEDIUM', penalty: 10 },
        'RIGHT_CLICK': { severity: 'LOW', penalty: 5 }
      };
      const fb = fallbackMap[eventType] || { severity: 'LOW', penalty: 5 };
      severity = fb.severity;
      penalty = fb.penalty;
    }

    const newScore = Math.max(0, examStudent.trustScore - penalty);
    examStudent.trustScore = newScore;
    await examStudent.save();

    const violation = await ExamViolation.create({
      session: examStudent.session._id,
      examStudent: examStudent._id,
      student: examStudent.student._id,
      type: eventType,
      severity,
      penalty,
      metadata: details || {},
      timestamp: new Date()
    });

    const violationPayload = {
      violationId: violation._id,
      examStudentId: examStudent._id,
      studentId: examStudent.student._id,
      candidateCode: examStudent.candidateCode,
      studentName: examStudent.student?.fullName || examStudent.student?.name || 'Thí sinh',
      seatRow: examStudent.seatRow,
      seatCol: examStudent.seatCol,
      type: eventType,
      severity,
      penalty,
      newTrustScore: newScore,
      message,
      createdAt: violation.createdAt
    };

    socketService.emitViolation(examStudent.session._id, violationPayload);
    socketService.emitStudentUpdate(examStudent.session._id, {
      examStudentId: examStudent._id,
      candidateCode: examStudent.candidateCode,
      trustScore: newScore
    });

    return res.json({
      success: true,
      violationId: violation._id,
      eventType,
      severity,
      penalty,
      trustScore: newScore,
      message
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 9. Thống kê thời gian thực phòng thi (Live Room Statistics)
exports.getLiveStatistics = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const students = await ExamStudent.find({ session: sessionId });
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'IN_PROGRESS').length;
    const completedStudents = students.filter(s => s.status === 'COMPLETED').length;
    const suspendedStudents = students.filter(s => s.status === 'SUSPENDED').length;
    const flaggedStudents = students.filter(s => s.trustScore < 70).length;

    const avgTrustScore = totalStudents > 0
      ? Math.round(students.reduce((acc, s) => acc + (s.trustScore !== undefined ? s.trustScore : 100), 0) / totalStudents)
      : 100;

    const violations = await ExamViolation.find({ session: sessionId, isDismissed: false });

    const severityCounts = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };

    const typeCounts = {};

    violations.forEach(v => {
      const sev = v.severity || 'LOW';
      if (severityCounts[sev] !== undefined) {
        severityCounts[sev]++;
      }
      typeCounts[v.type] = (typeCounts[v.type] || 0) + 1;
    });

    return res.json({
      success: true,
      data: {
        totalStudents,
        activeStudents,
        completedStudents,
        suspendedStudents,
        flaggedStudents,
        avgTrustScore,
        totalViolations: violations.length,
        severityCounts,
        typeCounts
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 10. Lấy dòng thời gian giám sát (Audit Timeline)
exports.getTimeline = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const violations = await ExamViolation.find({ session: sessionId })
      .populate('examStudent', 'candidateCode seatRow seatCol trustScore')
      .populate('student', 'name studentCode')
      .sort({ createdAt: -1 })
      .limit(limit);

    return res.json({
      success: true,
      data: violations
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const mongoose = require('mongoose');
const ExamSession = require('../models/examSession.model');
const ExamStudent = require('../models/examStudent.model');
const ExamViolation = require('../models/examViolation.model');
const faceAiService = require('../services/faceAi.service');
const User = require('../models/user.model');

/**
 * =========================================================================
 * PROCTOR CONTROLLER — GIÁM SÁT REALTIME, FACE AI & XỬ LÝ GIÁM THỊ ĐI LẠI
 * Tuân thủ Section 13 của SYSTEM_BLUEPRINT.md
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
      .populate('student', 'name studentCode email phone faceImage')
      .sort({ seatRow: 1, seatCol: 1 });

    const recentViolations = await ExamViolation.find({ session: sessionId })
      .populate('examStudent', 'candidateCode seatRow seatCol')
      .populate('student', 'name studentCode')
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

// 2. Nhận frame từ camera thí sinh & Phân tích AI (Xác thực Giám thị vs Người lạ)
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
    let penalty = 0;
    let isProctorPresence = false;
    let proctorName = '';

    if (file) {
      try {
        // Gọi dịch vụ Face AI phân tích pose & nhận diện
        const poseData = await faceAiService.detectPose(file.buffer, file.originalname);

        if (!poseData || !poseData.faces || poseData.faces.length === 0) {
          // Không tìm thấy khuôn mặt trong khung hình (SV rời khỏi chỗ)
          detectedEvent = 'NO_FACE';
          penalty = 10;
        } else if (poseData.faces.length > 1) {
          // CÓ NHIỀU HƠN 1 KHUÔN MẶT TRONG KHUNG HÌNH!
          // THEO SECTION 13 CỦA SYSTEM_BLUEPRINT:
          // So khớp khuôn mặt thứ 2 với Cán bộ coi thi / Thanh tra để tránh phạt oan!
          
          let recognizedAsStaff = false;
          const session = await ExamSession.findById(examStudent.session._id)
            .populate('proctor1')
            .populate('proctor2')
            .populate('inspector');

          // Thử đối chiếu khuôn mặt với danh sách Giám thị / Thanh tra
          try {
            const recognizeResult = await faceAiService.recognizeFace({
              imageBuffer: file.buffer,
              threshold: 0.65,
              checkLiveness: false
            });

            if (recognizeResult && recognizeResult.matched) {
              const matchedId = recognizeResult.employee_id || recognizeResult.user_id;
              
              // Kiểm tra xem ID có trùng với proctor1, proctor2 hoặc inspector không
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
            // ĐÍCH THỊ LÀ GIÁM THỊ ĐANG ĐI QUANH LỚP!
            detectedEvent = 'PROCTOR_INSPECTION';
            penalty = 0; // TUYỆT ĐỐI KHÔNG TRỪ ĐIỂM!
            isProctorPresence = true;
          } else {
            // Người lạ / Gian lận
            detectedEvent = 'MULTIPLE_FACES';
            penalty = 15;
          }
        } else {
          // 1 khuôn mặt duy nhất: Kiểm tra góc quay mặt (Pose Yaw/Pitch)
          const face = poseData.faces[0];
          const yaw = Math.abs(face.yaw || 0);
          const pitch = Math.abs(face.pitch || 0);

          if (yaw > 28 || pitch > 25) {
            detectedEvent = 'LOOK_AWAY';
            penalty = 5;
          }
        }
      } catch (aiErr) {
        console.warn('Inspect frame AI call error:', aiErr.message);
      }
    }

    // Nếu có sự kiện được phát hiện -> Ghi log vi phạm
    if (detectedEvent) {
      const newScore = Math.max(0, examStudent.trustScore - penalty);
      examStudent.trustScore = newScore;
      await examStudent.save();

      const violation = await ExamViolation.create({
        session: examStudent.session._id,
        examStudent: examStudent._id,
        student: examStudent.student._id,
        type: detectedEvent,
        penalty,
        isProctorPresence,
        proctorName,
        snapshotUrl: file ? `/uploads/${file.filename}` : '',
        timestamp: new Date()
      });

      return res.json({
        success: true,
        detectedEvent,
        penalty,
        isProctorPresence,
        proctorName,
        trustScore: newScore,
        violationId: violation._id
      });
    }

    return res.json({
      success: true,
      detectedEvent: 'NORMAL',
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

    await ExamViolation.create({
      session: examStudent.session,
      examStudent: examStudent._id,
      student: examStudent.student._id,
      type: 'MANUAL_WARNING',
      penalty: 5,
      metadata: { proctorMessage: message || 'Yêu cầu tập trung làm bài, nhìn thẳng vào màn hình.' }
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

// 4. Giám thị Tạm dừng Giám sát Bàn (Proctor Override 2 phút khi đứng kiểm tra)
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
    }

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

    return res.json({
      success: true,
      message: `Đã đình chỉ thi và khóa bài làm của thí sinh ${examStudent.candidateCode}!`,
      status: 'SUSPENDED'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const ExamSession = require('../models/examSession.model');
const ExamStudent = require('../models/examStudent.model');
const ExamPaper = require('../models/examPaper.model');
const ExamRoom = require('../models/examRoom.model');
const ExamViolation = require('../models/examViolation.model');
const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');

// [GET] /api/dashboard/stats — Thống kê Trung tâm Khảo thí & Giám sát ExamGuard AI
exports.getDashboardStats = async (req, res) => {
  try {
    const totalSessions = await ExamSession.countDocuments();
    const activeSessions = await ExamSession.countDocuments({ status: 'IN_PROGRESS' });
    const scheduledSessions = await ExamSession.countDocuments({ status: 'SCHEDULED' });
    const completedSessions = await ExamSession.countDocuments({ status: 'COMPLETED' });

    const totalStudents = await Student.countDocuments();
    const kycStudents = await Student.countDocuments({ isFaceKyc: true });

    const totalTeachers = await Teacher.countDocuments();
    const kycTeachers = await Teacher.countDocuments({ isFaceKyc: true });

    const totalRooms = await ExamRoom.countDocuments({ isActive: true });
    const totalPapers = await ExamPaper.countDocuments();

    // Thí sinh trong các ca thi
    const totalCandidates = await ExamStudent.countDocuments();
    const inExamCandidates = await ExamStudent.countDocuments({ status: 'IN_EXAM' });
    const submittedCandidates = await ExamStudent.countDocuments({ status: 'SUBMITTED' });

    // Vi phạm AI
    const totalViolations = await ExamViolation.countDocuments();
    const activeViolations = await ExamViolation.countDocuments({ isDismissed: false });
    const proctorPresences = await ExamViolation.countDocuments({ isProctorPresence: true });

    // Điểm uy tín trung bình
    const trustScoreAgg = await ExamStudent.aggregate([
      { $match: { status: { $in: ['IN_EXAM', 'SUBMITTED'] } } },
      { $group: { _id: null, avgScore: { $avg: '$trustScore' } } }
    ]);
    const avgTrustScore = trustScoreAgg[0]?.avgScore ? Math.round(trustScoreAgg[0].avgScore * 10) / 10 : 98.5;

    // Phân loại vi phạm
    const violationTypeAgg = await ExamViolation.aggregate([
      { $match: { isDismissed: false } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    const violationBreakdown = violationTypeAgg.map(v => ({
      type: v._id,
      count: v.count
    }));

    // Ca thi đang diễn ra hoặc gần nhất
    const recentSessions = await ExamSession.find()
      .populate('subject', 'name code')
      .populate('room', 'name code rows cols capacity')
      .populate('examPaper', 'title durationMinutes totalScore')
      .sort({ startTime: -1 })
      .limit(6);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalSessions,
          activeSessions,
          scheduledSessions,
          completedSessions,
          totalStudents,
          kycStudents,
          totalTeachers,
          kycTeachers,
          totalRooms,
          totalPapers,
          totalCandidates,
          inExamCandidates,
          submittedCandidates,
          totalViolations,
          activeViolations,
          proctorPresences,
          avgTrustScore
        },
        violationBreakdown,
        recentSessions
      }
    });

  } catch (error) {
    console.error('Lỗi tính toán ExamGuard Dashboard:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi tải báo cáo Khảo thí',
      error: error.message
    });
  }
};

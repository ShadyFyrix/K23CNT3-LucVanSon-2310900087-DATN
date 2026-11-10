/**
 * =========================================================================
 * EXAM ROUTES (Tuân thủ Single Responsibility & Clean Routing)
 * Định tuyến các API theo phân hệ:
 *   - /papers:       Ủy quyền cho ExamPaperController
 *   - /rooms:        Ủy quyền cho ExamSessionController
 *   - /sessions:     Ủy quyền cho ExamSessionController
 *   - /questions...: Ủy quyền cho ExamSubmissionController
 * =========================================================================
 */

const express = require('express');
const router = express.Router();
const examPaperController = require('../controllers/examPaper.controller');
const examSessionController = require('../controllers/examSession.controller');
const examSubmissionController = require('../controllers/examSubmission.controller');
const proctorController = require('../controllers/proctor.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { userHasAnyRole } = require('../utils/roleHelper');

const requireStaffRole = (req, res, next) => {
  if (!req.user || !userHasAnyRole(req.user, ['admin', 'superadmin', 'teacher', 'academic'])) {
    return res.status(403).json({
      success: false,
      message: 'Chỉ Giảng viên hoặc Quản trị viên Khảo thí mới có quyền tạo ca thi!'
    });
  }
  next();
};

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'exam-papers');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `exam_${Date.now()}_${cleanName}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file PDF, Word (.docx) hoặc hình ảnh (.png, .jpg)'));
    }
  }
});

// ==============================
// 1. ĐỀ THI (EXAM PAPERS)
// ==============================
router.post('/upload-paper-file', upload.single('file'), examPaperController.uploadPaperFile);
router.post('/papers', examPaperController.createExamPaper);
router.get('/papers', examPaperController.getExamPapers);
router.get('/papers/:id', examPaperController.getExamPaperDetail);
router.put('/papers/:id', examPaperController.updateExamPaper);

// ==============================
// 2. PHÒNG THI (EXAM ROOMS)
// ==============================
router.get('/rooms', examSessionController.getExamRooms);
router.post('/rooms', examSessionController.createExamRoom);

// ==============================
// 3. CA THI & THÍ SINH (EXAM SESSIONS)
// ==============================
router.post('/sessions', authMiddleware, requireStaffRole, examSessionController.createExamSession);
router.get('/sessions', examSessionController.getExamSessions);
router.get('/sessions/:id', examSessionController.getExamSessionDetail);
router.post('/sessions/:sessionId/assign-students', examSessionController.assignStudentsToSession);
router.put('/sessions/:sessionId/students/:examStudentId', examSessionController.updateExamStudent);
router.post('/sessions/:sessionId/generate-candidate-codes', examSessionController.bulkGenerateCandidateCodes);
router.post('/sessions/:sessionId/add-student', examSessionController.addStudentToSession);
router.post('/sessions/:sessionId/bulk-add-students', examSessionController.bulkAddStudentsToSession);
router.delete('/sessions/:sessionId/students/:examStudentId', examSessionController.removeStudentFromSession);
router.post('/sessions/:sessionId/end-session', examSessionController.endExamSession);

// ==============================
// 4. THÍ SINH LÀM BÀI (CANDIDATE WORKSPACE)
// ==============================
router.get('/questions/:sessionStudentId', examSubmissionController.getSanitizedQuestions);
router.post('/save-progress', examSubmissionController.saveProgress);
router.post('/submit', examSubmissionController.submitExam);
router.post('/unlock-late-student', proctorController.unlockLateStudent);

// ==============================
// 5. TRA CỨU KẾT QUẢ & LỊCH THI
// ==============================
router.get('/results/:sessionStudentId', examSubmissionController.getStudentExamResult);
router.get('/student-schedule', examSubmissionController.getStudentExamSchedule);

module.exports = router;

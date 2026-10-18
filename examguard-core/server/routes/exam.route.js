const express = require('express');
const router = express.Router();
const examController = require('../controllers/exam.controller');
const proctorController = require('../controllers/proctor.controller');

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

// Đề thi (Exam Papers)
router.post('/upload-paper-file', upload.single('file'), examController.uploadPaperFile);
router.post('/papers', examController.createExamPaper);
router.get('/papers', examController.getExamPapers);
router.get('/papers/:id', examController.getExamPaperDetail);

// Phòng thi (Exam Rooms)
router.get('/rooms', examController.getExamRooms);
router.post('/rooms', examController.createExamRoom);

// Ca thi (Exam Sessions)
router.post('/sessions', examController.createExamSession);
router.get('/sessions', examController.getExamSessions);
router.get('/sessions/:id', examController.getExamSessionDetail);
router.post('/sessions/:sessionId/assign-students', examController.assignStudentsToSession);
router.put('/sessions/:sessionId/students/:examStudentId', examController.updateExamStudent);
router.post('/sessions/:sessionId/generate-candidate-codes', examController.bulkGenerateCandidateCodes);
router.post('/sessions/:sessionId/add-student', examController.addStudentToSession);
router.delete('/sessions/:sessionId/students/:examStudentId', examController.removeStudentFromSession);
router.post('/sessions/:sessionId/end-session', examController.endExamSession);

// Thí sinh làm bài thi (Candidate Workspace)
router.get('/questions/:sessionStudentId', examController.getSanitizedQuestions);
router.post('/save-progress', examController.saveProgress);
router.post('/submit', examController.submitExam);
router.post('/unlock-late-student', proctorController.unlockLateStudent);

// Tra cứu kết quả kèm đáp án & lời giải thích
router.get('/results/:sessionStudentId', examController.getStudentExamResult);

module.exports = router;

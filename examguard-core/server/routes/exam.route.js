const express = require('express');
const router = express.Router();
const examController = require('../controllers/exam.controller');

// Đề thi (Exam Papers)
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

// Thí sinh làm bài thi (Candidate Workspace)
router.get('/questions/:sessionStudentId', examController.getSanitizedQuestions);
router.post('/save-progress', examController.saveProgress);
router.post('/submit', examController.submitExam);

// Tra cứu kết quả kèm đáp án & lời giải thích
router.get('/results/:sessionStudentId', examController.getStudentExamResult);

module.exports = router;

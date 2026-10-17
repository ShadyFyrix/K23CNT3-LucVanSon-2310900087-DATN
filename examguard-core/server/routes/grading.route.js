const express = require('express');
const router = express.Router();
const gradingController = require('../controllers/grading.controller');

// Tự động chấm bài toàn ca thi
router.post('/auto-grade/:sessionId', gradingController.autoGradeSession);

// Workspace rà soát 1 lần của Giảng viên & Cảnh báo bất thường đề thi
router.get('/review/:sessionId', gradingController.getReviewWorkspace);

// Giảng viên can thiệp sửa đáp án / công nhận thêm đáp án đúng
router.post('/adjust-question', gradingController.adjustQuestion);

// Chấm lại tức thì toàn bộ ca thi sau khi sửa đáp án
router.post('/recalculate/:sessionId', gradingController.recalculateSession);

// Phê duyệt và khóa bảng điểm
router.post('/approve/:sessionId', gradingController.approveGrades);

// Ban Khảo thí công bố kết quả và đáp án cho sinh viên
router.post('/publish/:sessionId', gradingController.publishGrades);

module.exports = router;

const express = require('express');
const router = express.Router();
const quizArenaController = require('../controllers/quizArena.controller');

// Lấy thông tin trạng thái và sảnh chờ đấu trường
router.get('/state/:sessionId', quizArenaController.getArenaState);

// Giảng viên tạo nhanh phòng Quiz
router.post('/create-room', quizArenaController.createQuickQuizRoom);

// Giảng viên tùy biến luật chơi
router.post('/rules/:sessionId', quizArenaController.updateGameRules);

// Đồng bộ điểm đấu trường vào cơ sở dữ liệu chính thức
router.post('/sync-grades/:sessionId', quizArenaController.syncArenaGrades);

module.exports = router;

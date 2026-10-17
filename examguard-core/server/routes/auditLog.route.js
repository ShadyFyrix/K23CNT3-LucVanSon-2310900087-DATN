const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/auditLog.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// Chỉ admin mới được xem nhật ký hoạt động
router.get('/', authMiddleware, adminMiddleware, auditLogController.getLogs);

module.exports = router;

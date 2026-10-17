const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/ip-location', authController.getIpLocation);
router.get('/me', authMiddleware, authController.getMe);

// Chỉ Admin mới xem được danh sách và xóa
router.get('/users', authMiddleware, adminMiddleware, authController.getAllUsers);
router.delete('/users/:id', authMiddleware, adminMiddleware, authController.deleteUserById);

router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);

// Force Logout API - Admin Only
router.post('/force-logout-all', authMiddleware, adminMiddleware, authController.forceLogoutAll);
router.post('/force-logout/:userId', authMiddleware, adminMiddleware, authController.forceLogoutUser);

module.exports = router;
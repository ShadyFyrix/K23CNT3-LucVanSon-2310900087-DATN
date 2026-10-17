const express = require('express');
const router = express.Router();

const teacherController = require('../controllers/teacher.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permission.middleware');


/**
 * [PUBLIC] Giảng viên hiển thị trên Landing Page
 */
router.get('/landing', teacherController.getLandingTeachers);


/**
 * [PROTECTED] Lấy thông tin teacher của user đang đăng nhập (dựa trên userId)
 */
router.get(
  '/me',
  authMiddleware,
  teacherController.getMyTeacherProfile
);


/**
 * [PROTECTED - Admin] Cập nhật cấu hình Landing Page cho giảng viên
 */
router.put(
  '/landing/config',
  authMiddleware,
  checkPermission('all'),
  teacherController.updateLandingConfig
);


/**
 * Create teacher
 */
router.post('/', teacherController.createTeacher);


/**
 * Get teachers
 */
router.get('/', teacherController.getTeachers);


/**
 * Get teacher by id
 */
router.get('/:id', teacherController.getTeacherById);


/**
 * Update teacher
 */
router.put('/:id', teacherController.updateTeacher);
router.patch('/:id', teacherController.updateTeacher);



/**
 * Delete teacher
 */
router.delete('/:id', teacherController.deleteTeacher);


module.exports = router;
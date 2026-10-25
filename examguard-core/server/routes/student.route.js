const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const studentController = require('../controllers/student.controller');

// Áp dụng xác thực cho tất cả endpoint sinh viên
router.use(authMiddleware);

router.post('/bulk-create-accounts', studentController.bulkCreateAccounts);
router.post('/', studentController.createStudent);
router.get('/me', studentController.getMyStudentProfile);
router.get('/', studentController.getStudents);
router.get('/:id', studentController.getStudentById);
router.put('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

module.exports = router;
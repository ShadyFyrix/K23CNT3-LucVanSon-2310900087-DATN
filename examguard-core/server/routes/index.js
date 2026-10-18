const express = require('express');
const router = express.Router();

/**
 * =========================================================================
 * EXAMGUARD AI — HỆ THỐNG QUẢN LÝ THI TRỰC TUYẾN & GIÁM SÁT THÔNG MINH
 * Tích hợp Nhận diện Khuôn mặt, Phòng thi 3D & Chấm thi Tự động
 * =========================================================================
 */

// 1. Xác thực & Tài khoản người dùng
const authRoutes = require('./auth.route');
const userRoutes = require('./user.route');
const roleRoutes = require('./role.route');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);

// 2. Cơ cấu Đào tạo theo Phân cấp (Khoa — Khóa — Lớp — Môn học — Sinh viên & Giảng viên)
const departmentRoutes = require('./department.route');
const academicBatchRoutes = require('./academicBatch.route');
const classRoutes = require('./class.route');
const courseRoutes = require('./course.route');
const studentRoutes = require('./student.route');
const teacherRoutes = require('./teacher.route');
const roomRoutes = require('./room.route');
const campusRoutes = require('./campus.route');

router.use('/departments', departmentRoutes);
router.use('/academic-batches', academicBatchRoutes);
router.use('/classes', classRoutes);
router.use('/courses', courseRoutes);
router.use('/students', studentRoutes);
router.use('/teachers', teacherRoutes);
router.use('/rooms', roomRoutes);
router.use('/campuses', campusRoutes);
router.use('/campus', campusRoutes);

// 3. Khảo thí: Ca thi, Ngân hàng đề thi, Làm bài thi & Nộp bài
const examRoutes = require('./exam.route');
router.use('/exam', examRoutes);

// 4. Chấm thi: Tự động chấm, Rà soát 1 lần, Duyệt điểm & Công bố đáp án
const gradingRoutes = require('./grading.route');
router.use('/grading', gradingRoutes);

// 5. Giám sát AI Realtime: Phòng 3D, Cảnh báo vi phạm, Nhận diện Giám thị
const proctorRoutes = require('./proctor.route');
router.use('/proctor', proctorRoutes);

// 6. Nhận diện Khuôn mặt (Face AI KYC Onboarding)
const faceRoutes = require('./face.route');
router.use('/face', faceRoutes);

// 7. Thống kê Dashboard Khảo thí & Nhật ký Audit Log
const dashboardRoutes = require('./dashboard.route');
const auditLogRoutes = require('./auditLog.route');
const postRoutes = require('./post.route');

router.use('/dashboard', dashboardRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/posts', postRoutes);

module.exports = router;

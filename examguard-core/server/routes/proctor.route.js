const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const proctorController = require('../controllers/proctor.controller');

// Realtime trạng thái phòng thi
router.get('/live/:sessionId', proctorController.getLiveRoomState);

// Kiểm tra frame webcam của thí sinh (AI phát hiện góc mặt, nhiều mặt, xác thực giám thị)
router.post('/inspect-frame', upload.single('frame'), proctorController.inspectCameraFrame);

// Quét & Xác thực khuôn mặt thí sinh trước khi vào phòng thi (Face Check-In Gate)
router.post('/verify-checkin', upload.single('frame'), proctorController.verifyCheckIn);

// Giám thị gửi popup cảnh báo
router.post('/send-warning', proctorController.sendWarning);

// Giám thị tạm dừng giám sát AI bàn thi (2 phút override)
router.post('/override', proctorController.setProctorOverride);

// Cộng bù giờ cho thí sinh
router.post('/extra-time', proctorController.addExtraTime);

// Hủy bỏ vi phạm bắt nhầm (khôi phục điểm uy tín)
router.post('/dismiss-violation', proctorController.dismissViolation);

// Đình chỉ thi thí sinh gian lận
router.post('/suspend', proctorController.suspendCandidate);

// Giám thị mở bàn đặc cách cho thí sinh đi muộn quá 15 phút
router.post('/unlock-late-student', proctorController.unlockLateStudent);

// Ghi nhận vi phạm chống gian lận trình duyệt (Tab switch, DevTools, Copy paste, v.v.)
router.post('/anti-cheat-event', proctorController.logAntiCheatEvent);

// Thống kê thời gian thực ca thi
router.get('/statistics/:sessionId', proctorController.getLiveStatistics);

// Dòng thời gian sự kiện & vi phạm
router.get('/timeline/:sessionId', proctorController.getTimeline);

module.exports = router;

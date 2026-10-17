const express = require('express');
const router = express.Router();
const multer = require('multer');
const faceController = require('../controllers/face.controller');

// Memory storage để xử lý nhanh không cần ghi file tạm khi detect pose
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
});

// Endpoint kiểm tra sức khoẻ dịch vụ Face AI
router.get('/health', faceController.getHealth);

// Endpoint kiểm tra trạng thái đã đăng ký khuôn mặt của người dùng
router.get('/registration-status', faceController.getRegistrationStatus);
router.get('/registration-status/:employeeId', faceController.getRegistrationStatus);

// Endpoint nhận diện tư thế đầu 3D & toạ độ khuôn mặt realtime
router.post('/detect-pose', upload.single('image'), faceController.detectPose);

// Endpoint đăng ký 5 góc khuôn mặt
router.post(
  '/enroll-multi-angle',
  upload.fields([
    { name: 'image_straight', maxCount: 1 },
    { name: 'image_left', maxCount: 1 },
    { name: 'image_right', maxCount: 1 },
    { name: 'image_up', maxCount: 1 },
    { name: 'image_down', maxCount: 1 },
    { name: 'image', maxCount: 1 },
    { name: 'straight', maxCount: 1 },
    { name: 'left', maxCount: 1 },
    { name: 'right', maxCount: 1 },
    { name: 'up', maxCount: 1 },
    { name: 'down', maxCount: 1 },
  ]),
  faceController.enrollMultiAngle
);

// Endpoint xác thực 1:1
router.post('/verify', upload.single('image'), faceController.verifyFace);

// Endpoint nhận diện 1:N
router.post('/recognize', upload.single('image'), faceController.recognizeFace);

// Endpoint xóa khuôn mặt
router.delete('/faces/:employeeId', faceController.deleteFace);

// Endpoint dọn sạch cache nhận diện khuôn mặt
router.post('/clear-cache', faceController.clearCache);

module.exports = router;

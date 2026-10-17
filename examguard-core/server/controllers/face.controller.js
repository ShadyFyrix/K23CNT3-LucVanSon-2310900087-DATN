const faceAiService = require('../services/faceAi.service');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const Student = require('../models/student.model');
const Teacher = require('../models/teacher.model');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

/**
 * Helper trích xuất User đối chiếu từ Request:
 * Ưu tiên: req.user (từ auth middleware) -> employee_id/userId (từ body/query) -> Token Authorization Bearer
 */
const getRequesterUser = async (req) => {
  if (req.user) return req.user;

  const rawEmpId = req.params?.employeeId || req.body?.employee_id || req.body?.userId || req.query?.employee_id;
  if (rawEmpId) {
    const isObjectId = String(rawEmpId).match(/^[0-9a-fA-F]{24}$/);
    const u = await User.findOne({
      $or: [{ _id: isObjectId ? rawEmpId : null }, { email: String(rawEmpId) }]
    }).populate('role').populate('roles');
    if (u) return u;
  }

  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    let decoded = null;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'examguard_default_secret');
    } catch (_) {
      try {
        decoded = jwt.decode(token);
      } catch (__) {}
    }

    const userId = decoded?.id || decoded?.userId || decoded?._id;
    if (userId) {
      const u = await User.findById(userId).populate('role').populate('roles');
      if (u) return u;
    }
    if (decoded?.email) {
      const u = await User.findOne({ email: decoded.email }).populate('role').populate('roles');
      if (u) return u;
    }
  }

  return null;
};

/**
 * Helper kiểm tra user đã đăng ký khuôn mặt hay chưa
 */
const checkUserHasFaceRegistered = (user) => {
  if (!user) return false;
  if (user.isFaceRegistered === true) return true;
  if (Array.isArray(user.faceAngles?.straight) && user.faceAngles.straight.length > 0) return true;
  if (Array.isArray(user.faceDescriptor) && user.faceDescriptor.length > 0) return true;
  if (user.facePhoto && typeof user.facePhoto === 'string' && user.facePhoto.trim().length > 0) return true;
  return false;
};

/**
 * GET /api/face/health
 * Kiểm tra kết nối tới Python Face AI microservice
 */
exports.getHealth = async (req, res) => {
  try {
    const health = await faceAiService.checkHealth();
    return res.json({ success: true, data: health });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/face/detect-pose
 * Nhận diện tư thế đầu 3D (Yaw/Pitch/Roll) & toạ độ khuôn mặt realtime từ webcam
 */
exports.detectPose = async (req, res) => {
  try {
    let imageBuffer = null;

    if (req.file && req.file.buffer) {
      imageBuffer = req.file.buffer;
    } else if (req.file && req.file.path) {
      imageBuffer = fs.readFileSync(req.file.path);
    } else if (req.body && req.body.image_base64) {
      let b64 = req.body.image_base64;
      if (b64.includes(',')) b64 = b64.split(',')[1];
      imageBuffer = Buffer.from(b64, 'base64');
    }

    if (!imageBuffer) {
      return res.status(400).json({
        face_detected: false,
        message: 'Không tìm thấy dữ liệu ảnh frame.',
      });
    }

    const result = await faceAiService.detectPose(imageBuffer, 'frame.jpg');
    return res.json(result);
  } catch (err) {
    console.error('detectPose error:', err.message);
    return res.status(500).json({
      face_detected: false,
      error: err.message,
    });
  }
};

/**
 * POST /api/face/enroll-multi-angle
 * Đăng ký 5 góc khuôn mặt (chính diện, trái, phải, ngước lên, cúi xuống)
 * Đồng bộ cả Face AI Vector DB và User trong MongoDB CRM
 */
exports.enrollMultiAngle = async (req, res) => {
  try {
    const employeeId = req.body.employee_id || req.body.userId;
    const fullName = req.body.full_name;
    const department = req.body.department;
    const checkQuality = req.body.check_quality === 'true'; // Mặc định không chặn chất lượng gắt gao với webcam laptop

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu mã nhân viên hoặc ID người dùng (employee_id).',
      });
    }

    // Thu thập buffer ảnh 5 góc từ req.files
    const images = {};
    const angles = ['straight', 'left', 'right', 'up', 'down'];

    if (req.files) {
      for (const ang of angles) {
        const fieldKey = `image_${ang}`;
        if (req.files[fieldKey] && req.files[fieldKey][0]) {
          const fileObj = req.files[fieldKey][0];
          images[ang] = fileObj.buffer || (fileObj.path ? fs.readFileSync(fileObj.path) : null);
        } else if (req.files[ang] && req.files[ang][0]) {
          const fileObj = req.files[ang][0];
          images[ang] = fileObj.buffer || (fileObj.path ? fs.readFileSync(fileObj.path) : null);
        }
      }
      // Hỗ trợ trường hợp gửi 1 ảnh duy nhất trong trường "image"
      if (!images.straight && req.files['image'] && req.files['image'][0]) {
        const f = req.files['image'][0];
        images.straight = f.buffer || (f.path ? fs.readFileSync(f.path) : null);
      }
    }

    // Hỗ trợ thêm trường hợp gửi ảnh base64 hoặc tên file đã có qua req.body
    for (const ang of angles) {
      if (!images[ang] && req.body && (req.body[`image_${ang}`] || req.body[ang])) {
        const val = req.body[`image_${ang}`] || req.body[ang];
        if (typeof val === 'string' && val.includes('base64,')) {
          images[ang] = Buffer.from(val.split('base64,')[1], 'base64');
        } else if (typeof val === 'string' && !val.startsWith('http')) {
          const uploadBaseDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'images');
          const cleanName = val.replace(/^\/uploads\//, '').replace(/^uploads\//, '');
          const localP = path.join(uploadBaseDir, cleanName);
          if (fs.existsSync(localP)) {
            images[ang] = fs.readFileSync(localP);
          }
        }
      }
    }

    // Gửi sang Python Face AI Microservice
    let aiResponse = { success: true };
    try {
      aiResponse = await faceAiService.enrollMultiAngle({
        images,
        employeeId,
        fullName,
        department,
        checkQuality,
      });
    } catch (aiErr) {
      console.warn('⚠️ Face AI microservice enrollment warning:', aiErr.message);
      // Vẫn tiếp tục lưu vào User MongoDB nếu AI service bận
    }

    // Cập nhật User trong CRM MongoDB
    let targetUser = null;
    if (employeeId.match(/^[0-9a-fA-F]{24}$/)) {
      targetUser = await User.findById(employeeId);
    }
    if (!targetUser) {
      targetUser = await User.findOne({ email: employeeId });
    }

    let updatedUser = targetUser;
    if (targetUser) {
      // Không lưu các tệp ảnh 5 góc ra ổ đĩa để giảm bớt dung lượng lưu trữ, chỉ lưu trữ vector
      const vectors = (aiResponse && aiResponse.embeddings) ? aiResponse.embeddings : {};
      const hasAnyVector = Object.values(vectors).some(v => Array.isArray(v) && v.length > 0);

      const updateFields = {
        faceAngles: {
          straight: Array.isArray(vectors.straight) ? vectors.straight : (Array.isArray(targetUser.faceAngles?.straight) ? targetUser.faceAngles.straight : []),
          left: Array.isArray(vectors.left) ? vectors.left : (Array.isArray(targetUser.faceAngles?.left) ? targetUser.faceAngles.left : []),
          right: Array.isArray(vectors.right) ? vectors.right : (Array.isArray(targetUser.faceAngles?.right) ? targetUser.faceAngles.right : []),
          up: Array.isArray(vectors.up) ? vectors.up : (Array.isArray(targetUser.faceAngles?.up) ? targetUser.faceAngles.up : []),
          down: Array.isArray(vectors.down) ? vectors.down : (Array.isArray(targetUser.faceAngles?.down) ? targetUser.faceAngles.down : []),
        }
      };

      if (hasAnyVector) {
        updateFields.isFaceRegistered = true;
        updateFields.faceRegisteredAt = new Date();
      }

      // Vector chính diện làm descriptor đại diện
      if (vectors.straight && Array.isArray(vectors.straight) && vectors.straight.length > 0) {
        updateFields.faceDescriptor = vectors.straight;
      }

      updatedUser = await User.findByIdAndUpdate(
        targetUser._id,
        { $set: updateFields },
        { returnDocument: 'after' }
      );
    }

    // Đồng bộ sang Student (nếu employeeId hoặc targetUser là sinh viên)
    try {
      const studentFilters = [];
      if (String(employeeId).match(/^[0-9a-fA-F]{24}$/)) {
        studentFilters.push({ _id: employeeId }, { userId: employeeId });
      }
      studentFilters.push({ studentCode: String(employeeId) }, { email: String(employeeId).toLowerCase() });
      if (targetUser) {
        studentFilters.push({ userId: targetUser._id }, { email: targetUser.email.toLowerCase() });
      }

      const vectors = (aiResponse && aiResponse.embeddings) ? aiResponse.embeddings : {};
      const straightVec = Array.isArray(vectors.straight) && vectors.straight.length > 0 ? vectors.straight : null;

      const targetStudent = await Student.findOne({ $or: studentFilters });
      if (targetStudent) {
        await Student.findByIdAndUpdate(targetStudent._id, {
          $set: {
            isFaceKyc: true,
            ...(straightVec ? { faceEmbedding: straightVec } : {}),
            faceUpdatedAt: new Date()
          }
        });
      }

      // Đồng bộ sang Teacher (nếu employeeId hoặc targetUser là giảng viên)
      const teacherFilters = [];
      if (String(employeeId).match(/^[0-9a-fA-F]{24}$/)) {
        teacherFilters.push({ _id: employeeId }, { userId: employeeId });
      }
      teacherFilters.push({ teacherCode: String(employeeId) }, { email: String(employeeId).toLowerCase() });
      if (targetUser) {
        teacherFilters.push({ userId: targetUser._id }, { email: targetUser.email.toLowerCase() });
      }

      const targetTeacher = await Teacher.findOne({ $or: teacherFilters });
      if (targetTeacher) {
        await Teacher.findByIdAndUpdate(targetTeacher._id, {
          $set: {
            isFaceKyc: true,
            ...(straightVec ? { faceEmbedding: straightVec } : {}),
            faceUpdatedAt: new Date()
          }
        });
      }
    } catch (syncErr) {
      console.warn('⚠️ Student/Teacher sync warning:', syncErr.message);
    }

    return res.json({
      success: true,
      message: 'Đăng ký khuôn mặt 5 góc thành công!',
      data: {
        aiResult: aiResponse,
        user: updatedUser ? {
          _id: updatedUser._id,
          fullName: updatedUser.fullName,
          isFaceRegistered: updatedUser.isFaceRegistered,
          facePhoto: updatedUser.facePhoto,
          faceAngles: updatedUser.faceAngles,
        } : null,
      },
    });
  } catch (err) {
    console.error('enrollMultiAngle error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/face/verify
 * Xác thực 1:1 khuôn mặt người dùng
 */
exports.verifyFace = async (req, res) => {
  try {
    const employeeId = req.body.employee_id || req.body.userId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Thiếu employee_id để đối chiếu' });
    }

    let imageBuffer = null;
    if (req.file && req.file.buffer) imageBuffer = req.file.buffer;
    else if (req.file && req.file.path) imageBuffer = fs.readFileSync(req.file.path);

    if (!imageBuffer) {
      return res.status(400).json({ success: false, message: 'Thiếu ảnh đối chiếu' });
    }

    const result = await faceAiService.verifyFace({
      imageBuffer,
      employeeId,
      threshold: req.query.threshold ? parseFloat(req.query.threshold) : 0.6,
      checkLiveness: req.query.check_liveness === 'true',
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/face/recognize
 * Nhận diện 1:N trong toàn bộ danh sách khuôn mặt
 */
exports.recognizeFace = async (req, res) => {
  try {
    let imageBuffer = null;
    if (req.file && req.file.buffer) imageBuffer = req.file.buffer;
    else if (req.file && req.file.path) imageBuffer = fs.readFileSync(req.file.path);

    if (!imageBuffer) {
      return res.status(400).json({ success: false, message: 'Thiếu ảnh để nhận diện' });
    }

    const result = await faceAiService.recognizeFace({
      imageBuffer,
      threshold: req.query.threshold ? parseFloat(req.query.threshold) : 0.58,
      checkLiveness: req.query.check_liveness === 'true',
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/face/faces/:employeeId
 * Xoá dữ liệu khuôn mặt theo ID
 */
exports.deleteFace = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const aiResult = await faceAiService.deleteFace(employeeId);
    return res.json({ success: true, data: aiResult });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/face/clear-cache
 * Dọn sạch cache và nạp lại chuẩn từ users MongoDB
 */
exports.clearCache = async (req, res) => {
  try {
    const aiResult = await faceAiService.clearAllFaces();
    const currentFaces = await faceAiService.listFaces();
    return res.json({
      success: true,
      message: 'Đã dọn sạch cache nhận diện khuôn mặt và đồng bộ lại danh sách nhân sự thực tế!',
      data: {
        aiResult,
        facesCount: currentFaces.length,
        faces: currentFaces.map(f => ({ employee_id: f.employee_id, full_name: f.full_name, registered_angles: f.registered_angles })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/face/registration-status
 * GET /api/face/registration-status/:employeeId
 * Kiểm tra tài khoản đã đăng ký khuôn mặt hay chưa
 */
exports.getRegistrationStatus = async (req, res) => {
  try {
    const user = await getRequesterUser(req);
    if (!user) {
      return res.status(404).json({
        success: false,
        isRegistered: false,
        message: 'Không tìm thấy tài khoản người dùng.'
      });
    }

    const isRegistered = checkUserHasFaceRegistered(user);
    return res.json({
      success: true,
      isRegistered,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        isFaceRegistered: isRegistered,
        faceRegisteredAt: user.faceRegisteredAt,
        facePhoto: user.facePhoto,
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};



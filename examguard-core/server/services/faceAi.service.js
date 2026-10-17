const crypto = require('crypto');

// Cấu hình URL endpoint Face AI Microservice (mặc định 127.0.0.1:8000 nội bộ)
const FACE_AI_URL = (process.env.FACE_AI_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

// Khóa bí mật nội bộ Node.js <-> Python Face AI
// Trên môi trường production, bắt buộc phải có INTERNAL_AI_SECRET trong .env
const INTERNAL_AI_SECRET = process.env.INTERNAL_AI_SECRET || (
  process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('❌ BẢO MẬT: Bắt buộc cấu hình biến INTERNAL_AI_SECRET trong file .env trên Production!'); })()
    : 'FaceAI_Internal_Microservice_Secret_Key_999'
);

/**
 * Tạo Header Canonical HMAC SHA-256 bảo mật kết nối nội bộ Node.js <-> Python Face AI.
 * Ràng buộc chặt chẽ với:
 * - HTTP Method (GET, POST, DELETE)
 * - URL Path (/health, /v1/face/detect-pose, ...)
 * - Timestamp (epoch seconds)
 * - Request ID duy nhất để truy vết (Traceability)
 * Ngăn chặn tuyệt đối tấn công Replay Attack và thay đổi Endpoint (Endpoint Tampering).
 * 
 * @param {string} method - HTTP method ('GET' | 'POST' | 'DELETE')
 * @param {string} path - URL path (ví dụ: '/health', '/v1/face/recognize')
 */
function getHmacHeaders(method = 'GET', path = '/') {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const requestId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : crypto.randomBytes(16).toString('hex');

  // Chuỗi quy chuẩn Canonical: METHOD:PATH:TIMESTAMP
  const canonicalPayload = `${method.toUpperCase()}:${path}:${timestamp}`;

  const signature = crypto
    .createHmac('sha256', INTERNAL_AI_SECRET)
    .update(canonicalPayload)
    .digest('hex');

  return {
    'x-internal-timestamp': timestamp,
    'x-internal-signature': signature,
    'x-internal-request-id': requestId,
  };
}

/**
 * Kiểm tra trạng thái hoạt động của Python Face AI Microservice
 */
async function checkHealth() {
  const path = '/health';
  try {
    const res = await fetch(`${FACE_AI_URL}${path}`, {
      method: 'GET',
      headers: { ...getHmacHeaders('GET', path) },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { healthy: false, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { healthy: true, ...data };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}

/**
 * Phát hiện tư thế (Pose 3D: yaw, pitch, roll), chất lượng & toạ độ khuôn mặt realtime
 * @param {Buffer} imageBuffer - Buffer ảnh frame
 * @param {string} filename - Tên file tạm
 */
async function detectPose(imageBuffer, filename = 'frame.jpg') {
  const path = '/v1/face/detect-pose';
  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), filename);

  const res = await fetch(`${FACE_AI_URL}${path}`, {
    method: 'POST',
    headers: { ...getHmacHeaders('POST', path) },
    body: formData,
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Face AI detect-pose failed: ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * Đăng ký 5 góc khuôn mặt vào Face AI Vector DB (Straight, Left, Right, Up, Down)
 */
async function enrollMultiAngle({
  images, // Object: { straight: Buffer, left: Buffer, right: Buffer, up: Buffer, down: Buffer }
  employeeId,
  fullName,
  department,
  checkQuality = true,
}) {
  const path = '/v1/face/enroll-multi-angle';
  const formData = new FormData();
  formData.append('employee_id', String(employeeId));
  if (fullName) formData.append('full_name', String(fullName));
  if (department) formData.append('department', String(department));

  const angles = ['straight', 'left', 'right', 'up', 'down'];
  for (const ang of angles) {
    if (images && images[ang]) {
      formData.append(
        `image_${ang}`,
        new Blob([images[ang]], { type: 'image/jpeg' }),
        `${ang}.jpg`
      );
    }
  }

  const url = `${FACE_AI_URL}${path}?check_quality=${checkQuality ? 'true' : 'false'}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...getHmacHeaders('POST', path) },
    body: formData,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Face AI enroll-multi-angle failed: ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * Xác thực khuôn mặt 1:1 theo Employee ID
 */
async function verifyFace({ imageBuffer, employeeId, threshold = 0.7, checkLiveness = false }) {
  const path = '/v1/face/verify';
  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), 'verify.jpg');
  formData.append('employee_id', String(employeeId));

  const url = `${FACE_AI_URL}${path}?threshold=${threshold}&check_liveness=${checkLiveness ? 'true' : 'false'}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...getHmacHeaders('POST', path) },
    body: formData,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Face AI verify failed: ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * Nhận diện khuôn mặt 1:N trong toàn bộ Vector DB
 */
async function recognizeFace({ imageBuffer, threshold = 0.58, checkLiveness = false, checkQuality = false }) {
  const path = '/v1/face/recognize';
  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), 'recognize.jpg');

  const url = `${FACE_AI_URL}${path}?threshold=${threshold}&check_liveness=${checkLiveness ? 'true' : 'false'}&check_quality=${checkQuality ? 'true' : 'false'}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...getHmacHeaders('POST', path) },
    body: formData,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Face AI recognize failed: ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * Xóa dữ liệu khuôn mặt theo Employee ID
 */
async function deleteFace(employeeId) {
  const path = `/v1/faces/${encodeURIComponent(employeeId)}`;
  try {
    const res = await fetch(`${FACE_AI_URL}${path}`, {
      method: 'DELETE',
      headers: { ...getHmacHeaders('DELETE', path) },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { success: false };
    return await res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Danh sách hồ sơ khuôn mặt đang lưu trong Face AI Vector DB
 */
async function listFaces() {
  const path = '/v1/faces/list';
  const res = await fetch(`${FACE_AI_URL}${path}`, {
    method: 'GET',
    headers: { ...getHmacHeaders('GET', path) },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Face AI list failed: ${res.status}`);
  return await res.json();
}

/**
 * Xóa sạch toàn bộ cache và reload từ ExamGuard DB
 */
async function clearAllFaces() {
  const path = '/v1/faces/clear-all';
  const res = await fetch(`${FACE_AI_URL}${path}?delete_images=false`, {
    method: 'DELETE',
    headers: { ...getHmacHeaders('DELETE', path) },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Face AI clear-all failed: ${res.status}`);
  return await res.json();
}

/**
 * Phân tích chuyên sâu frame phòng thi (Face count, Pose, Gian lận, Phone detection)
 */
async function inspectProctorFrame(imageBuffer, studentId = null, filename = 'frame.jpg') {
  const path = '/v1/proctor/inspect-frame';
  const formData = new FormData();
  formData.append('image', new Blob([imageBuffer], { type: 'image/jpeg' }), filename);
  if (studentId) {
    formData.append('student_id', studentId);
  }

  const res = await fetch(`${FACE_AI_URL}${path}`, {
    method: 'POST',
    headers: { ...getHmacHeaders('POST', path) },
    body: formData,
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Face AI inspect-frame failed: ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * Phân tích hàng loạt frames trong phòng thi (Batch)
 */
async function analyzeBatch(frames = []) {
  const path = '/v1/proctor/analyze-batch';
  const res = await fetch(`${FACE_AI_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHmacHeaders('POST', path)
    },
    body: JSON.stringify({ frames }),
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Face AI analyze-batch failed: ${res.status} ${errText}`);
  }

  return await res.json();
}

/**
 * Đánh giá vi phạm trình duyệt (Anti-Cheat Event)
 */
async function evaluateAntiCheat({ sessionId, studentId, eventType, details = {} }) {
  const path = '/v1/proctor/anti-cheat-event';
  const res = await fetch(`${FACE_AI_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getHmacHeaders('POST', path)
    },
    body: JSON.stringify({
      session_id: sessionId,
      student_id: studentId,
      event_type: eventType,
      details
    }),
    signal: AbortSignal.timeout(4000),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Face AI anti-cheat-event failed: ${res.status} ${errText}`);
  }

  return await res.json();
}

module.exports = {
  getHmacHeaders,
  checkHealth,
  detectPose,
  enrollMultiAngle,
  verifyFace,
  recognizeFace,
  deleteFace,
  listFaces,
  clearAllFaces,
  inspectProctorFrame,
  analyzeBatch,
  evaluateAntiCheat,
};

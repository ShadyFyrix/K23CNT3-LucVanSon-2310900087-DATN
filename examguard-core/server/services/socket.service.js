const { Server } = require('socket.io');

let io = null;

/**
 * Socket.IO Manager for ExamGuard AI Realtime Proctoring
 */
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    maxHttpBufferSize: 5e6 // 5MB for frame transmissions if needed
  });

  io.on('connection', (socket) => {
    // 1. Thí sinh hoặc Giám thị tham gia vào phòng thi (room)
    socket.on('join_session', ({ sessionId, role, studentId, candidateCode }) => {
      if (!sessionId) return;
      const room = `session_${sessionId}`;
      socket.join(room);
      socket.sessionId = sessionId;
      socket.userRole = role;
      socket.studentId = studentId;

      console.log(`🔌 [Socket.IO] ${role || 'User'} ${candidateCode || socket.id} joined ${room}`);

      // Thông báo cho Giám thị trong phòng biết có thí sinh vừa online
      if (role === 'student') {
        io.to(room).emit('student:online', {
          studentId,
          candidateCode,
          socketId: socket.id,
          timestamp: new Date()
        });
      }
    });

    // 2. Thí sinh gửi heartbeat / ping giữ kết nối
    socket.on('student:heartbeat', ({ sessionId, studentId, candidateCode, currentQuestion, trustScore }) => {
      if (!sessionId) return;
      io.to(`session_${sessionId}`).emit('proctor:student_heartbeat', {
        studentId,
        candidateCode,
        currentQuestion,
        trustScore,
        lastActive: new Date()
      });
    });

    // 3. Giám thị gửi cảnh báo trực tiếp đến thí sinh
    socket.on('proctor:send_warning', ({ sessionId, studentId, message, penalty }) => {
      if (!sessionId) return;
      io.to(`session_${sessionId}`).emit(`student:warning:${studentId}`, {
        message: message || 'Yêu cầu tập trung làm bài, nhìn thẳng vào màn hình!',
        penalty: penalty || 5,
        timestamp: new Date()
      });
    });

    // 4. Ngắt kết nối
    socket.on('disconnect', () => {
      if (socket.sessionId && socket.studentId) {
        io.to(`session_${socket.sessionId}`).emit('student:offline', {
          studentId: socket.studentId,
          timestamp: new Date()
        });
      }
    });
  });

  console.log('✅ [Socket.IO] Realtime Proctoring Server initialized');
  return io;
}

function getIO() {
  return io;
}

/**
 * Phát tín hiệu vi phạm ngay lập tức đến toàn bộ Giám thị trong phòng thi
 */
function emitViolation(sessionId, violationData) {
  if (!io || !sessionId) return;
  io.to(`session_${sessionId}`).emit('proctor:violation', violationData);
}

/**
 * Phát tín hiệu cập nhật điểm uy tín hoặc trạng thái thí sinh
 */
function emitStudentUpdate(sessionId, studentData) {
  if (!io || !sessionId) return;
  io.to(`session_${sessionId}`).emit('proctor:student_update', studentData);
}

/**
 * Phát cảnh báo đích danh tới thí sinh qua Socket.IO
 */
function emitDirectWarning(sessionId, studentId, warningData) {
  if (!io || !sessionId) return;
  io.to(`session_${sessionId}`).emit(`student:warning:${studentId}`, warningData);
}

/**
 * Phát thông báo toàn phòng thi
 */
function emitRoomBroadcast(sessionId, event, data) {
  if (!io || !sessionId) return;
  io.to(`session_${sessionId}`).emit(event, data);
}

module.exports = {
  initSocket,
  getIO,
  emitViolation,
  emitStudentUpdate,
  emitDirectWarning,
  emitRoomBroadcast
};

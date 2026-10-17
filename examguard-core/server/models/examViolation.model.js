const mongoose = require('mongoose');

const ExamViolationSchema = new mongoose.Schema({
  session: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ExamSession', 
    required: true 
  },
  examStudent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ExamStudent', 
    required: true 
  },
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student' 
  },
  type: { 
    type: String, 
    enum: [
      'LOOK_AWAY',          // Quay mặt ra ngoài quá 5s (-5đ)
      'MULTIPLE_FACES',     // Phát hiện 2 khuôn mặt trong khung hình (-15đ)
      'NO_FACE',            // Rời khỏi khung hình quá 10s (-10đ)
      'PHONE_DETECTED',     // Phát hiện điện thoại (-20đ)
      'SUSPICIOUS_OBJECT',  // Tài liệu / vật dụng khả nghi (-10đ)
      'PROCTOR_INSPECTION', // Cán bộ coi thi đi ngang kiểm tra bàn (0đ - Không trừ điểm)
      'SEB_INTEGRITY_BREACH',// Vi phạm phần mềm khóa màn hình (-30đ)
      'MANUAL_WARNING'      // Cảnh báo thủ công từ giám thị (-5đ)
    ],
    required: true 
  },
  penalty: { 
    type: Number, 
    default: 0 // Số điểm bị trừ (0 nếu là PROCTOR_INSPECTION)
  },
  snapshotUrl: { 
    type: String, 
    default: '' // Ảnh snapshot bằng chứng lúc xảy ra sự kiện
  },
  isProctorPresence: { 
    type: Boolean, 
    default: false // Đánh dấu sự kiện do cán bộ coi thi xuất hiện trong camera
  },
  proctorName: { 
    type: String, 
    default: '' // Tên Giám thị / Thanh tra nếu AI nhận diện được khuôn mặt
  },
  isDismissed: { 
    type: Boolean, 
    default: false // Giám thị bấm "Bỏ qua / Huỷ phạt" nếu nhận nhầm
  },
  dismissReason: { 
    type: String, 
    default: '' 
  },
  metadata: { 
    type: mongoose.Schema.Types.Mixed, 
    default: {} // yaw, pitch, roll, similarity, bbox
  }
}, { timestamps: true });

module.exports = mongoose.model('ExamViolation', ExamViolationSchema);

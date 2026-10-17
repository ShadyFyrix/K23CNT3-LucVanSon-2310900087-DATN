const mongoose = require('mongoose');

const ExamStudentSchema = new mongoose.Schema({
  session: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ExamSession', 
    required: true 
  },
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: true 
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  candidateCode: { 
    type: String, 
    required: true, 
    trim: true // Số báo danh (SBD): '20261015-001'
  },
  blindCode: { 
    type: String, 
    required: true, 
    trim: true // Mã phách ẩn danh: 'PHACH_9A2F81'
  },
  seatRow: { 
    type: Number, 
    required: true // Dãy 1..N
  },
  seatCol: { 
    type: Number, 
    required: true // Cột 1..M
  },
  seatPin: { 
    type: String, 
    required: true // Mã PIN bàn thi: '4821'
  },
  status: { 
    type: String, 
    enum: ['ASSIGNED', 'CHECKED_IN', 'IN_EXAM', 'SUBMITTED', 'SUSPENDED', 'ABSENT'], 
    default: 'ASSIGNED' 
  },
  checkinAt: { type: Date },
  checkinFaceSimilarity: { type: Number },
  checkinPhoto: { type: String },
  
  trustScore: { 
    type: Number, 
    default: 100, 
    min: 0, 
    max: 100 // Điểm uy tín thời gian thực
  },
  startedAt: { type: Date },
  submittedAt: { type: Date },
  
  // Điểm số theo các giai đoạn rà soát và công bố
  autoGradeScore: { type: Number, default: null }, // Điểm máy tự chấm
  adjustedScore: { type: Number, default: null },  // Điểm GV điều chỉnh rà soát
  officialScore: { type: Number, default: null },  // Điểm chính thức công bố
  grader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gradingNotes: { type: String, default: '' },
  
  extraTimeMinutes: { type: Number, default: 0 },
  proctorOverrideUntil: { type: Date, default: null }, // Khi giám thị kiểm tra trực tiếp
  shuffleMapping: { type: Map, of: Array, default: {} } // Lưu thứ tự đảo câu/đáp án
}, { timestamps: true });

// Index đảm bảo mỗi sinh viên chỉ có 1 chỗ ngồi trong 1 ca thi
ExamStudentSchema.index({ session: 1, student: 1 }, { unique: true });
ExamStudentSchema.index({ session: 1, seatRow: 1, seatCol: 1 }, { unique: true });

module.exports = mongoose.model('ExamStudent', ExamStudentSchema);

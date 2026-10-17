const mongoose = require('mongoose');

const TeacherSchema = new mongoose.Schema({
  teacherCode: { 
    type: String, 
    required: true,
    unique: true,
    trim: true // VD: 'GV_CNTT_001'
  },
  fullName: {
    type: String,
    required: true,
    trim: true // VD: 'ThS. Nguyễn Văn A'
  },
  avatar: {
    type: String,
    default: ''
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'M', 'F', 'OTHER'],
    default: 'male'
  },
  birthday: Date,
  phone: {
    type: String,
    default: '',
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  // --- PHÂN CẤP TỔ CHỨC & CHUYÊN MÔN ---
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department' // Khoa Công nghệ Thông tin
  },
  specialization: [{
    type: String,
    trim: true
  }],
  degree: {
    type: String,
    default: 'Thạc sĩ'
  },
  
  // --- LIÊN KẾT TÀI KHOẢN HỆ THỐNG ---
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },

  // --- DỮ LIỆU NHẬN DIỆN KHUÔN MẶT CÁN BỘ COI THI (PROCTOR KYC) ---
  faceEmbedding: [{
    type: Number // Vector 512 chiều trích xuất từ ArcFace
  }],
  isFaceKyc: {
    type: Boolean,
    default: false
  },
  faceUpdatedAt: {
    type: Date
  },

  status: {
    type: String,
    enum: ['active', 'inactive', 'on_leave'],
    default: 'active'
  }
}, { timestamps: true });

TeacherSchema.index({ fullName: 'text', teacherCode: 1, email: 1, isFaceKyc: 1 });

module.exports = mongoose.model('Teacher', TeacherSchema);
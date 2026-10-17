const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  studentCode: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true // VD: '2310900087'
  },
  fullName: { 
    type: String, 
    required: true, 
    trim: true // VD: 'Lục Văn Sơn'
  },
  avatar: { 
    type: String, 
    default: '' 
  },
  gender: { 
    type: String, 
    enum: ['M', 'F', 'OTHER', 'male', 'female', 'other'],
    default: 'M'
  },
  birthday: { 
    type: Date 
  },
  email: { 
    type: String, 
    required: true,
    unique: true,
    lowercase: true, 
    trim: true 
  },
  phone: { 
    type: String, 
    default: '', 
    trim: true 
  },

  // --- PHÂN CẤP TỔ CHỨC ĐÀO TẠO ---
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department' // Khoa CNTT
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicBatch' // Khóa 23
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class' // Lớp K23CNT3
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // --- DỮ LIỆU NHẬN DIỆN KHUÔN MẶT (FACE AI KYC) ---
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
    enum: ['active', 'graduated', 'suspended'],
    default: 'active'
  },
  note: { type: String, default: '' }
}, { timestamps: true });

StudentSchema.index({ studentCode: 1, email: 1, class: 1, isFaceKyc: 1 });

module.exports = mongoose.model('Student', StudentSchema);
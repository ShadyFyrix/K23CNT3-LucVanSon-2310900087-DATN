const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true // VD: 'K23CNT3'
  },
  name: {
    type: String,
    required: true,
    trim: true // VD: 'Lớp Công nghệ Thông tin 3 - Khóa 23'
  },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicBatch' // Khóa học trực thuộc (VD: K23)
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department' // Khoa chuyên môn (VD: CNTT)
  },
  advisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher' // Giảng viên cố vấn học tập
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  students: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  }],
  status: {
    type: String,
    enum: ['Open', 'Running', 'Closed'],
    default: 'Running'
  }
}, { timestamps: true });

ClassSchema.index({ code: 1, department: 1, batch: 1 });

module.exports = mongoose.model('Class', ClassSchema);
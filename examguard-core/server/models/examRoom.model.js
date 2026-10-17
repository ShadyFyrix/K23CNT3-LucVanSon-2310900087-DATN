const mongoose = require('mongoose');

const ExamRoomSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true // VD: 'P302', 'LAB01'
  },
  name: { 
    type: String, 
    required: true, 
    trim: true // VD: 'Phòng Lab Máy tính P302'
  },
  roomType: { 
    type: String, 
    enum: ['LAB_PC', 'BYOD_LAPTOP', 'ONLINE_QUIZ'], 
    default: 'ONLINE_QUIZ' 
  },
  rows: { 
    type: Number, 
    required: true, 
    default: 5 // Số dãy bàn
  },
  cols: { 
    type: Number, 
    required: true, 
    default: 8 // Số cột bàn
  },
  capacity: { 
    type: Number, 
    default: 40 // Tự tính = rows * cols
  },
  allowedIpSubnet: { 
    type: String, 
    default: '' // VD: '192.168.30.0/24'
  },
  rtspCameraUrl: { 
    type: String, 
    default: '' // VD: 'rtsp://admin:pass@192.168.30.10:554/stream1'
  },
  polygonRoi: { 
    type: Array, 
    default: [] // Toạ độ polygon các bàn để CCTV AI nhận diện vị trí
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { timestamps: true });

// Tự động tính capacity trước khi lưu
ExamRoomSchema.pre('save', function() {
  if (this.rows && this.cols) {
    this.capacity = this.rows * this.cols;
  }
});

module.exports = mongoose.model('ExamRoom', ExamRoomSchema);

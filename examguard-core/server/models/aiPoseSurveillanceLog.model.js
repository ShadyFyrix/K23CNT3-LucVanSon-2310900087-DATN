// ==============================================================================
// EXAMGUARD AI - AI POSE SURVEILLANCE LOG MODEL (MONGODB)
// ĐỒ ÁN TỐT NGHIỆP: Sinh viên Lục Văn Sơn - MSV: 2310900087 - Lớp: K23CNT3
// Tuân thủ Section 26.5 của SYSTEM_BLUEPRINT.md
// ==============================================================================

const mongoose = require('mongoose');

const AiPoseSurveillanceLogSchema = new mongoose.Schema({
  sessionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ExamSession', 
    index: true 
  },
  examStudentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ExamStudent', 
    index: true 
  },
  roomId: { 
    type: String, 
    index: true 
  },
  source: { 
    type: String, 
    enum: ['CANDIDATE_WEBCAM', 'CCTV_SURVEILLANCE'], 
    required: true 
  },
  postureState: { 
    type: String, 
    enum: ['NORMAL_SITTING', 'STANDING', 'ABSENT', 'COLLAPSE', 'IRREGULAR_POSTURE'],
    required: true 
  },
  isImmobile: { 
    type: Boolean, 
    default: false 
  },
  immobileDurationSec: { 
    type: Number, 
    default: 0 
  },
  motionEnergy: { 
    type: Number, 
    default: 0 
  },
  confidence: { 
    type: Number, 
    default: 0 
  },
  angles: {
    torsoTilt: { type: Number },
    hipAngle: { type: Number },
    kneeAngle: { type: Number }
  },
  engine: { 
    type: String 
  },
  inferenceMs: { 
    type: Number 
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    index: { expires: '90d' } // Tự động dọn dẹp sau 90 ngày (TTL index)
  }
}, { 
  timestamps: true,
  collection: 'ai_pose_surveillance_logs'
});

module.exports = mongoose.model('AiPoseSurveillanceLog', AiPoseSurveillanceLogSchema);

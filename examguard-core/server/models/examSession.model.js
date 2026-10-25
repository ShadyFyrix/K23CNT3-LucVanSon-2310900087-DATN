const mongoose = require('mongoose');

const ExamSessionSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true // VD: 'CA-20261015-01'
  },
  title: { 
    type: String, 
    required: true, 
    trim: true // VD: 'Thi kết thúc học phần: Kỹ thuật lập trình - Ca 1'
  },
  subject: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course',
    required: true 
  },
  examPaper: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ExamPaper',
    required: true 
  },
  room: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ExamRoom',
    required: false // Không bắt buộc với các phòng Quiz trực tuyến
  },
  startTime: { 
    type: Date, 
    required: true 
  },
  endTime: { 
    type: Date, 
    required: true 
  },
  durationMinutes: { 
    type: Number, 
    required: true, 
    default: 60 
  },
  examType: { 
    type: String, 
    enum: ['LAB_PC', 'BYOD_LAPTOP', 'ONLINE_QUIZ'], 
    default: 'ONLINE_QUIZ' 
  },
  status: { 
    type: String, 
    enum: ['SCHEDULED', 'CHECKING_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], 
    default: 'SCHEDULED' 
  },
  gradingStatus: { 
    type: String, 
    enum: ['NOT_GRADED', 'AUTO_GRADED', 'REVIEWING', 'APPROVED', 'PUBLISHED'], 
    default: 'NOT_GRADED' 
  },
  proctor1: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' // Cán bộ coi thi 1
  },
  proctor2: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' // Cán bộ coi thi 2
  },
  inspector: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' // Cán bộ thanh tra
  },
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  approvedAt: { 
    type: Date 
  },
  publishedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  publishedAt: { 
    type: Date 
  },
  appealDeadline: { 
    type: Date // Hạn chót nộp đơn phúc khảo
  },
  reviewNotes: { 
    type: String, 
    default: '' // Ghi chú rà soát của giảng viên chấm thi
  },
  
  // ── ĐẤU TRƯỜNG QUIZ GAMIFICATION (ARENA MODE) ──
  isGamifiedQuiz: { 
    type: Boolean, 
    default: false 
  },
  quizPin: { 
    type: String, 
    trim: true, 
    default: null // Mã PIN phòng đấu 6 số (VD: '839201')
  },
  currentQuestionIndex: { 
    type: Number, 
    default: 0 // Câu hỏi đang được trình chiếu
  },
  arenaStatus: { 
    type: String, 
    enum: ['LOBBY', 'QUESTION_ACTIVE', 'QUESTION_REVEALED', 'FINISHED'], 
    default: 'LOBBY' 
  },
  gameRules: {
    scoringType: { 
      type: String, 
      enum: ['CLASSIC', 'SPEED_BONUS', 'STREAK_MULTIPLIER'], 
      default: 'SPEED_BONUS' 
    },
    timerType: { 
      type: String, 
      enum: ['PER_EXAM_TIMER', 'PER_QUESTION_TIMER'], 
      default: 'PER_QUESTION_TIMER' 
    },
    secondsPerQuestion: { 
      type: Number, 
      default: 30 
    },
    enableHearts: { 
      type: Boolean, 
      default: true 
    },
    maxHearts: { 
      type: Number, 
      default: 3 
    },
    enablePowerUps: { 
      type: Boolean, 
      default: true 
    },
    feedbackTiming: { 
      type: String, 
      enum: ['INSTANT_REVEAL', 'POST_EXAM_REVEAL'], 
      default: 'INSTANT_REVEAL' 
    },
    showLeaderboard: { 
      type: Boolean, 
      default: true 
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('ExamSession', ExamSessionSchema);

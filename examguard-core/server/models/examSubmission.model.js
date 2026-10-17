const mongoose = require('mongoose');

const ExamSubmissionSchema = new mongoose.Schema({
  examStudent: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'ExamStudent', 
    required: true, 
    unique: true 
  },
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
  submittedAt: { 
    type: Date, 
    default: Date.now 
  },
  answers: { 
    type: Map, 
    of: mongoose.Schema.Types.Mixed, 
    default: {} // Key: question index hoặc id, Value: đáp án chọn/text/code
  },
  autoGradeTotal: { 
    type: Number, 
    default: 0 
  },
  totalCorrect: { 
    type: Number, 
    default: 0 
  },
  totalWrong: { 
    type: Number, 
    default: 0 
  },
  totalSkipped: { 
    type: Number, 
    default: 0 
  },
  questionResults: [{
    stt: Number,
    questionId: String,
    type: { type: String, enum: ['MULTIPLE_CHOICE', 'ESSAY', 'CODING_PROBLEM'] },
    studentAnswer: mongoose.Schema.Types.Mixed,
    correctAnswer: mongoose.Schema.Types.Mixed,
    isCorrect: Boolean,
    scoreEarned: Number,
    maxScore: Number,
    explanation: String,
    essayFeedback: String
  }]
}, { timestamps: true });

module.exports = mongoose.model('ExamSubmission', ExamSubmissionSchema);

const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  stt: { type: Number, required: true },
  type: { 
    type: String, 
    enum: ['MULTIPLE_CHOICE', 'ESSAY', 'CODING_PROBLEM'], 
    default: 'MULTIPLE_CHOICE' 
  },
  content: { type: String, required: true },
  image: { type: String, default: null },
  score: { type: Number, required: true, default: 0.5 },
  
  // Dành riêng cho MULTIPLE_CHOICE
  options: [{ type: String }], // Danh sách phương án ["A...", "B...", "C...", "D..."]
  correctAnswer: { 
    type: mongoose.Schema.Types.Mixed, 
    default: null // Số index (0, 1, 2, 3) hoặc mảng [1, 2] nếu chọn nhiều đáp án
  },
  explanation: { 
    type: String, 
    default: '' // Lời giải thích chi tiết vì sao đáp án đúng (công bố cho SV sau duyệt)
  },

  // Dành riêng cho ESSAY
  gradingGuide: { type: String, default: '' },
  suggestedKeywords: [{ type: String }],
  minWords: { type: Number, default: 0 },

  // Dành riêng cho CODING_PROBLEM
  languages: [{ type: String }], // ['c', 'cpp', 'python', 'java']
  testCases: [{
    input: { type: String, default: '' },
    expectedOutput: { type: String, default: '' },
    isHidden: { type: Boolean, default: false },
    timeoutMs: { type: Number, default: 1000 }
  }],
  templateCode: { type: Map, of: String } // { "c": "...", "python": "..." }
}, { _id: true });

const ExamPaperSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true // VD: 'DE-C-2026-01'
  },
  title: { 
    type: String, 
    required: true, 
    trim: true // VD: 'Kiểm tra Kỹ thuật Lập trình - HK1 2026-2027'
  },
  subject: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course',
    required: true 
  },
  subjectName: { type: String, default: '' },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  durationMinutes: { 
    type: Number, 
    required: true, 
    default: 60 
  },
  totalScore: { 
    type: Number, 
    default: 10.0 
  },
  shuffleQuestions: { 
    type: Boolean, 
    default: true 
  },
  shuffleOptions: { 
    type: Boolean, 
    default: true 
  },
  // Cấu hình đề thi dạng File đính kèm (PDF / Word / Image)
  paperType: { 
    type: String, 
    enum: ['STRUCTURED_QUIZ', 'FILE_ATTACHED'], 
    default: 'STRUCTURED_QUIZ' 
  },
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileSize: { type: Number, default: 0 },
  totalQuestions: { type: Number, default: 0 },
  submissionMode: { 
    type: String, 
    enum: ['OMR_BUBBLE_SHEET', 'ESSAY_TEXT', 'FILE_UPLOAD', 'HYBRID'], 
    default: 'OMR_BUBBLE_SHEET' 
  },
  answerKeyString: { type: String, default: '' }, // Ví dụ: "1:A, 2:B, 3:C, 4:D..."

  questions: [QuestionSchema],
  status: { 
    type: String, 
    enum: ['DRAFT', 'APPROVED', 'ACTIVE'], 
    default: 'DRAFT' 
  },
  adjustedQuestions: [{ // Lưu lịch sử can thiệp sửa đáp án sau khi thi
    questionIndex: Number,
    action: { type: String, enum: ['ADD_VALID_ANSWER', 'REPLACE_ANSWER', 'CANCEL_QUESTION'] },
    acceptedAnswers: [mongoose.Schema.Types.Mixed],
    reason: String,
    adjustedAt: { type: Date, default: Date.now },
    adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('ExamPaper', ExamPaperSchema);

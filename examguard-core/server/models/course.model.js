const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  courseCode: { 
    type: String, 
    unique: true, 
    required: true, 
    uppercase: true, 
    trim: true // VD: 'KTLT', 'CSDL', 'CTDL_GT'
  },
  name: { 
    type: String, 
    required: true, 
    trim: true // VD: 'Kỹ thuật lập trình'
  },
  credits: { 
    type: Number, 
    default: 3 // Số tín chỉ học phần
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department' 
  },
  description: { 
    type: String, 
    default: '' 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  }
}, { timestamps: true });

CourseSchema.index({ courseCode: 1, name: 1 });

module.exports = mongoose.model('Course', CourseSchema);
const mongoose = require('mongoose');

const AcademicBatchSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true // VD: 'K23', 'K22'
  },
  name: { 
    type: String, 
    required: true, 
    trim: true // VD: 'Khóa 2023 - 2027'
  },
  startYear: { 
    type: Number, 
    required: true // VD: 2023
  },
  endYear: { 
    type: Number, 
    required: true // VD: 2027
  },
  department: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Department' 
  },
  status: { 
    type: String, 
    enum: ['active', 'graduated', 'inactive'], 
    default: 'active' 
  }
}, { timestamps: true });

module.exports = mongoose.model('AcademicBatch', AcademicBatchSchema);

const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  description: { 
    type: String, 
    default: '' 
  },
  // Danh sách các permission key (vd: ['exams.view', 'proctor.live'])
  // Nếu có 'all' thì coi như Admin
  permissions: [{ 
    type: String 
  }],
  // Đánh dấu vai trò hệ thống không được xóa (Admin)
  isSystem: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

module.exports = mongoose.model('Role', RoleSchema);
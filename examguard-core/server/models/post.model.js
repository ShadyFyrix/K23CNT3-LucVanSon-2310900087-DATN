const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['announcement', 'event', 'policy', 'recognition', 'general'], 
    default: 'announcement' 
  },
  isPinned: { type: Boolean, default: false },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Target Audience (Chỉ định đối tượng xem tin)
  targetType: { 
    type: String, 
    enum: ['all', 'department', 'roles', 'users'], 
    default: 'all' 
  },
  targetDepartments: [{ type: String }], // 'sales', 'training', 'accounting', etc.
  targetRoles: [{ type: String }], // 'teacher', 'receptionist', 'admin', etc.
  targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  attachments: [{ type: String }], // URLs / Paths
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [CommentSchema]
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);

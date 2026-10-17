const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  // Người thực hiện thao tác
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userName: { type: String, default: 'Hệ thống' },
  userRole: { type: String, default: '' },

  // Loại hành động
  // ATTENDANCE: điểm danh (có mặt/vắng/đi muộn)
  // NOTE: cập nhật nhận xét teacherComment
  // FEEDBACK_360: cập nhật điểm đánh giá 360 độ
  // YOUTUBE: thêm/sửa/xóa link YouTube
  // IMAGE: thêm/xóa ảnh học viên
  // UPDATE_FEEDBACK: (legacy - giữ để tương thích với dữ liệu cũ)
  action: {
    type: String,
    enum: ['ATTENDANCE', 'NOTE', 'FEEDBACK_360', 'YOUTUBE', 'IMAGE', 'UPDATE_FEEDBACK'],
    required: true
  },

  // Trạng thái trước/sau khi thay đổi
  diff: {
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after:  { type: mongoose.Schema.Types.Mixed, default: null }
  },

  // Thông tin học viên bị tác động
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null
  },
  studentName: { type: String, default: '' },

  // Thông tin lớp học
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    default: null
  },
  className: { type: String, default: '' },

  // Ngày buổi học
  sessionDate: { type: Date, default: null },

  // Mô tả chi tiết thao tác (tóm tắt ngắn gọn)
  details: { type: String, default: '' }

}, { timestamps: true });

// Index để query nhanh theo thời gian tạo (sort mới nhất trước)
AuditLogSchema.index({ createdAt: -1 });
// Index để filter theo action
AuditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);

/**
 * TokenBlacklist - Danh sách token bị thu hồi / Force Logout
 * Khi admin force logout 1 user, token của họ được thêm vào blacklist.
 * Middleware sẽ kiểm tra blacklist trước khi xác thực mọi request.
 */
const mongoose = require('mongoose');

const TokenBlacklistSchema = new mongoose.Schema({
  // User bị force logout
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  userEmail: { type: String, index: true },

  // Loại: 'ALL_TOKENS' (logout toàn bộ session) | 'SPECIFIC_TOKEN' (1 token cụ thể)
  type: {
    type: String,
    enum: ['ALL_TOKENS', 'SPECIFIC_TOKEN'],
    default: 'ALL_TOKENS'
  },

  // Nếu type = SPECIFIC_TOKEN, lưu jti hoặc sub của token
  token: { type: String },

  // Thời điểm force logout - token được issue TRƯỚC thời điểm này đều bị huỷ
  invalidatedBefore: {
    type: Date,
    default: Date.now
  },

  // Admin thực hiện force logout
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revokedByEmail: { type: String },
  reason: { type: String, default: 'Force logout by admin' }

}, { timestamps: true });

// TTL index: tự xóa sau 8 ngày (sau khi refresh token hết hạn)
TokenBlacklistSchema.index({ createdAt: 1 }, { expireAfterSeconds: 8 * 24 * 60 * 60 });

module.exports = mongoose.model('TokenBlacklist', TokenBlacklistSchema);

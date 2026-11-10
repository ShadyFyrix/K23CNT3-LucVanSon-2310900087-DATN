/**
 * =========================================================================
 * USER DATA TRANSFER OBJECT (DTO LAYER)
 * Bảo vệ an toàn thông tin định danh: Loại trừ triệt để mật khẩu,
 * khóa mã hóa và vector sinh trắc học thô trước khi gửi qua API.
 * =========================================================================
 */

/**
 * Loại bỏ mật khẩu và các thông tin nhạy cảm của người dùng
 * @param {Object} user 
 * @returns {Object} Safe User DTO
 */
function toUserResponseDTO(user) {
  if (!user) return null;
  const u = typeof user.toObject === 'function' ? user.toObject() : { ...user };

  const {
    password,
    passwordHash,
    salt,
    refreshToken,
    faceEmbedding,
    biometricVector,
    twoFactorSecret,
    ...safeUser
  } = u;

  return safeUser;
}

module.exports = {
  toUserResponseDTO
};

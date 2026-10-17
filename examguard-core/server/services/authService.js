

const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const loginUser = async (email, password) => {
  // 1. Tìm user và lôi thông tin Role + Roles + Permissions đi kèm
  const user = await User.findOne({ email }).populate('role').populate('roles');

  if (!user) {
    throw new Error("Sai email hoặc mật khẩu");
  }

  // 2. Kiểm tra password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Sai email hoặc mật khẩu");
  }

  // 3. Tổng hợp danh sách quyền và tên tất cả vai trò được gán
  const permSet = new Set();
  const roleNames = [];

  if (user.role) {
    if (user.role.name) roleNames.push(user.role.name);
    if (user.role.permissions && Array.isArray(user.role.permissions)) {
      user.role.permissions.forEach(p => permSet.add(p));
    }
  }

  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach(r => {
      if (r.name && !roleNames.includes(r.name)) {
        roleNames.push(r.name);
      }
      if (r.permissions && Array.isArray(r.permissions)) {
        r.permissions.forEach(p => permSet.add(p));
      }
    });
  }

  const permissions = Array.from(permSet);
  const primaryRoleName = roleNames.length > 0 ? roleNames[0] : 'No Role';

  const accessToken = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: primaryRoleName,
      roles: roleNames,
      permissions: permissions
    },
    process.env.JWT_SECRET || "examguard_default_secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.JWT_REFRESH_SECRET || "examguard_default_refresh_secret",
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" }
  );

  const userObj = user.toObject();
  delete userObj.password;

  return {
    user: {
      ...userObj,
      role: user.role || { name: primaryRoleName },
      roles: user.roles && user.roles.length > 0 ? user.roles : [user.role].filter(Boolean),
      roleNames,
      permissions
    },
    accessToken,
    refreshToken
  };
};


const registerUser = async (userData) => {

  const { email, password, fullName } = userData;

  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new Error('Email này đã được sử dụng');
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const Role = require('../models/role.model');
  const defaultRole = await Role.findOne({ name: { $in: ['user', 'student', 'staff'] } });

  const newUser = new User({
    email,
    password: hashedPassword,
    fullName,
    ...(defaultRole ? { role: defaultRole._id, roles: [defaultRole._id] } : {})
  });

  const savedUser = await newUser.save();

  return {
    _id: savedUser._id,
    email: savedUser.email,
    fullName: savedUser.fullName,
    role: savedUser.role
  };

};

// Cập nhật luôn hàm getUserById để luôn lấy kèm quyền
const getUserById = async (userId) => {
  const user = await User.findById(userId)
    .select('-password')
    .populate('role');

  if (!user) {
    throw new Error('User không tồn tại');
  }

  return {
    ...user._doc,
    role: user.role ? user.role.name : null,
    permissions: user.role ? user.role.permissions : []
  };
};




/**
 * Lấy Access Token mới từ Refresh Token
 */
const refreshToken = async (token) => {
  try {
    // 1. Verify Refresh Token
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || "examguard_default_refresh_secret");

    // 2. Tìm User và lấy kèm thông tin Role/Permissions
    const user = await User.findById(decoded.id).populate('role');

    if (!user) {
      throw new Error('User không tồn tại');
    }

    if (user.status === 'inactive') {
      throw new Error('Tài khoản đã bị khóa');
    }

    // 3. Chuẩn bị dữ liệu cho Access Token mới
    const permissions = user.role ? user.role.permissions : [];
    const roleName = user.role ? user.role.name : 'No Role';

    const newAccessToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: roleName,
        permissions: permissions
      },
      process.env.JWT_SECRET || "examguard_default_secret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    return {
      accessToken: newAccessToken
    };
  } catch (err) {
    // Nếu token hết hạn hoặc sai, ném lỗi để Controller xử lý
    throw new Error('Refresh Token không hợp lệ hoặc đã hết hạn');
  }
};


module.exports = {
  registerUser,
  loginUser,
  getUserById,
  refreshToken
};
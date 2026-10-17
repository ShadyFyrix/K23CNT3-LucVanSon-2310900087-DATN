const mongoose = require('mongoose');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const bcrypt = require('bcryptjs');

const resolveRoleIds = async (rolesInput, singleRoleInput) => {
  let rawList = [];

  const parseItem = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const jsonStr = trimmed.replace(/'/g, '"');
          const parsed = JSON.parse(jsonStr);
          if (Array.isArray(parsed)) return parsed;
        } catch (_) {
          return trimmed.slice(1, -1).split(',').map(s => s.replace(/['"]/g, '').trim()).filter(Boolean);
        }
      }
      return [trimmed];
    }
    return [val];
  };

  rawList = [...parseItem(rolesInput), ...parseItem(singleRoleInput)].filter(Boolean);

  if (rawList.length === 0) return { roles: [], role: undefined };

  const allRoles = await Role.find({});
  const roleMapByName = new Map();
  for (const r of allRoles) {
    roleMapByName.set(r.name.toLowerCase(), r._id);
  }

  const resolvedIds = [];
  for (let item of rawList) {
    if (typeof item === 'object' && item._id) {
      item = item._id;
    }
    const str = String(item).replace(/[\[\]'"`]/g, '').trim();
    if (/^[0-9a-fA-F]{24}$/.test(str)) {
      resolvedIds.push(new mongoose.Types.ObjectId(str));
    } else if (roleMapByName.has(str.toLowerCase())) {
      resolvedIds.push(roleMapByName.get(str.toLowerCase()));
    }
  }

  const uniqueIds = Array.from(new Set(resolvedIds.map(id => String(id))))
    .map(id => new mongoose.Types.ObjectId(id));

  return {
    roles: uniqueIds,
    role: uniqueIds.length > 0 ? uniqueIds[0] : undefined
  };
};

exports.createUser = async (data) => {
  const existing = await User.findOne({ email: data.email });

  if (existing) {
    throw new Error('Email đã tồn tại trong hệ thống');
  }

  const salt = await bcrypt.genSalt(10);
  data.password = await bcrypt.hash(data.password, salt);

  // Xử lý chuẩn hóa và đồng bộ roles
  if (data.roles || data.role) {
    const resolved = await resolveRoleIds(data.roles, data.role);
    data.roles = resolved.roles;
    if (resolved.role) data.role = resolved.role;
  }

  const newDoc = await User.create(data);
  return await User.findById(newDoc._id)
    .populate('role', 'name description permissions')
    .populate('roles', 'name description permissions')
    .select('-password');
};

exports.getUsers = async (query) => {
  const { page = 1, limit = 1000, search = '' } = query;
  const filter = {};

  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  const users = await User
    .find(filter)
    .populate('role', 'name description permissions')
    .populate('roles', 'name description permissions')
    .select('-password')
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await User.countDocuments(filter);

  return {
    data: users,
    total
  };
};

exports.getUserById = async (id) => {
  const user = await User.findById(id)
    .populate('role', 'name description permissions')
    .populate('roles', 'name description permissions')
    .select('-password');
  return user;
};

exports.updateUser = async (id, data) => {
  if (data.password) {
    const salt = await bcrypt.genSalt(10);
    data.password = await bcrypt.hash(data.password, salt);
  }

  // Xử lý chuẩn hóa và đồng bộ roles
  if (data.roles !== undefined || data.role !== undefined) {
    const resolved = await resolveRoleIds(data.roles, data.role);
    data.roles = resolved.roles;
    if (resolved.role) data.role = resolved.role;
  }

  console.log("📝 [UserService.updateUser] Updating user:", id, "with roles:", data.roles);

  const updated = await User
    .findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after' })
    .populate('role', 'name description permissions')
    .populate('roles', 'name description permissions')
    .select('-password');

  console.log("✅ [UserService.updateUser] Result roles:", updated?.roles?.map(r => r.name));
  return updated;
};

exports.deleteUser = async (id) => {
  return await User.findByIdAndDelete(id);
};

// Đăng ký hoặc cập nhật dữ liệu khuôn mặt
exports.registerFace = async (id, faceData) => {
  const { facePhoto, faceAngles, faceAnglePhotos, faceDescriptor } = faceData;
  const updateFields = {
    isFaceRegistered: true,
    faceRegisteredAt: new Date()
  };

  // Lưu vector 5 góc khuôn mặt (512D) vào trường faceAngles
  if (faceAngles && typeof faceAngles === 'object') {
    const isVectorObject = Object.values(faceAngles).some(v => Array.isArray(v) && v.length > 0 && typeof v[0] === 'number');
    if (isVectorObject) {
      updateFields.faceAngles = {
        straight: Array.isArray(faceAngles.straight) ? faceAngles.straight : [],
        left: Array.isArray(faceAngles.left) ? faceAngles.left : [],
        right: Array.isArray(faceAngles.right) ? faceAngles.right : [],
        up: Array.isArray(faceAngles.up) ? faceAngles.up : [],
        down: Array.isArray(faceAngles.down) ? faceAngles.down : [],
      };
    } else {
      // Nếu là chuỗi URL ảnh, chuyển sang lưu vào faceAnglePhotos để tránh hỏng trường vector
      updateFields.faceAnglePhotos = faceAngles;
    }
  }

  if (faceAnglePhotos && typeof faceAnglePhotos === 'object') {
    updateFields.faceAnglePhotos = faceAnglePhotos;
  }

  if (facePhoto) {
    updateFields.facePhoto = facePhoto;
  }

  if (faceDescriptor && Array.isArray(faceDescriptor)) {
    updateFields.faceDescriptor = faceDescriptor;
  }

  const updated = await User.findByIdAndUpdate(
    id,
    { $set: updateFields },
    { returnDocument: 'after' }
  )
    .populate('role', 'name description permissions')
    .populate('roles', 'name description permissions')
    .select('-password');
  return updated;
};

// Xóa dữ liệu khuôn mặt (Hủy đăng ký)
exports.deleteFace = async (id) => {
  const updated = await User.findByIdAndUpdate(
    id,
    {
      $set: {
        isFaceRegistered: false,
        faceRegisteredAt: null,
        facePhoto: '',
        faceAngles: { straight: [], left: [], right: [], up: [], down: [] },
        faceAnglePhotos: { straight: '', left: '', right: '', up: '', down: '' },
        faceDescriptor: []
      }
    },
    { returnDocument: 'after' }
  )
    .populate('role', 'name description permissions')
    .populate('roles', 'name description permissions')
    .select('-password');
  return updated;
};
const Role = require('../models/role.model');
const User = require('../models/user.model');

// exports.getAllRoles = async () => {
//   const roles = await Role.find().sort({ createdAt: 1 });
  
//   // Đếm số lượng user cho từng role
//   const rolesWithCount = await Promise.all(roles.map(async (role) => {
//     const count = await User.countDocuments({ roles: role.name.toLowerCase() });
//     return {
//       ...role._doc,
//       userCount: count
//     };
//   }));
  
//   return rolesWithCount;
// };




exports.getAllRoles = async () => {
  // Lấy tất cả các vai trò
  const roles = await Role.find().sort({ createdAt: 1 });
  
  // Đếm số lượng user cho từng role dựa trên trường 'role' (ObjectId) trong model User
  const rolesWithCount = await Promise.all(roles.map(async (role) => {
    // ĐỔI TẠI ĐÂY: Tìm theo trường 'role' (số ít) và dùng _id để đếm
    const count = await User.countDocuments({ role: role._id }); 
    
    return {
      ...role._doc,
      userCount: count
    };
  }));
  
  return rolesWithCount;
};

exports.createRole = async (data) => {
  return await Role.create(data);
};

exports.updateRole = async (id, data) => {
  return await Role.findByIdAndUpdate(id, data, { returnDocument: 'after' });
};

exports.deleteRole = async (id) => {
  const role = await Role.findById(id);
  if (role && role.isSystem) throw new Error("Không thể xóa vai trò hệ thống");
  return await Role.findByIdAndDelete(id);
};
/**
 * Lấy danh sách tên tất cả vai trò của User dưới dạng mảng string chữ thường
 */
const getUserRoleNames = (user) => {
  if (!user) return [];
  const roles = new Set();

  if (user.role) {
    const rName = typeof user.role === 'object' ? user.role?.name : user.role;
    if (rName) roles.add(String(rName).toLowerCase().trim());
  }

  if (user.roles && Array.isArray(user.roles)) {
    user.roles.forEach(r => {
      const rName = typeof r === 'object' ? r?.name : r;
      if (rName) roles.add(String(rName).toLowerCase().trim());
    });
  }

  if (user.roleNames && Array.isArray(user.roleNames)) {
    user.roleNames.forEach(r => {
      if (r) roles.add(String(r).toLowerCase().trim());
    });
  }

  return Array.from(roles);
};

/**
 * Kiểm tra xem User có ít nhất 1 trong các vai trò trong allowedRoles hay không
 */
const userHasAnyRole = (user, allowedRoles = []) => {
  if (!user) return false;
  const userRoles = getUserRoleNames(user);
  
  // Admin / Superadmin mặc định có mọi quyền
  if (userRoles.includes('admin') || userRoles.includes('superadmin')) {
    return true;
  }

  const allowedSet = allowedRoles.map(r => r.toLowerCase().trim());
  return userRoles.some(r => allowedSet.includes(r));
};

module.exports = {
  getUserRoleNames,
  userHasAnyRole
};

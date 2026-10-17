// exports.checkPermission = (resource, action) => {

//   return async (req,res,next)=>{

//     const user = req.user;

//     const roles = user.roles;

//     for(const role of roles){

//       const r = await Role.findById(role).populate('permissions');

//       const allowed = r.permissions.some(p => 
//         p.resource === resource && p.action === action
//       );

//       if(allowed) return next();

//     }

//     return res.status(403).json({
//       message:'Permission denied'
//     });

//   }

// }

const { PERMISSIONS } = require('../constants/permissions');

/**
 * checkPermission: Kiểm tra quyền cụ thể
 * @param {String} requiredPermission - Mã quyền cần kiểm tra (lấy từ PERMISSIONS constant)
 */
exports.checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    // 1. Kiểm tra xem thông tin user và role có tồn tại (đã qua middleware protect chưa)
    if (!req.user || !req.user.role) {
      return res.status(500).json({ success: false, message: 'Lỗi hệ thống: Không tìm thấy thông tin phân quyền' });
    }

    const userPermissions = req.user.role.permissions || [];

    // 2. Logic kiểm tra:
    // - Nếu user có quyền 'all' (SUPER_ADMIN) -> Cho qua luôn
    // - Nếu user có mã quyền cụ thể trong danh sách -> Cho qua
    const hasAccess = userPermissions.includes(PERMISSIONS.SUPER_ADMIN) || 
                      userPermissions.includes(requiredPermission);

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: `Bạn không có quyền thực hiện hành động: ${requiredPermission}` 
      });
    }

    // 3. Hợp lệ
    next();
  };
};
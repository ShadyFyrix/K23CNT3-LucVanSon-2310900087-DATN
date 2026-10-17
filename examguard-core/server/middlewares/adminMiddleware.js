// middlewares/adminMiddleware.js
const adminMiddleware = (req, res, next) => {
    // req.user có được từ authMiddleware chạy trước đó
    if (!req.user) {
        return res.status(403).json({ message: 'Không có quyền truy cập. Yêu cầu quyền Admin.' });
    }

    let roleName = '';
    let isSysAdmin = false;
    let userPermissions = [];

    if (typeof req.user.role === 'object' && req.user.role !== null) {
        roleName = req.user.role.name?.toLowerCase() || '';
        isSysAdmin = req.user.role.isSystem === true;
        userPermissions = req.user.role.permissions || [];
    } else if (typeof req.user.role === 'string') {
        roleName = req.user.role.toLowerCase();
    }

    if (
        roleName === 'admin' || 
        isSysAdmin || 
        userPermissions.includes('all')
    ) {
        next(); // Là admin, cho đi tiếp
    } else {
        res.status(403).json({ message: 'Không có quyền truy cập. Yêu cầu quyền Admin.' });
    }
};

module.exports = adminMiddleware;
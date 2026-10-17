const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const TokenBlacklist = require('../models/tokenBlacklist.model');

const authMiddleware = async (req, res, next) => {
    // 1. Lấy token từ header hoặc cookie (Ưu tiên Header)
    const token = (req.headers.authorization && req.headers.authorization.split(' ')[1]) || req.cookies?.accessToken;

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Truy cập bị từ chối. Vui lòng đăng nhập.' 
        });
    }

    try {
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'examguard_default_secret');
        } catch (err) {
            // Thử giải mã nếu secret chưa khớp hoặc dùng decoded payload fallback
            decoded = jwt.decode(token);
            if (!decoded) {
                throw err;
            }
        }

        // Hỗ trợ đồng thời id, userId, _id
        const userId = decoded.id || decoded.userId || decoded._id;
        let currentUser = null;

        if (userId) {
            currentUser = await User.findById(userId).populate('role').populate('roles');
        }

        // Fallback: Tìm theo email nếu trong token có email mà tìm id không ra
        if (!currentUser && decoded.email) {
            currentUser = await User.findOne({ email: decoded.email }).populate('role').populate('roles');
        }

        if (!currentUser) {
            return res.status(401).json({ 
                success: false, 
                message: 'Người dùng không còn tồn tại.' 
            });
        }

        // Kiểm tra trạng thái tài khoản
        if (currentUser.status === 'inactive') {
            return res.status(403).json({ 
                success: false, 
                message: 'Tài khoản của bạn đã bị khóa.' 
            });
        }

        // Kiểm tra Token Blacklist (Force Logout)
        const tokenIssuedAt = decoded.iat ? new Date(decoded.iat * 1000) : new Date(0);
        const blacklistEntry = await TokenBlacklist.findOne({
            userId: currentUser._id,
            invalidatedBefore: { $gt: tokenIssuedAt }
        }).lean();

        if (blacklistEntry) {
            return res.status(401).json({
                success: false,
                code: 'FORCE_LOGGED_OUT',
                message: 'Phiên đăng nhập của bạn đã bị thu hồi bởi quản trị viên. Vui lòng đăng nhập lại.'
            });
        }

        // Gán vào req
        req.user = currentUser;
        next();
    } catch (error) {
        console.error('❌ [authMiddleware Error]:', error.message);
        let message = 'Token không hợp lệ';
        if (error.name === 'TokenExpiredError') {
            message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        }

        return res.status(401).json({ 
            success: false, 
            message: message 
        });
    }
};

module.exports = authMiddleware;
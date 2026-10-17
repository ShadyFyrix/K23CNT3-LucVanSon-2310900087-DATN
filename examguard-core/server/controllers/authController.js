// controllers/authController.js
const authService = require('../services/authService');
const User = require('../models/user.model'); // Import Model

const getCookieOptions = (maxAge) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' && !process.env.COOKIE_DOMAIN?.includes('localhost'),
  sameSite: 'lax',
  domain: process.env.COOKIE_DOMAIN || undefined,
  maxAge
});

const clearCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' && !process.env.COOKIE_DOMAIN?.includes('localhost'),
  sameSite: 'lax',
  domain: process.env.COOKIE_DOMAIN || undefined
};

const register = async (req, res) => {
    try {
        await authService.registerUser(req.body);
        res.status(201).json({ message: 'Đăng ký thành công!' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};



const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await authService.loginUser(email, password);
    console.log(`✅ [ExamGuard AI Auth] Đăng nhập thành công: ${result.user.email} (${result.user.role?.name || 'User'})`);

    // Refresh token → httpOnly Cookie (JS không thể đọc được)
    res.cookie('refreshToken', result.refreshToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));
    // KHÔNG set accessToken cookie - lưu trong RAM phía client (Zustand)

    res.json({
      success: true,
      data: { 
        user: result.user,
        // Access token trả về để client lưu vào RAM (Zustand) - KHÔNG localStorage
        accessToken: result.accessToken
      }
    });
  } catch (error) {
    console.warn(`⚠️ [ExamGuard AI Auth] Đăng nhập thất bại cho [${email}]:`, error.message);

    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};


// const getMe = async (req, res) => {
//     try {
//         const user = await authService.getUserById(req.user.userId);
//         res.json(user);
//     } catch (error) {
//         res.status(500).json({ message: 'Lỗi server' });
//     }
// };

// controllers/authController.js

const getMe = async (req, res) => {
    try {
        // Log để kiểm tra req.user có tồn tại không (do middleware gán vào)
        // console.log("User from middleware:", req.user);

        // QUAN TRỌNG: Phải dùng req.user.id hoặc req.user._id tùy theo cách bạn gán ở Middleware
        const userId = req.user.id || req.user._id; 
        
        if (!userId) {
            return res.status(400).json({ success: false, message: "Không tìm thấy ID người dùng" });
        }

        const user = await authService.getUserById(userId);
        
        // Trả về theo cấu trúc { success: true, data: user }
        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error("🔥 Lỗi tại getMe Controller:", error.message);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};


// Thêm vào controllers/authController.js

// [GET] Lấy danh sách users (Trừ password)
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách user' });
    }
};

// [DELETE] Xóa user theo ID
const deleteUserById = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'User không tồn tại' });
        res.json({ message: 'Đã xóa người dùng thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi xóa user' });
    }
};



const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh Token là bắt buộc'
      });
    }

    const result = await authService.refreshToken(refreshToken);

    res.cookie('accessToken', result.accessToken, getCookieOptions(24 * 60 * 60 * 1000));

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken
      }
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      message: err.message
    });
  }
};
const logout = async (req, res) => {
  res.clearCookie('accessToken', clearCookieOptions);
  res.clearCookie('refreshToken', clearCookieOptions);
  res.json({ success: true });
};

const TokenBlacklist = require('../models/tokenBlacklist.model');

/**
 * [POST] /api/auth/force-logout/:userId
 * Admin buộc đăng xuất 1 tài khoản cụ thể - vô hiệu hoá toàn bộ session của user đó
 */
const forceLogoutUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const targetUser = await User.findById(userId).select('email fullName');
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tài khoản' });
    }

    // Thêm vào blacklist - vô hiệu hoá tất cả token được issue trước thời điểm này
    await TokenBlacklist.create({
      userId: targetUser._id,
      userEmail: targetUser.email,
      type: 'ALL_TOKENS',
      invalidatedBefore: new Date(),
      revokedBy: req.user._id,
      revokedByEmail: req.user.email,
      reason: reason || `Force logout by admin ${req.user.email}`
    });

    // Ghi log vào LoginLog
    try {
      await LoginLog.create({
        user: targetUser._id,
        userEmail: targetUser.email,
        userName: targetUser.fullName || targetUser.email,
        ipAddress: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(),
        userAgent: req.headers['user-agent'] || 'Admin Action',
        status: 'FAILED',
        failReason: `⚡ FORCE LOGOUT by Admin [${req.user.email}]: ${reason || 'Quản trị viên thu hồi quyền truy cập'}`
      });
    } catch (_) {}

    res.json({
      success: true,
      message: `Đã buộc đăng xuất tài khoản: ${targetUser.email}`
    });
  } catch (err) {
    console.error('forceLogoutUser error:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi force logout' });
  }
};

/**
 * [POST] /api/auth/force-logout-all
 * Admin buộc đăng xuất TOÀN BỘ tài khoản (trừ admin đang thực hiện)
 */
const forceLogoutAll = async (req, res) => {
  try {
    const { reason } = req.body;

    // Tìm tất cả users trừ admin hiện tại
    const users = await User.find({ _id: { $ne: req.user._id } }).select('_id email fullName');

    const bulkInsert = users.map(u => ({
      userId: u._id,
      userEmail: u.email,
      type: 'ALL_TOKENS',
      invalidatedBefore: new Date(),
      revokedBy: req.user._id,
      revokedByEmail: req.user.email,
      reason: reason || `Force logout ALL by admin ${req.user.email}`
    }));

    if (bulkInsert.length > 0) {
      await TokenBlacklist.insertMany(bulkInsert, { ordered: false });
    }

    // Ghi log
    try {
      await LoginLog.create({
        userEmail: 'SYSTEM',
        userName: `FORCE LOGOUT ALL by [${req.user.email}]`,
        ipAddress: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(),
        userAgent: req.headers['user-agent'] || 'Admin Action',
        status: 'FAILED',
        failReason: `⚡ FORCE LOGOUT ALL USERS - Admin: ${req.user.email} | Lý do: ${reason || 'Thu hồi toàn bộ phiên đăng nhập'}`
      });
    } catch (_) {}

    res.json({
      success: true,
      message: `Đã buộc đăng xuất ${users.length} tài khoản khỏi hệ thống`
    });
  } catch (err) {
    console.error('forceLogoutAll error:', err.message);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ khi force logout all' });
  }
};

/**
 * [GET] /api/auth/ip-location
 * Lấy tọa độ và địa chỉ từ IP của Client (Backend proxy tránh lỗi CORS/CSP và Mixed Content HTTP phía Browser)
 */
const getIpLocation = async (req, res) => {
  try {
    const rawIp = req.headers['cf-connecting-ip'] || 
                  req.headers['x-real-ip'] || 
                  (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) || 
                  req.socket.remoteAddress || 
                  req.ip || 
                  '';

    const cleanIp = String(rawIp).replace(/^::ffff:/, '').trim();

    // Kiểm tra IP private / localhost
    const isLocalOrPrivate = !cleanIp || 
      cleanIp === '127.0.0.1' || 
      cleanIp === '::1' || 
      cleanIp === 'localhost' || 
      cleanIp.startsWith('10.') || 
      cleanIp.startsWith('192.168.') || 
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(cleanIp);

    const targetQuery = isLocalOrPrivate ? '' : cleanIp;

    // 1. Thử ip-api.com từ Node.js (cực nhanh, hỗ trợ tên địa danh tiếng Việt)
    try {
      const url = targetQuery 
        ? `http://ip-api.com/json/${targetQuery}?lang=vi` 
        : `http://ip-api.com/json/?lang=vi`;
      
      const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (response.ok) {
        const data = await response.json();
        if (data && data.status === 'success' && data.lat && data.lon) {
          const addressParts = [data.city, data.regionName, data.country].filter(Boolean);
          return res.json({
            success: true,
            data: {
              latitude: data.lat,
              longitude: data.lon,
              address: `[IP] ${addressParts.join(', ')}`,
              ip: data.query || cleanIp,
              city: data.city,
              region: data.regionName,
              country: data.country
            }
          });
        }
      }
    } catch (e1) {
      console.warn('[IP Location] ip-api.com fallback warning:', e1.message);
    }

    // 2. Fallback thứ 2: freeipapi.com
    try {
      const url2 = targetQuery 
        ? `https://freeipapi.com/api/json/${targetQuery}` 
        : `https://freeipapi.com/api/json`;
      const response2 = await fetch(url2, { signal: AbortSignal.timeout(4000) });
      if (response2.ok) {
        const data2 = await response2.json();
        if (data2 && data2.latitude && data2.longitude) {
          const addressParts = [data2.cityName, data2.regionName, data2.countryName].filter(Boolean);
          return res.json({
            success: true,
            data: {
              latitude: data2.latitude,
              longitude: data2.longitude,
              address: `[IP] ${addressParts.join(', ')}`,
              ip: data2.ipAddress || cleanIp,
              city: data2.cityName,
              region: data2.regionName,
              country: data2.countryName
            }
          });
        }
      }
    } catch (e2) {
      console.warn('[IP Location] freeipapi.com fallback warning:', e2.message);
    }

    // 3. Fallback vị trí mặc định nếu mạng ngoài bị chặn hoàn toàn
    return res.json({
      success: true,
      data: {
        latitude: 21.0285,
        longitude: 105.8542,
        address: '[IP] Hà Nội, Việt Nam (Mặc định)',
        ip: cleanIp || '127.0.0.1',
        city: 'Hà Nội',
        country: 'Việt Nam'
      }
    });
  } catch (error) {
    console.error('[IP Location] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Không thể xác định vị trí qua IP'
    });
  }
};

module.exports = { register, login, getMe, getAllUsers, deleteUserById, refresh, logout, forceLogoutUser, forceLogoutAll, getIpLocation };
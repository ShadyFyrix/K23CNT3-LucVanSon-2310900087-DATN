const AuditLog = require('../models/auditLog.model');

/**
 * Ghi log một thao tác. Hàm này KHÔNG throw error để không làm gián đoạn main flow.
 * @param {Object} data
 * @param {Object|null} data.user - req.user object (từ authMiddleware)
 * @param {string} data.action - 'ATTENDANCE' | 'NOTE' | 'FEEDBACK_360' | 'YOUTUBE' | 'IMAGE' | 'UPDATE_FEEDBACK'
 * @param {string|null} data.studentId
 * @param {string} data.studentName
 * @param {string|null} data.classId
 * @param {string} data.className
 * @param {Date|string|null} data.sessionDate
 * @param {string} data.details
 * @param {{ before: any, after: any }|null} data.diff - Trạng thái trước/sau khi thay đổi
 */
const logActivity = async (data) => {
  try {
    const {
      user, action,
      studentId = null, studentName = '',
      classId = null, className = '',
      sessionDate = null, details = '',
      diff = null
    } = data;

    await AuditLog.create({
      user: user?._id || null,
      userName: user?.name || user?.email || 'Hệ thống',
      userRole: (() => {
        if (!user) return '';
        if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
          return user.roles.map(r => typeof r === 'object' ? r.name : r).filter(Boolean).join(', ');
        }
        return user.role?.name || user.role || '';
      })(),
      action,
      diff: diff || { before: null, after: null },
      studentId,
      studentName,
      classId,
      className,
      sessionDate: sessionDate ? new Date(sessionDate) : null,
      details
    });
  } catch (err) {
    // Chỉ in ra console, không re-throw để không ảnh hưởng luồng chính
    console.error('[AuditLog] Lỗi khi ghi log:', err.message);
  }
};

/**
 * Lấy danh sách log có phân trang và filter
 * @param {number} page
 * @param {number} limit
 * @param {string|null} action - filter theo action
 * @param {string|null} startDate - filter từ ngày (ISO string)
 * @param {string|null} endDate - filter đến ngày (ISO string)
 */
const getLogs = async ({ page = 1, limit = 20, action = null, startDate = null, endDate = null }) => {
  const query = {};

  if (action) {
    query.action = action;
  }

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  const skip = (page - 1) * limit;
  const total = await AuditLog.countDocuments(query);
  const logs = await AuditLog.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  };
};

module.exports = { logActivity, getLogs };

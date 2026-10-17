const auditLogService = require('../services/auditLog.service');

exports.getLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const action = req.query.action || null;
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;

    const data = await auditLogService.getLogs({ page, limit, action, startDate, endDate });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi lấy nhật ký: ' + err.message });
  }
};

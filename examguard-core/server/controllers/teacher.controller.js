const teacherService = require('../services/teacher.service');

exports.getMyTeacherProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const teacher = await require('../models/teacher.model').findOne({ userId });
    if (!teacher) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hồ sơ giảng viên liên kết với tài khoản này.' });
    }
    res.json({ success: true, data: teacher });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



exports.createTeacher = async (req, res) => {

  try {

    const teacher = await teacherService.createTeacher(req.body);

    res.json({
      success: true,
      data: teacher
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};


exports.getTeachers = async (req, res) => {

  try {

    const data = await teacherService.getTeachers(req.query);

    res.json({
      success: true,
      ...data
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};


exports.getTeacherById = async (req, res) => {

  try {

    const data = await teacherService.getTeacherById(req.params.id);

    res.json({
      success: true,
      data
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};


exports.updateTeacher = async (req, res) => {

  try {

    const data = await teacherService.updateTeacher(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      data
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};


exports.deleteTeacher = async (req, res) => {

  try {

    await teacherService.deleteTeacher(req.params.id);

    res.json({
      success: true
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message
    });

  }

};


// ─── LANDING PAGE ──────────────────────────────────────────────────────────────

/**
 * [PUBLIC] GET /api/public/teachers/landing
 * Lấy danh sách giảng viên hiển thị trên Landing Page
 */
const Teacher = require('../models/teacher.model');

exports.getLandingTeachers = async (req, res) => {
  try {
    const teachers = await Teacher
      .find({ showOnLandingPage: true })
      .sort({ landingOrder: 1 })
      .select('fullName avatar biography featuredSkills specialization landingOrder');

    res.json({ success: true, data: teachers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * [PROTECTED - Admin] PUT /api/admin/teachers/landing/config
 * Cập nhật hàng loạt cấu hình hiển thị Landing Page cho các giảng viên
 * Body: [{ _id, showOnLandingPage, landingOrder, biography, featuredSkills }]
 */
exports.updateLandingConfig = async (req, res) => {
  try {
    const updates = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Payload phải là một mảng các object cập nhật.' });
    }

    const bulkOps = updates.map(({ _id, showOnLandingPage, landingOrder, biography, featuredSkills }) => ({
      updateOne: {
        filter: { _id },
        update: {
          $set: {
            ...(showOnLandingPage !== undefined && { showOnLandingPage }),
            ...(landingOrder !== undefined && { landingOrder }),
            ...(biography !== undefined && { biography }),
            ...(featuredSkills !== undefined && { featuredSkills })
          }
        }
      }
    }));

    const result = await Teacher.bulkWrite(bulkOps);

    res.json({
      success: true,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
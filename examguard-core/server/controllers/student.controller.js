const studentService = require('../services/student.service');
const mongoose = require('mongoose');

exports.getMyStudentProfile = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const email = req.user?.email;
    const Student = mongoose.model('Student');
    
    const conditions = [];
    if (userId) conditions.push({ userId });
    if (email) conditions.push({ email });

    const student = await Student.findOne(conditions.length > 0 ? { $or: conditions } : {})
      .populate('department')
      .populate('class')
      .populate('batch');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Chưa tìm thấy hồ sơ sinh viên liên kết.' });
    }

    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const student = await studentService.createStudent(req.body);
    res.json({
      success: true,
      data: student
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.getStudents = async (req, res) => {
  try {
    const data = await studentService.getStudents(req.query);
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

exports.getStudentById = async (req, res) => {
  try {
    const student = await studentService.getStudentById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sinh viên'
      });
    }

    res.json({
      success: true,
      data: student
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const data = await studentService.updateStudent(
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

exports.deleteStudent = async (req, res) => {
  try {
    await studentService.deleteStudent(req.params.id);
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

exports.bulkCreateAccounts = async (req, res) => {
  try {
    const result = await studentService.bulkCreateStudentAccounts();
    res.json({
      success: true,
      message: `Đã cấp tài khoản thành công cho sinh viên! Mật khẩu mặc định: ${result.defaultPassword}`,
      data: result
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
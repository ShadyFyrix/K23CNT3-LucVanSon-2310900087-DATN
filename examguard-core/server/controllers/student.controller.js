const studentService = require('../services/student.service');

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
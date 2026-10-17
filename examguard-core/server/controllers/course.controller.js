

const courseService = require('../services/course.service');

exports.createCourse = async(req, res) => {
  try {
    const course = await courseService.createCourse(req.body);
    res.json({
      success: true,
      data: course
    });
  } catch(err) {
    res.status(500).json({ success: false, message: err.message }); // Thêm success: false
  }
};

exports.getCourses = async(req, res) => {
  try {
    const data = await courseService.getCourses(req.query);
    res.json({
      success: true,
      ...data // Sẽ bao gồm data: courses và pagination
    });
  } catch(err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCourseById = async(req, res) => {
  try {
    const data = await courseService.getCourseById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: "Course not found" });
    
    res.json({
      success: true,
      data
    });
  } catch(err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCourse = async(req, res) => {
  try {
    const data = await courseService.updateCourse(req.params.id, req.body);
    res.json({
      success: true,
      data
    });
  } catch(err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCourse = async(req, res) => {
  try {
    await courseService.deleteCourse(req.params.id);
    res.json({
      success: true,
      message: "Deleted successfully"
    });
  } catch(err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
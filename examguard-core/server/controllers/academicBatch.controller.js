const AcademicBatch = require('../models/academicBatch.model');

exports.getBatches = async (req, res) => {
  try {
    const batches = await AcademicBatch.find().populate('department').sort({ startYear: -1 });
    res.json({ success: true, data: batches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBatch = async (req, res) => {
  try {
    const { code, name, startYear, endYear, department, status } = req.body;
    const batch = await AcademicBatch.create({
      code,
      name,
      startYear,
      endYear,
      department,
      status: status || 'active'
    });
    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateBatch = async (req, res) => {
  try {
    const batch = await AcademicBatch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!batch) return res.status(404).json({ success: false, message: 'Khóa học không tồn tại' });
    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteBatch = async (req, res) => {
  try {
    const batch = await AcademicBatch.findByIdAndDelete(req.params.id);
    if (!batch) return res.status(404).json({ success: false, message: 'Khóa học không tồn tại' });
    res.json({ success: true, message: 'Đã xóa khóa học thành công' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

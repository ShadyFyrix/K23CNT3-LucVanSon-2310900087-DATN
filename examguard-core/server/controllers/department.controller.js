const departmentService = require('../services/department.service');

exports.getDepartments = async (req, res) => {
  try {
    const departments = await departmentService.getAllDepartments();
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const department = await departmentService.createDepartment(req.body);
    res.status(201).json({ success: true, data: department });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const department = await departmentService.updateDepartment(req.params.id, req.body);
    res.json({ success: true, data: department });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    await departmentService.deleteDepartment(req.params.id);
    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addMember = async (req, res) => {
  try {
    const department = await departmentService.addMember(req.params.id, req.body.userId);
    res.json({ success: true, data: department });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

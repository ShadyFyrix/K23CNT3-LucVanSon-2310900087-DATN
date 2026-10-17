const campusService = require('../services/campus.service');

exports.createCampus = async (req, res) => {
  try {
    const data = await campusService.createCampus(req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getCampuses = async (req, res) => {
  try {
    const data = await campusService.getCampuses();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCampus = async (req, res) => {
  try {
    const data = await campusService.updateCampus(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCampus = async (req, res) => {
  try {
    await campusService.deleteCampus(req.params.id);
    res.json({ success: true, message: "Campus deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
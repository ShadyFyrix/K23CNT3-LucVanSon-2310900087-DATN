const roleService = require('../services/role.service');

exports.getRoles = async (req, res) => {
  try {
    const data = await roleService.getAllRoles();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.saveRole = async (req, res) => {
  try {
    const { id, ...body } = req.body;
    let data;
    if (id && id.length > 5) {
      data = await roleService.updateRole(id, body);
    } else {
      data = await roleService.createRole(body);
    }
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteRole = async (req, res) => {
  try {
    await roleService.deleteRole(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
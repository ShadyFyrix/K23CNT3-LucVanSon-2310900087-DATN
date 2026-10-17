const express = require('express');
const router = express.Router();
const roleController = require('../controllers/role.controller');

router.get('/', roleController.getRoles);
router.post('/', roleController.saveRole);
router.delete('/:id', roleController.deleteRole);

module.exports = router;
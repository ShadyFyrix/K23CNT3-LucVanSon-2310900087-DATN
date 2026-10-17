const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/department.controller');

router.get('/', departmentController.getDepartments);
router.post('/', departmentController.createDepartment);
router.put('/:id', departmentController.updateDepartment);
router.delete('/:id', departmentController.deleteDepartment);
router.post('/:id/members', departmentController.addMember);

module.exports = router;

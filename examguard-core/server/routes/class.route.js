const express = require('express');
const router = express.Router();

const classController = require('../controllers/class.controller');

router.post('/', classController.createClass);

router.get('/', classController.getClasses);

router.get('/:id', classController.getClassById);

router.put('/:id', classController.updateClass);

router.delete('/:id', classController.deleteClass);

router.post('/:classId/students', classController.addStudent);

router.delete('/:classId/students', classController.removeStudent);

router.get('/:classId/students', classController.getClassStudents);

module.exports = router;
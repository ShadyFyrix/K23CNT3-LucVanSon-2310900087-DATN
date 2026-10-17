const express = require('express');
const router = express.Router();
const campusController = require('../controllers/campus.controller');

router.post('/', campusController.createCampus);
router.get('/', campusController.getCampuses);
router.put('/:id', campusController.updateCampus);
router.delete('/:id', campusController.deleteCampus);

module.exports = router;
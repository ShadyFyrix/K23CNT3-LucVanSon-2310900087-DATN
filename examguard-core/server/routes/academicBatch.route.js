const express = require('express');
const router = express.Router();
const academicBatchController = require('../controllers/academicBatch.controller');

router.get('/', academicBatchController.getBatches);
router.post('/', academicBatchController.createBatch);
router.put('/:id', academicBatchController.updateBatch);
router.delete('/:id', academicBatchController.deleteBatch);

module.exports = router;

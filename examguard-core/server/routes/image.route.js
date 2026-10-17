const express = require('express');
const router = express.Router();
const imageController = require('../controllers/image.controller');
const uploadMiddleware = require('../middlewares/upload.middleware');

// Endpoint: POST /api/images/upload
router.post('/upload', uploadMiddleware.single('image'), (req, res) => {
    imageController.upload(req, res);
});

// Endpoint: GET /api/images/:id
router.get('/:id', (req, res) => {
    imageController.getById(req, res);
});

module.exports = router;
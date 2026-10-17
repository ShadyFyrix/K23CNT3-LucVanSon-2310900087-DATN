const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const { checkPermission } = require('../middlewares/permission.middleware');
const { PERMISSIONS } = require('../constants/permissions');

router.use(authMiddleware);

router.get('/stats', checkPermission(PERMISSIONS.DASHBOARD.VIEW), dashboardController.getDashboardStats);

module.exports = router;

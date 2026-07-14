const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminOnly);

// Unified export route handling Excel, CSV, PDF
router.get('/', exportController.exportReport);

// Backward compatible path mappings for specific tabs
router.get('/daily', (req, res, next) => { req.query.type = 'daily'; next(); }, exportController.exportReport);
router.get('/student', (req, res, next) => { req.query.type = 'student'; next(); }, exportController.exportReport);
router.get('/faculty', (req, res, next) => { req.query.type = 'faculty'; next(); }, exportController.exportReport);

module.exports = router;

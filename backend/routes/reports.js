const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);
router.use(adminOnly);

// Unified reports category controller endpoint
router.get('/', reportController.generateReport);

// Fallbacks to support older routing if any
router.get('/daily', (req, res, next) => { req.query.type = 'daily'; next(); }, reportController.generateReport);
router.get('/defaulters', (req, res, next) => { req.query.type = 'defaulters'; next(); }, reportController.generateReport);
router.get('/hourly', (req, res, next) => { req.query.type = 'hour'; next(); }, reportController.generateReport);
router.get('/student/:studentReg', (req, res, next) => { req.query.type = 'student'; req.query.studentReg = req.params.studentReg; next(); }, reportController.generateReport);

module.exports = router;

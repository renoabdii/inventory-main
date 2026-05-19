const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', reportController.getReport);

module.exports = router;

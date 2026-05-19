const express = require('express');
const router = express.Router();
const forecastController = require('../controllers/forecastController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', forecastController.getPrediction);

module.exports = router;

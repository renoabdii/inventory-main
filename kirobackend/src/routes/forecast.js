const express = require('express');
const router = express.Router();
const forecastController = require('../controllers/forecastController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', forecastController.getPrediction);
router.get('/status', forecastController.getPredictionStatus);
router.post('/generate', authorize('admin'), forecastController.generatePrediction);

module.exports = router;

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticate } = require('../middlewares/auth');

router.post('/xendit-callback', paymentController.notification);
router.post('/midtrans-notification', paymentController.notification);

router.use(authenticate);
router.post('/qris/create', paymentController.createQris);
router.get('/:orderId/status', paymentController.getStatus);
router.post('/:orderId/simulate-paid', paymentController.simulatePaid);

module.exports = router;

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middlewares/auth');
const { loginRateLimit } = require('../middlewares/loginRateLimit');

router.post('/register', authController.register);
router.post('/login', loginRateLimit, authController.login);
router.get('/profile', authenticate, authController.getProfile);
router.post('/create-cashier', authenticate, authorize('admin'), authController.createCashier);

module.exports = router;

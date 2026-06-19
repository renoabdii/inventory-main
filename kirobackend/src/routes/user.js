const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middlewares/auth');

// Change password - accessible by any logged in user
router.put('/change-password', authenticate, userController.changePassword);

module.exports = router;

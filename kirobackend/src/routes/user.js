const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/auth');

// Change password - accessible by any logged in user
router.put('/change-password', authenticate, userController.changePassword);

// Admin-only routes
router.use(authenticate, authorize('admin'));

router.get('/', userController.getAll);
router.get('/:id', userController.getById);
router.post('/', userController.create);
router.put('/:id', userController.update);
router.delete('/:id', userController.remove);

module.exports = router;

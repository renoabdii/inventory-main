const express = require('express');
const router = express.Router();
const cashierAccountController = require('../controllers/cashierAccountController');
const { authenticate, authorize } = require('../middlewares/auth');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/', cashierAccountController.list);
router.post('/', cashierAccountController.create);
router.put('/:id', cashierAccountController.update);

module.exports = router;

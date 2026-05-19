const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', transactionController.getAll);
router.get('/cashier-stats', transactionController.getCashierStats);
router.get('/:id', transactionController.getById);
router.post('/', transactionController.create);

module.exports = router;

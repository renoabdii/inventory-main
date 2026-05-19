const express = require('express');
const router = express.Router();
const stockMovementController = require('../controllers/stockMovementController');
const { authenticate } = require('../middlewares/auth');

// Semua route butuh login
router.use(authenticate);

router.get('/', stockMovementController.getAll);
router.get('/:id', stockMovementController.getById);
router.post('/out', stockMovementController.createOut);
router.post('/in', stockMovementController.createIn);

module.exports = router;

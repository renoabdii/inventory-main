const express = require('express');
const router = express.Router();
const incomingItemController = require('../controllers/incomingItemController');
const { authenticate } = require('../middlewares/auth');

// Semua route butuh login
router.use(authenticate);

router.get('/', incomingItemController.getAll);
router.get('/:id', incomingItemController.getById);
router.post('/', incomingItemController.create);
router.patch('/:id/status', incomingItemController.updateStatus);
router.delete('/:id', incomingItemController.remove);

module.exports = router;

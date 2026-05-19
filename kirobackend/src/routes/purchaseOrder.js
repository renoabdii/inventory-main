const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', purchaseOrderController.getAll);
router.get('/:id', purchaseOrderController.getById);
router.post('/', purchaseOrderController.create);
router.patch('/:id/status', purchaseOrderController.updateStatus);
router.delete('/:id', purchaseOrderController.remove);

module.exports = router;

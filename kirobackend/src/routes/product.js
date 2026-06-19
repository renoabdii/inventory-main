const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate } = require('../middlewares/auth');

// Semua route produk butuh login
router.use(authenticate);

router.get('/', productController.getAll);
router.get('/categories', productController.getCategories);
router.get('/low-stock', productController.getLowStock);
router.get('/export', productController.getExportData);
router.post('/import', productController.importBulk);
router.get('/:id', productController.getById);
router.post('/', productController.create);
router.put('/:id', productController.update);
router.delete('/:id', productController.remove);

module.exports = router;

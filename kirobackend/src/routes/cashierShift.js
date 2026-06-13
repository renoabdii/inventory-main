const express = require('express');
const router = express.Router();
const cashierShiftController = require('../controllers/cashierShiftController');
const { authenticate } = require('../middlewares/auth');

router.use(authenticate);

router.get('/', cashierShiftController.getAll);
router.get('/active', cashierShiftController.getActive);
router.post('/open', cashierShiftController.openShift);
router.post('/close', cashierShiftController.closeShift);

module.exports = router;

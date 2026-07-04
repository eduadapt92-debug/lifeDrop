const express    = require('express');
const router     = express.Router();
const { getActiveAlerts, getAllAlerts, createAlert, updateAlert, deleteAlert } = require('../controllers/alertController');
const { protect }    = require('../middleware/authMiddleware');
const { authorize }  = require('../middleware/roleMiddleware');

router.get('/',    getActiveAlerts);
router.get('/all', protect, authorize('admin'), getAllAlerts);
router.post('/',   protect, authorize('admin'), createAlert);
router.put('/:id', protect, authorize('admin'), updateAlert);
router.delete('/:id', protect, authorize('admin'), deleteAlert);

module.exports = router;

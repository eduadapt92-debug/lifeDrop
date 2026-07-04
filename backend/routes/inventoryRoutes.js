const express = require('express');
const router = express.Router();
const { addInventory, getInventory, updateInventory, deleteInventory, getLowStock } = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/', protect, authorize('hospital', 'bloodbank', 'admin'), addInventory);
router.get('/', getInventory);
router.get('/low-stock', getLowStock);
router.put('/:id', protect, authorize('hospital', 'bloodbank', 'admin'), updateInventory);
router.delete('/:id', protect, authorize('hospital', 'bloodbank', 'admin'), deleteInventory);

module.exports = router;

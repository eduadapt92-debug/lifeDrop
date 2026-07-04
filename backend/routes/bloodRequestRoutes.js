const express = require('express');
const router = express.Router();
const {
  createBloodRequest, getBloodRequests, getBloodRequestById,
  updateBloodRequest, deleteBloodRequest, acceptRequest,
  fulfillRequest, matchDonorsForRequest
} = require('../controllers/bloodRequestController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createBloodRequest);
router.get('/', protect, getBloodRequests);
router.get('/:id', protect, getBloodRequestById);
router.put('/:id', protect, updateBloodRequest);
router.delete('/:id', protect, deleteBloodRequest);
router.post('/:id/accept', protect, acceptRequest);
router.post('/:id/fulfill', protect, fulfillRequest);
router.post('/:id/match-donors', protect, matchDonorsForRequest);

module.exports = router;

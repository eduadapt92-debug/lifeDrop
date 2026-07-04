const express = require('express');
const router = express.Router();
const {
  getDonors, getEligibleDonors, getNearbyDonors, getDonorById,
  updateDonorProfile, uploadDocument, getDonorHistory, getDonorProfile
} = require('../controllers/donorController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/', protect, getDonors);
router.get('/eligible', protect, getEligibleDonors);
router.get('/nearby', protect, getNearbyDonors);
router.get('/profile', protect, authorize('donor'), getDonorProfile);
router.get('/history', protect, authorize('donor'), getDonorHistory);
router.put('/profile', protect, authorize('donor'), updateDonorProfile);
router.post('/upload-document', protect, authorize('donor'), upload.single('document'), uploadDocument);
router.get('/:id', protect, getDonorById);

module.exports = router;

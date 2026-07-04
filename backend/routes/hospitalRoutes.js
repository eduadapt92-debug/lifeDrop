const express = require('express');
const router = express.Router();
const {
  getHospitals, getHospitalById, updateHospitalProfile,
  getMatchedDonors, getHospitalProfile, notifyDonor
} = require('../controllers/hospitalController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', protect, getHospitals);
router.get('/profile', protect, authorize('hospital'), getHospitalProfile);
router.get('/matched-donors', protect, authorize('hospital'), getMatchedDonors);
router.put('/profile', protect, authorize('hospital'), updateHospitalProfile);
router.post('/notify-donor', protect, authorize('hospital'), notifyDonor);
router.get('/:id', protect, getHospitalById);

module.exports = router;

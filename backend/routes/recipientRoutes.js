const express = require('express');
const router = express.Router();
const { getRecipientProfile, updateRecipientProfile, requestBlood } = require('../controllers/recipientController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/profile', protect, authorize('recipient'), getRecipientProfile);
router.put('/profile', protect, authorize('recipient'), updateRecipientProfile);
router.post('/request-blood', protect, authorize('recipient'), requestBlood);

module.exports = router;

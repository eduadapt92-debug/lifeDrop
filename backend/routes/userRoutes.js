const express = require('express');
const router = express.Router();
const { getUsers, updateProfile } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', protect, authorize('admin'), getUsers);
router.put('/profile', protect, updateProfile);

module.exports = router;

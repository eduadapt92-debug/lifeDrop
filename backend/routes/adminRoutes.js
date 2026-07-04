const express = require('express');
const router = express.Router();
const {
  getAdminStats, getUsers, updateUserStatus,
  getPendingHospitals, verifyHospital, getAuditLogs
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.get('/hospitals/pending', getPendingHospitals);
router.put('/hospitals/:id/verify', verifyHospital);
router.get('/audit-logs', getAuditLogs);

module.exports = router;

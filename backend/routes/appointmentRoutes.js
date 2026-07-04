const express = require('express');
const router = express.Router();
const { createAppointment, getAppointments, approveAppointment, cancelAppointment, completeAppointment } = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createAppointment);
router.get('/', protect, getAppointments);
router.put('/:id/approve', protect, approveAppointment);
router.put('/:id/cancel', protect, cancelAppointment);
router.put('/:id/complete', protect, completeAppointment);

module.exports = router;

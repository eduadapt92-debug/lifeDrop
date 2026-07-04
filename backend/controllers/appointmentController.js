const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');
const HospitalProfile = require('../models/HospitalProfile');

// @desc   Create appointment
// @route  POST /api/appointments
const createAppointment = async (req, res) => {
  try {
    const { hospital, appointmentDate, timeSlot, request, notes } = req.body;
    const appointment = await Appointment.create({
      donor: req.user._id,
      hospital,
      request,
      appointmentDate,
      timeSlot,
      notes,
    });

    // Notify hospital
    const hospitalProfile = await HospitalProfile.findById(hospital);
    if (hospitalProfile) {
      await Notification.create({
        user: hospitalProfile.user,
        title: '📅 New Appointment Booked',
        message: `A donor has booked an appointment for ${new Date(appointmentDate).toLocaleDateString()}.`,
        type: 'appointment',
      });
      const io = req.app.get('io');
      if (io) io.to(hospitalProfile.user.toString()).emit('appointment_created', { appointmentId: appointment._id });
    }

    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Get appointments
// @route  GET /api/appointments
const getAppointments = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'donor') query.donor = req.user._id;
    else if (req.user.role === 'hospital') {
      const hospital = await HospitalProfile.findOne({ user: req.user._id });
      if (hospital) query.hospital = hospital._id;
    }

    const appointments = await Appointment.find(query)
      .populate('donor', 'name email phone')
      .populate('hospital', 'hospitalName city area')
      .sort('-appointmentDate');
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Approve appointment
const approveAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });

    await Notification.create({
      user: appointment.donor,
      title: '✅ Appointment Approved',
      message: `Your appointment on ${new Date(appointment.appointmentDate).toLocaleDateString()} has been approved.`,
      type: 'appointment',
    });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc   Complete appointment
const completeAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status: 'completed' }, { new: true });
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createAppointment, getAppointments, approveAppointment, cancelAppointment, completeAppointment };

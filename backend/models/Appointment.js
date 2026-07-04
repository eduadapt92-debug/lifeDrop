const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile', required: true },
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest' },
  appointmentDate: { type: Date, required: true },
  timeSlot: String,
  status: { type: String, enum: ['pending', 'approved', 'cancelled', 'completed'], default: 'pending' },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Appointment', appointmentSchema);

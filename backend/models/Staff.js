const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'HospitalProfile', required: true },
  name: { type: String, required: true },
  email: String,
  role: { type: String, enum: ['coordinator', 'nurse', 'doctor', 'admin', 'technician'], default: 'coordinator' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  phone: String,
}, { timestamps: true });

module.exports = mongoose.model('Staff', staffSchema);

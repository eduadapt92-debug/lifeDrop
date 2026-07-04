const mongoose = require('mongoose');

const hospitalProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  hospitalName: { type: String, required: true },
  institutionType: { type: String, enum: ['public', 'private', 'ngo', 'clinic'] },
  city: String,
  area: String,
  address: String,
  registrationNumber: String,
  emergencyContact: String,
  authorizationDocument: String,
  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  bloodBankAttached: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('HospitalProfile', hospitalProfileSchema);
